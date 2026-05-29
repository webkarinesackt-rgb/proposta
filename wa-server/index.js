/**
 * Fysi WA Server — PoC (prova de conceito)
 * ────────────────────────────────────────────────────────────────
 * Conecta ao WhatsApp via Baileys (QR Code) e expõe uma API HTTP
 * mínima para testar: enviar texto e enviar áudio (mensagem de voz).
 *
 * Objetivo: de-riscar a parte mais incerta do CRM antes de construir
 * o resto. Se isto funciona, o caminho da arquitetura está provado.
 *
 *   npm install   &&   npm start
 *   → abra http://localhost:3100 e escaneie o QR.
 */

import makeWASocket, {
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
  fetchLatestBaileysVersion,
  DisconnectReason,
  downloadMediaMessage,
  BufferJSON,
} from '@whiskeysockets/baileys'
import NodeCache from '@cacheable/node-cache'
import P from 'pino'
import qrcodeTerminal from 'qrcode-terminal'
import QRCode from 'qrcode'
import express from 'express'
import multer from 'multer'
import cors from 'cors'
import { rmSync, readdirSync } from 'node:fs'
import { writeFile, readFile, unlink, mkdir } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { tmpdir } from 'node:os'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ffmpegPath from 'ffmpeg-static'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const AUTH_DIR = path.join(__dirname, 'auth')
const LIB_DIR = path.join(__dirname, 'library')
const LIB_AUDIO_DIR = path.join(LIB_DIR, 'audios')
const LIB_FILE = path.join(LIB_DIR, 'library.json')
const DATA_DIR = path.join(__dirname, 'data')
const STORE_FILE = path.join(DATA_DIR, 'store.json')
const PORT = Number(process.env.PORT) || 3100
const AUTH_TOKEN = process.env.WA_AUTH_TOKEN || ''

const logger = P({ level: 'silent' })
const execFileAsync = promisify(execFile)

// Filtra dumps verbosos do libsignal (Baileys console.log direto que
// não respeita pino logger): "Closing session: SessionEntry { ... }".
// Esses dumps poluem completamente os logs e não dão info útil.
const _origLog = console.log
console.log = (...args) => {
  const first = args[0]
  if (typeof first === 'string' && first.startsWith('Closing session')) return
  _origLog.apply(console, args)
}

// ─── Estado da conexão (em memória) ──────────────────────────────
let sock = null
let currentQR = null        // string crua do QR enquanto aguarda scan
let connState = 'starting'  // starting | qr | open | close
let meNumber = null         // número conectado, quando aberto

// ─── Store do inbox (conversas + mensagens) ──────────────────────
const store = {
  chats: new Map(),    // jid → { id, name, lastText, lastTime, fromMeLast, unread }
  messages: new Map(), // jid → [ { id, fromMe, text, type, time, pushName } ]
  contacts: new Map(), // jid → nome
}
let storeDirty = false

// ─── Presence (online/digitando) ─────────────────────────────────
// Baileys só manda updates pros JIDs que você assinou via presenceSubscribe.
// Guardamos o último estado e timestamp por JID; é volátil (em memória).
const presenceStore = new Map() // jid → { state, ts }
const subscribedJids = new Set()

// Quando a extensão Chrome empurra dados, marca o timestamp pra UI
// poder mostrar "extensão ativa há X segundos".
let lastIngestAt = 0
function markIngest() { lastIngestAt = Math.floor(Date.now() / 1000) }

// ─── SSE: push de eventos pro cliente ────────────────────────────
// Em vez do cliente fazer poll, ele abre uma conexão long-lived em
// /events e a gente despeja eventos conforme acontecem.
const sseClients = new Set() // Set<res>

function sseSend(event, data) {
  if (sseClients.size === 0) return
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
  for (const res of sseClients) {
    try { res.write(payload) } catch {}
  }
}

// ─── Conexão WhatsApp ────────────────────────────────────────────
async function startSock() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR)
  const { version } = await fetchLatestBaileysVersion()

  sock = makeWASocket({
    version,
    logger,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    msgRetryCounterCache: new NodeCache(),
    markOnlineOnConnect: false,
    syncFullHistory: true, // puxa o histórico de conversas no pareamento
    browser: ['Fysi CRM', 'Desktop', '1.0.0'],
  })

  // persiste credenciais a cada mudança (sobrevive a reinícios)
  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update

    if (qr) {
      currentQR = qr
      connState = 'qr'
      console.log('\n📱  Escaneie o QR no WhatsApp → Aparelhos conectados:\n')
      qrcodeTerminal.generate(qr, { small: true })
      console.log(`\n   ...ou abra http://localhost:${PORT} no navegador.\n`)
    }

    if (connection === 'open') {
      currentQR = null
      connState = 'open'
      meNumber = sock?.user?.id?.split(':')[0] ?? null
      console.log(`✅  Conectado ao WhatsApp como ${meNumber}`)
      sseSend('status', { state: 'open', me: meNumber })
      // reset subscribedJids — após reconexão, presence sub é perdida
      subscribedJids.clear()
    }

    if (connection === 'close') {
      connState = 'close'
      const statusCode = lastDisconnect?.error?.output?.statusCode
      const loggedOut = statusCode === DisconnectReason.loggedOut
      console.log(`❌  Conexão fechada (code=${statusCode}). loggedOut=${loggedOut}`)
      sseSend('status', { state: 'close', me: null })

      if (loggedOut) {
        // sessão revogada — apaga conteúdo de AUTH_DIR pra gerar novo QR.
        // NÃO remove o próprio diretório (é um volume mount no Docker → EBUSY).
        try {
          for (const f of readdirSync(AUTH_DIR)) {
            try {
              rmSync(path.join(AUTH_DIR, f), { recursive: true, force: true })
            } catch {}
          }
        } catch {}
      }
      // reconecta automaticamente (gera novo QR se necessário)
      setTimeout(startSock, 2000)
    }
  })

  // ── eventos do inbox: alimentam o store de conversas e mensagens ──

  sock.ev.on('messaging-history.set', ({ chats, contacts, messages }) => {
    try {
      for (const c of chats || []) ingestChat(c)
      for (const ct of contacts || []) ingestContact(ct)
      for (const m of messages || []) recordMessage(m)
      storeDirty = true
      console.log(`📥  Histórico sincronizado: ${store.chats.size} conversas`)
    } catch (e) {
      console.error('[history.set]', e.message)
    }
  })

  sock.ev.on('chats.upsert', (chats) => {
    for (const c of chats || []) ingestChat(c)
    storeDirty = true
  })

  sock.ev.on('chats.update', (updates) => {
    for (const c of updates || []) ingestChat(c)
    storeDirty = true
  })

  sock.ev.on('contacts.upsert', (contacts) => {
    for (const ct of contacts || []) ingestContact(ct)
    storeDirty = true
  })

  sock.ev.on('contacts.update', (contacts) => {
    for (const ct of contacts || []) ingestContact(ct)
    storeDirty = true
  })

  sock.ev.on('messages.upsert', ({ messages }) => {
    const touched = new Set()
    for (const m of messages || []) {
      recordMessage(m)
      const jid = m?.key?.remoteJid
      if (isRealChat(jid)) touched.add(jid)
    }
    if (touched.size > 0) {
      sseSend('changed', { kind: 'messages', chats: [...touched] })
    }
  })

  // emite eventos quando chats são atualizados
  sock.ev.on('chats.upsert', () => {
    sseSend('changed', { kind: 'chats' })
  })
  sock.ev.on('chats.update', () => {
    sseSend('changed', { kind: 'chats' })
  })

  // presence updates: id é o JID do chat; presences é um objeto keyed
  // por participante (em 1-1, igual ao id; em grupos, por participante).
  sock.ev.on('presence.update', ({ id, presences }) => {
    if (!presences || typeof presences !== 'object') return
    const p = presences[id] || Object.values(presences)[0]
    if (!p) return
    const state = p.lastKnownPresence || 'unavailable'
    // só atualiza ts se o estado MUDOU (evita 'visto agora' eterno)
    const prev = presenceStore.get(id)
    if (!prev || prev.state !== state) {
      presenceStore.set(id, { state, ts: Date.now() / 1000 })
      sseSend('presence', { chatId: id, state, ts: Date.now() / 1000 })
    }
  })
}

// ─── Helpers ─────────────────────────────────────────────────────

/**
 * Normaliza o número e resolve o JID REAL no WhatsApp via onWhatsApp().
 * Conserta o problema clássico de "enviou mas não chegou":
 *  - números brasileiros têm (ou não) o 9 extra depois do DDD;
 *  - o onWhatsApp() consulta o servidor, devolve o JID canônico
 *    e confirma se o número realmente existe no WhatsApp.
 */
async function resolveJid(number) {
  let digits = String(number).replace(/\D/g, '')
  // sem DDI: número brasileiro com DDD (10–11 dígitos) → prefixa 55
  if (digits.length >= 10 && digits.length <= 11) digits = '55' + digits
  const results = await sock.onWhatsApp(digits)
  const hit = results?.[0]
  if (!hit?.exists) return { exists: false, tried: digits }
  return { exists: true, jid: hit.jid }
}

// ─── Biblioteca de envio (mensagens + áudios salvos) ─────────────

/** Lê a biblioteca local (mensagens e áudios salvos). */
async function readLibrary() {
  try {
    return JSON.parse(await readFile(LIB_FILE, 'utf8'))
  } catch {
    return { snippets: [], audios: [] }
  }
}

/** Grava a biblioteca local. */
async function writeLibrary(lib) {
  await mkdir(LIB_DIR, { recursive: true })
  await writeFile(LIB_FILE, JSON.stringify(lib, null, 2))
}

// ─── Store do inbox: helpers ─────────────────────────────────────

/** Converte timestamp do Baileys (number ou Long) em número. */
function tsToNum(t) {
  if (!t) return 0
  if (typeof t === 'number') return t
  if (typeof t.toNumber === 'function') return t.toNumber()
  return Number(t) || 0
}

/** Só conversas reais (contato ou grupo) — ignora status/broadcast.
 *  Aceita @lid (linked ID, novo formato multi-device do WhatsApp 2024+). */
function isRealChat(jid) {
  return (
    typeof jid === 'string' &&
    (jid.endsWith('@s.whatsapp.net') ||
      jid.endsWith('@g.us') ||
      jid.endsWith('@lid'))
  )
}

function numberFromJid(jid) {
  return String(jid || '').split('@')[0]
}

/** Desembrulha mensagens encapsuladas (efêmeras, ver-uma-vez, etc.). */
function unwrapMessage(message) {
  return (
    message?.ephemeralMessage?.message ||
    message?.viewOnceMessage?.message ||
    message?.viewOnceMessageV2?.message ||
    message?.documentWithCaptionMessage?.message ||
    message ||
    {}
  )
}

/** Extrai um texto-resumo e o tipo de uma mensagem do WhatsApp. */
function msgContent(message) {
  if (!message) return { text: '', type: 'outro' }
  message = unwrapMessage(message)
  if (message.conversation) return { text: message.conversation, type: 'texto' }
  if (message.extendedTextMessage?.text)
    return { text: message.extendedTextMessage.text, type: 'texto' }
  if (message.imageMessage)
    return { text: message.imageMessage.caption || '🖼️ Imagem', type: 'imagem' }
  if (message.videoMessage)
    return { text: message.videoMessage.caption || '🎬 Vídeo', type: 'video' }
  if (message.audioMessage)
    return {
      text: message.audioMessage.ptt ? '🎙️ Mensagem de voz' : '🎵 Áudio',
      type: 'audio',
    }
  if (message.documentMessage)
    return {
      text: '📎 ' + (message.documentMessage.fileName || 'Documento'),
      type: 'documento',
    }
  if (message.stickerMessage) return { text: '🌟 Figurinha', type: 'figurinha' }
  if (message.locationMessage) return { text: '📍 Localização', type: 'local' }
  if (message.contactMessage || message.contactsArrayMessage)
    return { text: '👤 Contato', type: 'contato' }
  return { text: '[mensagem]', type: 'outro' }
}

/** Detecta nome "mascarado" como "+55∙∙∙∙∙∙04" que WhatsApp manda
 *  para contatos privados/business. Usuário não consegue identificar. */
function isMaskedName(name) {
  if (!name) return false
  return /[∙·.]{3,}/.test(name)
}

/** Formata número em padrão brasileiro: +55 11 91234-5678 */
function prettyNumber(jid) {
  const n = numberFromJid(jid)
  if (!/^\d+$/.test(n)) return null
  if (n.startsWith('55') && (n.length === 12 || n.length === 13)) {
    const ddd = n.slice(2, 4)
    const rest = n.slice(4)
    const mid = rest.length === 9 ? rest.slice(0, 5) : rest.slice(0, 4)
    const end = rest.slice(mid.length)
    return `+55 ${ddd} ${mid}-${end}`
  }
  return null
}

/** Nome de exibição de uma conversa.
 *  Precedência: alias custom → nome do WhatsApp (se não-mascarado)
 *               → pushName de contato → número formatado → JID cru. */
function chatDisplayName(jid) {
  const c = store.chats.get(jid)
  if (c?.alias) return c.alias
  if (c?.name && !isMaskedName(c.name)) return c.name
  const ct = store.contacts.get(jid)
  if (ct && !isMaskedName(ct)) return ct
  // tenta número brasileiro formatado pra contatos 1-1
  if (jid.endsWith('@s.whatsapp.net')) {
    const fmt = prettyNumber(jid)
    if (fmt) return fmt
  }
  // @lid sem nome: mostra "Sem nome · XXXX" (últimos 4 dígitos)
  // em vez do ID inteiro de 15+ dígitos que não diz nada
  if (jid.endsWith('@lid')) {
    const tail = numberFromJid(jid).slice(-4)
    return `Sem nome · ${tail}`
  }
  // se o nome existia mas era mascarado, usa ele de fallback (melhor que o JID)
  if (c?.name) return c.name
  if (ct) return ct
  return numberFromJid(jid)
}

// cache de URLs de foto de perfil — { url|null, fetchedAt }
const photoUrlCache = new Map()

/** Devolve a URL da foto de perfil de um jid (cached) ou null. */
async function getPhotoUrl(jid) {
  const cached = photoUrlCache.get(jid)
  if (cached) {
    const age = Date.now() - cached.fetchedAt
    // sucesso: cache 1h. falha: cache só 2 min (deixa retry rápido)
    if (cached.url && age < 60 * 60 * 1000) return cached.url
    if (!cached.url && age < 2 * 60 * 1000) return null
  }
  try {
    const url = await sock.profilePictureUrl(jid, 'image')
    photoUrlCache.set(jid, { url, fetchedAt: Date.now() })
    return url
  } catch {
    photoUrlCache.set(jid, { url: null, fetchedAt: Date.now() })
    return null
  }
}

/** Registra/atualiza uma conversa vinda do Baileys. */
function ingestChat(c) {
  if (!c || !isRealChat(c.id)) return
  const ex = store.chats.get(c.id) || { id: c.id, unread: 0, status: 'LEAD' }
  const name = c.name || c.subject || c.verifiedName
  if (name) ex.name = name
  if (c.unreadCount != null) ex.unread = c.unreadCount
  // Estado de arquivamento do WhatsApp (nome do campo varia entre versões)
  const arch = c.archived ?? c.archive
  if (arch != null) ex.archived = !!arch
  store.chats.set(c.id, ex)
}

/** Registra/atualiza um contato (para nomear conversas). */
function ingestContact(ct) {
  if (!ct?.id) return
  const name = ct.name || ct.verifiedName || ct.notify
  if (name) store.contacts.set(ct.id, name)
}

/** Registra uma mensagem no store e atualiza a conversa. */
function recordMessage(m) {
  try {
    const jid = m?.key?.remoteJid
    if (!isRealChat(jid)) return
    const { text, type } = msgContent(m.message)
    const time = tsToNum(m.messageTimestamp)
    const isGroup = jid.endsWith('@g.us')
    const rec = {
      id: m.key.id,
      fromMe: !!m.key.fromMe,
      text,
      type,
      time,
      pushName: m.pushName || '',
      // em grupo, qual participante mandou (pra prefixar a prévia)
      participant: isGroup ? (m.key.participant || '') : '',
    }
    // guarda o conteúdo bruto de mídias para download sob demanda
    if (['audio', 'imagem', 'video', 'documento'].includes(type)) {
      rec.raw = unwrapMessage(m.message)
    }
    let arr = store.messages.get(jid)
    if (!arr) { arr = []; store.messages.set(jid, arr) }
    const i = rec.id ? arr.findIndex((x) => x.id === rec.id) : -1
    if (i >= 0) arr[i] = rec
    else arr.push(rec)
    arr.sort((a, b) => a.time - b.time)
    if (arr.length > 200) arr.splice(0, arr.length - 200)

    const chat = store.chats.get(jid) || { id: jid, unread: 0, status: 'LEAD' }
    chat.id = jid
    if (time >= (chat.lastTime || 0)) {
      // prévia: em grupo, prefixa com o nome (primeiro nome) do remetente
      // em chat 1-1 ou mensagem minha, só o texto
      let preview = text
      if (isGroup && !rec.fromMe) {
        const sender =
          rec.pushName ||
          (rec.participant ? store.contacts.get(rec.participant) : '') ||
          ''
        if (sender) {
          const short = sender.split(/\s+/)[0]
          preview = `${short}: ${text}`
        }
      }
      chat.lastText = preview
      chat.lastTime = time
      chat.fromMeLast = rec.fromMe
    }
    // usa o pushName como nome de contatos individuais ainda sem nome
    if (
      !jid.endsWith('@g.us') &&
      !rec.fromMe &&
      rec.pushName &&
      !store.contacts.get(jid)
    ) {
      store.contacts.set(jid, rec.pushName)
    }
    store.chats.set(jid, chat)
    storeDirty = true
  } catch (e) {
    console.error('[recordMessage]', e.message)
  }
}

/** Grava o store em disco (apenas se houve mudança). */
async function saveStore() {
  if (!storeDirty) return
  storeDirty = false
  try {
    await mkdir(DATA_DIR, { recursive: true })
    await writeFile(
      STORE_FILE,
      JSON.stringify(
        {
          chats: [...store.chats.entries()],
          messages: [...store.messages.entries()],
          contacts: [...store.contacts.entries()],
        },
        BufferJSON.replacer
      )
    )
  } catch (e) {
    console.error('[saveStore]', e.message)
  }
}

/** Carrega o store do disco no boot. */
async function loadStore() {
  try {
    const data = JSON.parse(await readFile(STORE_FILE, 'utf8'), BufferJSON.reviver)
    store.chats = new Map(data.chats || [])
    store.messages = new Map(data.messages || [])
    store.contacts = new Map(data.contacts || [])
    console.log(`📂  Store carregado: ${store.chats.size} conversas`)
  } catch {
    /* primeiro boot — store vazio */
  }
}

// ─── Métricas do dashboard ───────────────────────────────────────

/** Timestamp (em segundos) de início do período. */
function periodStart(period) {
  if (period === 'today') {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d.getTime() / 1000
  }
  if (period === 'week') return (Date.now() - 7 * 24 * 3600 * 1000) / 1000
  if (period === 'month') return (Date.now() - 30 * 24 * 3600 * 1000) / 1000
  return 0 // tudo
}

/** Calcula as métricas do dashboard para um período. */
function computeMetrics(period) {
  const since = periodStart(period)
  const now = Date.now() / 1000
  let received = 0
  let sent = 0
  const activeChats = new Set()
  const responseGaps = []

  for (const [jid, msgs] of store.messages) {
    let pendingReceived = null
    for (const m of msgs) {
      if (m.time >= since) {
        if (m.fromMe) sent++
        else received++
        activeChats.add(jid)
      }
      // tempo de resposta: do 1º recebido sem resposta até o nosso envio
      if (!m.fromMe) {
        if (pendingReceived === null) pendingReceived = m.time
      } else if (pendingReceived !== null) {
        if (pendingReceived >= since) {
          const gap = m.time - pendingReceived
          if (gap >= 0 && gap < 48 * 3600) responseGaps.push(gap)
        }
        pendingReceived = null
      }
    }
  }

  let unanswered = 0
  let longestWait = 0
  let totalChats = 0
  for (const c of store.chats.values()) {
    if (!c.lastTime) continue
    totalChats++
    if (c.id.endsWith('@g.us')) continue
    // só conta como "esperando resposta" se a última mensagem
    // recebida está DENTRO do período selecionado — antes contava
    // 571 da semana porque pegava TODO o histórico independente
    // do filtro de Hoje/Semana/Mês.
    if (!c.fromMeLast && !c.ignored && c.lastTime >= since) {
      unanswered++
      longestWait = Math.max(longestWait, now - c.lastTime)
    }
  }

  const avgResponseMin = responseGaps.length
    ? Math.round(responseGaps.reduce((a, b) => a + b, 0) / responseGaps.length / 60)
    : 0

  return {
    period,
    totalChats,
    unanswered,
    received,
    sent,
    activeChats: activeChats.size,
    avgResponseMin,
    longestWaitH: Math.round(longestWait / 3600),
  }
}

/** Garante que há conexão aberta antes de tentar enviar. */
function ensureConnected(res) {
  if (connState !== 'open' || !sock) {
    res.status(409).json({
      ok: false,
      error: 'WhatsApp não conectado. Escaneie o QR primeiro.',
    })
    return false
  }
  return true
}

/**
 * Converte qualquer áudio (mp3, m4a, wav, ogg…) para OGG/Opus mono —
 * o formato nativo de mensagem de voz do WhatsApp. É isso que faz o
 * áudio pré-gravado chegar como voz, e não como arquivo anexado.
 * Retorna { buffer, seconds }.
 */
async function toWhatsAppVoice(inputBuffer) {
  const base = path.join(tmpdir(), `fysi-wa-${randomUUID()}`)
  const inPath = `${base}.in`
  const outPath = `${base}.ogg`
  await writeFile(inPath, inputBuffer)
  try {
    const { stderr } = await execFileAsync(ffmpegPath, [
      '-y',
      '-i', inPath,
      '-c:a', 'libopus',
      '-ac', '1', // mono
      '-ar', '48000',
      '-b:a', '64k',
      '-application', 'voip',
      '-f', 'ogg',
      outPath,
    ])
    // a duração aparece no stderr do ffmpeg: "Duration: 00:00:07.42"
    let seconds = 0
    const m = stderr.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/)
    if (m) seconds = +m[1] * 3600 + +m[2] * 60 + Math.round(parseFloat(m[3]))
    const buffer = await readFile(outPath)
    return { buffer, seconds }
  } finally {
    unlink(inPath).catch(() => {})
    unlink(outPath).catch(() => {})
  }
}

// ─── API HTTP ────────────────────────────────────────────────────
const app = express()
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 16 * 1024 * 1024 },
})

app.use(cors())
// limite grande pra aguentar push de 1000+ conversas da extensão (~500KB)
app.use(express.json({ limit: '10mb' }))
app.use(express.static(path.join(__dirname, 'public')))

// ─── auth: token compartilhado (Bearer ou ?t=) ───────────────────
// Em prod (VPS exposto à internet) WA_AUTH_TOKEN é obrigatório. Sem ele
// definido, segue aberto (modo dev local). Aplicado depois do static pra
// a UI de QR seguir abrindo no navegador; o JS dela injeta o token.
if (AUTH_TOKEN) {
  app.use((req, res, next) => {
    const header = req.headers.authorization || ''
    const m = header.match(/^Bearer\s+(.+)$/)
    const token = m ? m[1] : req.query.t
    if (token === AUTH_TOKEN) return next()
    res.status(401).json({ ok: false, error: 'Unauthorized' })
  })
  console.log('🔒  WA_AUTH_TOKEN ativo — endpoints protegidos por bearer/?t=')
} else if (process.env.NODE_ENV === 'production') {
  // fail-CLOSED em prod: se esquecer o env var, o servidor recusa
  // qualquer chamada em vez de expor tudo à internet.
  console.error('❌  WA_AUTH_TOKEN obrigatório em produção. Recusando todas as chamadas.')
  app.use((_req, res) => {
    res.status(503).json({ ok: false, error: 'WA_AUTH_TOKEN não configurado' })
  })
} else {
  console.log('⚠️   WA_AUTH_TOKEN não definido — endpoints abertos (uso local)')
}

// status da conexão (+ idade do último ingest da extensão se houver)
app.get('/status', (_req, res) => {
  res.json({
    state: connState,
    me: meNumber,
    ingest: lastIngestAt
      ? { lastAt: lastIngestAt, ageS: Math.floor(Date.now() / 1000) - lastIngestAt }
      : null,
  })
})

// SSE: stream de eventos em tempo real.
// Eventos: 'changed' { kind: 'messages'|'chats', chats?: [jid] }
//          'presence' { chatId, state, ts }
//          'status' { state, me }
app.get('/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    // anti-buffer pra proxies (Traefik, nginx)
    'X-Accel-Buffering': 'no',
  })
  res.write(`event: hello\ndata: {"state":"${connState}","me":${JSON.stringify(meNumber)}}\n\n`)
  sseClients.add(res)
  // keepalive a cada 25s pro proxy não derrubar a conexão por idle
  const ping = setInterval(() => {
    try { res.write(': ping\n\n') } catch {}
  }, 25_000)
  req.on('close', () => {
    clearInterval(ping)
    sseClients.delete(res)
  })
})

// diagnóstico: confere um número e mostra o JID resolvido no WhatsApp
app.get('/check', async (req, res) => {
  if (!ensureConnected(res)) return
  const number = req.query.number
  if (!number) return res.status(400).json({ ok: false, error: 'Informe ?number=' })
  try {
    const r = await resolveJid(number)
    res.json({ ok: true, ...r })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

// QR atual, como imagem (data URL) para exibir no navegador
app.get('/qr', async (_req, res) => {
  if (!currentQR) return res.json({ qr: null, state: connState })
  const dataUrl = await QRCode.toDataURL(currentQR, { margin: 1, width: 320 })
  res.json({ qr: dataUrl, state: connState })
})

// enviar mensagem de texto
app.post('/send-text', async (req, res) => {
  if (!ensureConnected(res)) return
  const { to, text } = req.body || {}
  if (!to || !text) {
    return res.status(400).json({ ok: false, error: 'Informe "to" e "text".' })
  }
  try {
    const r = await resolveJid(to)
    if (!r.exists) {
      return res.status(400).json({
        ok: false,
        error: `O número ${r.tried} não tem WhatsApp. Confira o DDI (55) e o DDD.`,
      })
    }
    await sock.sendMessage(r.jid, { text: String(text) })
    console.log(`✉️  Texto enviado para ${r.jid}`)
    res.json({ ok: true, jid: r.jid })
  } catch (err) {
    console.error('[send-text]', err)
    res.status(500).json({ ok: false, error: err.message })
  }
})

// enviar áudio como mensagem de voz nativa (PTT)
// converte qualquer formato para Opus → chega como voz, não como arquivo
app.post('/send-audio', upload.single('audio'), async (req, res) => {
  if (!ensureConnected(res)) return
  const { to } = req.body || {}
  if (!to) return res.status(400).json({ ok: false, error: 'Informe "to".' })
  if (!req.file) {
    return res.status(400).json({ ok: false, error: 'Envie um arquivo no campo "audio".' })
  }
  try {
    const r = await resolveJid(to)
    if (!r.exists) {
      return res.status(400).json({
        ok: false,
        error: `O número ${r.tried} não tem WhatsApp. Confira o DDI (55) e o DDD.`,
      })
    }
    const { buffer, seconds } = await toWhatsAppVoice(req.file.buffer)
    await sock.sendMessage(r.jid, {
      audio: buffer,
      mimetype: 'audio/ogg; codecs=opus',
      ptt: true, // true = mensagem de voz; false = arquivo de áudio
      seconds, // duração correta na bolinha de voz
    })
    console.log(`🎙️  Áudio enviado para ${r.jid} (${seconds}s)`)
    res.json({ ok: true, jid: r.jid, seconds })
  } catch (err) {
    console.error('[send-audio]', err)
    res.status(500).json({ ok: false, error: 'Falha ao converter/enviar o áudio: ' + err.message })
  }
})

// encerrar a sessão (o reconnect automático gera um novo QR)
app.post('/logout', async (_req, res) => {
  try {
    if (sock) await sock.logout()
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

// ─── Biblioteca: mensagens e áudios salvos ───────────────────────

// lista a biblioteca inteira
app.get('/library', async (_req, res) => {
  res.json(await readLibrary())
})

// salvar nova mensagem
app.post('/library/snippet', async (req, res) => {
  const { name, content, category } = req.body || {}
  if (!name || !content) {
    return res.status(400).json({ ok: false, error: 'Informe nome e conteúdo.' })
  }
  const lib = await readLibrary()
  const snippet = {
    id: randomUUID(),
    name: String(name),
    category: String(category || ''),
    content: String(content),
  }
  lib.snippets.push(snippet)
  await writeLibrary(lib)
  res.json({ ok: true, snippet })
})

// apagar mensagem
app.delete('/library/snippet/:id', async (req, res) => {
  const lib = await readLibrary()
  lib.snippets = lib.snippets.filter((s) => s.id !== req.params.id)
  await writeLibrary(lib)
  res.json({ ok: true })
})

// salvar novo áudio (converte p/ Opus e guarda no disco)
app.post('/library/audio', upload.single('audio'), async (req, res) => {
  const { name, category } = req.body || {}
  if (!name) return res.status(400).json({ ok: false, error: 'Informe um nome.' })
  if (!req.file) return res.status(400).json({ ok: false, error: 'Envie um arquivo de áudio.' })
  try {
    const { buffer, seconds } = await toWhatsAppVoice(req.file.buffer)
    const id = randomUUID()
    const file = `${id}.ogg`
    await mkdir(LIB_AUDIO_DIR, { recursive: true })
    await writeFile(path.join(LIB_AUDIO_DIR, file), buffer)
    const lib = await readLibrary()
    const audio = {
      id,
      name: String(name),
      category: String(category || ''),
      file,
      seconds,
    }
    lib.audios.push(audio)
    await writeLibrary(lib)
    res.json({ ok: true, audio })
  } catch (err) {
    console.error('[library/audio]', err)
    res.status(500).json({ ok: false, error: 'Falha ao salvar o áudio: ' + err.message })
  }
})

// apagar áudio
app.delete('/library/audio/:id', async (req, res) => {
  const lib = await readLibrary()
  const audio = lib.audios.find((a) => a.id === req.params.id)
  if (audio) {
    await unlink(path.join(LIB_AUDIO_DIR, audio.file)).catch(() => {})
    lib.audios = lib.audios.filter((a) => a.id !== req.params.id)
    await writeLibrary(lib)
  }
  res.json({ ok: true })
})

// enviar um áudio salvo para um contato
app.post('/library/audio/:id/send', async (req, res) => {
  if (!ensureConnected(res)) return
  const { to } = req.body || {}
  if (!to) return res.status(400).json({ ok: false, error: 'Informe "to".' })
  const lib = await readLibrary()
  const audio = lib.audios.find((a) => a.id === req.params.id)
  if (!audio) return res.status(404).json({ ok: false, error: 'Áudio não encontrado.' })
  try {
    const r = await resolveJid(to)
    if (!r.exists) {
      return res.status(400).json({
        ok: false,
        error: `O número ${r.tried} não tem WhatsApp.`,
      })
    }
    const buffer = await readFile(path.join(LIB_AUDIO_DIR, audio.file))
    await sock.sendMessage(r.jid, {
      audio: buffer,
      mimetype: 'audio/ogg; codecs=opus',
      ptt: true,
      seconds: audio.seconds,
    })
    console.log(`🎙️  Áudio salvo "${audio.name}" enviado para ${r.jid}`)
    res.json({ ok: true, jid: r.jid })
  } catch (err) {
    console.error('[library/audio/send]', err)
    res.status(500).json({ ok: false, error: err.message })
  }
})

// ─── Inbox: conversas e mensagens ────────────────────────────────

// busca uma string nas mensagens já em cache (case-insensitive),
// devolve os chats que tiveram match + 1 trecho/contagem por chat.
app.get('/search', (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase()
  if (q.length < 2) return res.json({ q, results: [] })
  const byChat = new Map() // jid → { count, snippet, time, fromMe } da MAIS NOVA
  for (const [jid, msgs] of store.messages) {
    if (!isRealChat(jid)) continue
    // mensagens vêm em ordem cronológica (antigas → novas).
    // iteramos NORMAL contando todos os matches, mas o snippet sobrescreve
    // a cada match, então no fim fica o trecho da mensagem MAIS RECENTE.
    for (const m of msgs) {
      const text = (m.text || '').toLowerCase()
      if (!text.includes(q)) continue
      const ex = byChat.get(jid) || { count: 0 }
      ex.count++
      const i = text.indexOf(q)
      const start = Math.max(0, i - 25)
      const end = Math.min(m.text.length, i + q.length + 35)
      ex.snippet = (start > 0 ? '…' : '') + m.text.slice(start, end) + (end < m.text.length ? '…' : '')
      ex.time = m.time
      ex.fromMe = !!m.fromMe
      byChat.set(jid, ex)
    }
  }
  const results = [...byChat.entries()].map(([jid, info]) => ({
    chatId: jid,
    name: chatDisplayName(jid),
    count: info.count,
    snippet: info.snippet,
    time: info.time,
    fromMe: info.fromMe,
  })).sort((a, b) => b.time - a.time).slice(0, 40)
  res.json({ q, results })
})

// ─── Ingestão da extensão Chrome (WhatsApp Web bridge) ──────────────────
// A extensão lê o WhatsApp Web direto pelo wppconnect (que vive na
// página do WhatsApp) e empurra os dados aqui. Mais confiável que
// nossa conexão Baileys quando essa última está com sessões queimadas.
//
// Campos que SOMENTE o CRM controla (alias, tags, value, status, etc.)
// são preservados — só atualizamos os campos vindos do WhatsApp.

const CRM_ONLY_FIELDS = ['alias', 'tags', 'value', 'source', 'email', 'notes', 'linkedProposalId', 'status', 'archived', 'ignored']

function mergeChatFromExtension(incoming) {
  if (!incoming?.id || !isRealChat(incoming.id)) return
  const ex = store.chats.get(incoming.id) || { id: incoming.id, unread: 0, status: 'LEAD' }
  // só sobrescreve com valores NÃO-VAZIOS (nome '' não sobrescreve nome já salvo)
  if (incoming.name && incoming.name.trim()) ex.name = incoming.name
  if (incoming.lastText && incoming.lastText.trim()) ex.lastText = incoming.lastText
  if (typeof incoming.lastTime === 'number' && incoming.lastTime > 0) ex.lastTime = incoming.lastTime
  if (typeof incoming.fromMeLast === 'boolean') ex.fromMeLast = incoming.fromMeLast
  if (typeof incoming.unread === 'number') ex.unread = incoming.unread
  ex.id = incoming.id
  store.chats.set(incoming.id, ex)
  storeDirty = true
}

// Push em massa: extensão manda lista completa a cada N segundos.
app.post('/ingest/chats', (req, res) => {
  const list = Array.isArray(req.body?.chats) ? req.body.chats : []
  let n = 0
  for (const c of list) {
    mergeChatFromExtension(c)
    n++
  }
  markIngest()
  if (n > 0) sseSend('changed', { kind: 'chats' })
  console.log(`🔌  ingest/chats: ${n} conversas`)
  res.json({ ok: true, count: n })
})

// Push incremental de um chat (chats.update).
app.post('/ingest/chat', (req, res) => {
  mergeChatFromExtension(req.body?.chat || {})
  markIngest()
  sseSend('changed', { kind: 'chats' })
  res.json({ ok: true })
})

// Push de mensagem nova individual.
app.post('/ingest/message', (req, res) => {
  const m = req.body?.message
  if (!m?.chatId || !isRealChat(m.chatId)) {
    return res.status(400).json({ ok: false, error: 'mensagem inválida' })
  }
  // mesmo formato do recordMessage interno
  const jid = m.chatId
  const rec = {
    id: m.id,
    fromMe: !!m.fromMe,
    text: m.text || '',
    type: m.type || 'texto',
    time: Number(m.time) || Math.floor(Date.now() / 1000),
    pushName: m.pushName || '',
    participant: '',
  }
  let arr = store.messages.get(jid)
  if (!arr) { arr = []; store.messages.set(jid, arr) }
  const i = rec.id ? arr.findIndex((x) => x.id === rec.id) : -1
  if (i >= 0) arr[i] = rec
  else arr.push(rec)
  arr.sort((a, b) => a.time - b.time)
  if (arr.length > 200) arr.splice(0, arr.length - 200)

  // atualiza chat também (lastText/lastTime/fromMeLast)
  const chat = store.chats.get(jid) || { id: jid, unread: 0, status: 'LEAD' }
  if (rec.time >= (chat.lastTime || 0)) {
    chat.lastText = rec.text
    chat.lastTime = rec.time
    chat.fromMeLast = rec.fromMe
  }
  store.chats.set(jid, chat)
  storeDirty = true
  markIngest()
  sseSend('changed', { kind: 'messages', chats: [jid] })
  res.json({ ok: true })
})

// Adiciona uma conversa ao inbox manualmente — útil pra contatos
// que não vieram no sync inicial do Baileys (sync gap conhecido).
// Valida que o número tem WhatsApp via onWhatsApp() antes.
app.post('/chats/add', async (req, res) => {
  if (!ensureConnected(res)) return
  const { number, name } = req.body || {}
  if (!number) return res.status(400).json({ ok: false, error: 'Informe "number".' })
  try {
    const r = await resolveJid(number)
    if (!r.exists) {
      return res.status(404).json({
        ok: false,
        error: `O número ${r.tried} não tem WhatsApp. Confira DDI (55) e DDD.`,
      })
    }
    if (!store.chats.has(r.jid)) {
      store.chats.set(r.jid, {
        id: r.jid,
        name: name || '',
        unread: 0,
        status: 'LEAD',
        lastText: '(adicionado manualmente — envie uma mensagem)',
        lastTime: Date.now() / 1000,
        fromMeLast: false,
      })
      storeDirty = true
      sseSend('changed', { kind: 'chats' })
    } else if (name) {
      // já existia — opcionalmente atualiza o nome
      const ex = store.chats.get(r.jid)
      ex.name = name
      store.chats.set(r.jid, ex)
      storeDirty = true
      sseSend('changed', { kind: 'chats' })
    }
    res.json({ ok: true, jid: r.jid })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

// Tenta buscar o nome (subject) de grupos que estão sem nome no store,
// chamando sock.groupMetadata. Roda em background, atualiza o store.
const groupFetchAttempted = new Set()
async function backfillGroupNames() {
  if (!sock || connState !== 'open') return
  let fetched = 0
  for (const [jid, c] of store.chats) {
    if (!jid.endsWith('@g.us')) continue
    if (c.name && c.name.trim()) continue
    if (groupFetchAttempted.has(jid)) continue
    groupFetchAttempted.add(jid)
    try {
      const meta = await sock.groupMetadata(jid)
      if (meta?.subject) {
        c.name = meta.subject
        store.chats.set(jid, c)
        storeDirty = true
        fetched++
      }
    } catch {
      // grupo pode ter sido apagado / ela não é mais membro
    }
    // limita pra não inundar o WhatsApp
    if (fetched >= 5) break
  }
  if (fetched > 0) {
    console.log(`👥  Nomes de ${fetched} grupos preenchidos`)
    sseSend('changed', { kind: 'chats' })
  }
}
// roda a cada 30s — preenche aos poucos sem martelar o WhatsApp
setInterval(() => { backfillGroupNames().catch(() => {}) }, 30_000)

// lista de conversas (mais recentes primeiro).
// Inclui conversas SEM lastTime (vieram do sync mas sem mensagens
// carregadas no histórico) — ficam no final, marcadas como "(sem
// histórico)". Sem isso, conversas antigas/inativas somem da lista.
app.get('/chats', (_req, res) => {
  const chats = [...store.chats.values()]
    .map((c) => ({
      id: c.id,
      name: chatDisplayName(c.id),
      isGroup: c.id.endsWith('@g.us'),
      lastText: c.lastText || (c.lastTime ? '' : '(abra para puxar mensagens)'),
      lastTime: c.lastTime || 0,
      fromMeLast: !!c.fromMeLast,
      unread: c.unread || 0,
      status: c.status || 'LEAD',
      archived: !!c.archived,
      ignored: !!c.ignored,
      tags: c.tags || [],
      value: c.value || 0,
      source: c.source || '',
      email: c.email || '',
      notes: c.notes || '',
      linkedProposalId: c.linkedProposalId || '',
    }))
    // exclui só conversas que ainda nem nome têm (lixo do sync)
    .filter((c) => c.lastTime || c.name)
    .sort((a, b) => b.lastTime - a.lastTime)
  res.json({ chats })
})

// mensagens de uma conversa
app.get('/chats/:id/messages', (req, res) => {
  const msgs = (store.messages.get(req.params.id) || []).map((m) => ({
    id: m.id,
    fromMe: m.fromMe,
    text: m.text,
    type: m.type,
    time: m.time,
    pushName: m.pushName,
    hasMedia: !!m.raw,
  }))
  res.json({
    id: req.params.id,
    name: chatDisplayName(req.params.id),
    messages: msgs,
  })
})

// baixa a mídia de uma mensagem, sob demanda
app.get('/chats/:id/media/:messageId', async (req, res) => {
  if (!sock) return res.status(409).json({ ok: false, error: 'WhatsApp não conectado.' })
  const arr = store.messages.get(req.params.id) || []
  const rec = arr.find((m) => m.id === req.params.messageId)
  if (!rec || !rec.raw) {
    return res.status(404).json({ ok: false, error: 'Mídia indisponível.' })
  }
  try {
    const buffer = await downloadMediaMessage(
      {
        key: { remoteJid: req.params.id, id: rec.id, fromMe: rec.fromMe },
        message: rec.raw,
      },
      'buffer',
      {},
      { logger, reuploadRequest: sock.updateMediaMessage }
    )
    const ct =
      rec.type === 'audio'
        ? 'audio/ogg'
        : rec.type === 'imagem'
        ? 'image/jpeg'
        : rec.type === 'video'
        ? 'video/mp4'
        : 'application/octet-stream'
    res.setHeader('Content-Type', ct)
    res.setHeader('Cache-Control', 'private, max-age=3600')
    res.send(buffer)
  } catch (err) {
    console.error('[media]', err.message)
    res.status(500).json({ ok: false, error: 'Não foi possível baixar a mídia.' })
  }
})

// presence (online / digitando / etc). Assina o JID na primeira chamada
// e devolve o último estado conhecido + timestamp.
app.get('/chats/:id/presence', (req, res) => {
  if (!sock) return res.status(409).json({ presence: null })
  const jid = req.params.id
  if (!subscribedJids.has(jid)) {
    subscribedJids.add(jid)
    sock.presenceSubscribe(jid).catch(() => {})
  }
  res.json({ presence: presenceStore.get(jid) || null })
})

// foto de perfil de um contato/grupo (proxy + cache)
app.get('/chats/:id/photo', async (req, res) => {
  if (!sock) {
    res.setHeader('Cache-Control', 'no-store')
    return res.status(409).send()
  }
  try {
    const url = await getPhotoUrl(req.params.id)
    if (!url) {
      res.setHeader('Cache-Control', 'no-store')
      return res.status(404).send()
    }
    const r = await fetch(url)
    if (!r.ok) {
      res.setHeader('Cache-Control', 'no-store')
      return res.status(404).send()
    }
    const buffer = Buffer.from(await r.arrayBuffer())
    res.setHeader('Content-Type', r.headers.get('content-type') || 'image/jpeg')
    res.setHeader('Cache-Control', 'private, max-age=600')
    res.send(buffer)
  } catch {
    res.setHeader('Cache-Control', 'no-store')
    res.status(404).send()
  }
})

// enviar texto para uma conversa existente
app.post('/chats/:id/send-text', async (req, res) => {
  if (!ensureConnected(res)) return
  const { text } = req.body || {}
  if (!text) return res.status(400).json({ ok: false, error: 'Informe "text".' })
  try {
    const sent = await sock.sendMessage(req.params.id, { text: String(text) })
    if (sent) recordMessage(sent)
    res.json({ ok: true })
  } catch (err) {
    console.error('[chats/send-text]', err)
    res.status(500).json({ ok: false, error: err.message })
  }
})

// enviar um áudio salvo para uma conversa existente
app.post('/chats/:id/send-audio/:audioId', async (req, res) => {
  if (!ensureConnected(res)) return
  const lib = await readLibrary()
  const audio = lib.audios.find((a) => a.id === req.params.audioId)
  if (!audio) return res.status(404).json({ ok: false, error: 'Áudio não encontrado.' })
  try {
    const buffer = await readFile(path.join(LIB_AUDIO_DIR, audio.file))
    const sent = await sock.sendMessage(req.params.id, {
      audio: buffer,
      mimetype: 'audio/ogg; codecs=opus',
      ptt: true,
      seconds: audio.seconds,
    })
    if (sent) recordMessage(sent)
    res.json({ ok: true })
  } catch (err) {
    console.error('[chats/send-audio]', err)
    res.status(500).json({ ok: false, error: err.message })
  }
})

// muda o status (etiqueta de pipeline) de uma conversa
const LEAD_STATUSES = [
  'LEAD',
  'NEGOCIACAO',
  'REUNIAO',
  'PROPOSTA',
  'AGUARDANDO',
  'ACEITA',
  'FECHADO',
  'PERDIDA',
]
app.post('/chats/:id/status', (req, res) => {
  const { status } = req.body || {}
  if (!LEAD_STATUSES.includes(status)) {
    return res.status(400).json({ ok: false, error: 'Status inválido.' })
  }
  const ex = store.chats.get(req.params.id) || {
    id: req.params.id,
    unread: 0,
  }
  ex.status = status
  store.chats.set(req.params.id, ex)
  storeDirty = true
  res.json({ ok: true, status })
})

// atualiza qualquer campo do lead (archived, tags, value, source, etc.)
const PATCHABLE = [
  'name',
  'alias',
  'archived',
  'ignored', // marca pra não aparecer em "Sem resposta" mesmo sem ter respondido
  'tags',
  'value',
  'source',
  'email',
  'notes',
  'linkedProposalId',
  'status',
]
app.patch('/chats/:id', (req, res) => {
  const body = req.body || {}
  const ex = store.chats.get(req.params.id) || {
    id: req.params.id,
    unread: 0,
    status: 'LEAD',
  }
  for (const k of PATCHABLE) {
    if (k in body) {
      if (k === 'status' && !LEAD_STATUSES.includes(body[k])) continue
      ex[k] = body[k]
    }
  }
  store.chats.set(req.params.id, ex)
  storeDirty = true
  res.json({ ok: true })
})

// métricas do dashboard
app.get('/dashboard', (req, res) => {
  const allowed = ['today', 'week', 'month', 'all']
  const period = allowed.includes(req.query.period) ? req.query.period : 'week'
  res.json(computeMetrics(period))
})

app.listen(PORT, () => {
  console.log(`\n🚀  Fysi WA Server na porta ${PORT} — http://localhost:${PORT}`)
})

await loadStore()
setInterval(saveStore, 12000)
startSock()
