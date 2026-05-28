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
import { rmSync } from 'node:fs'
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
    }

    if (connection === 'close') {
      connState = 'close'
      const statusCode = lastDisconnect?.error?.output?.statusCode
      const loggedOut = statusCode === DisconnectReason.loggedOut
      console.log(`❌  Conexão fechada (code=${statusCode}). loggedOut=${loggedOut}`)

      if (loggedOut) {
        // sessão revogada — apaga credenciais para gerar um novo QR
        rmSync(AUTH_DIR, { recursive: true, force: true })
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
    for (const m of messages || []) recordMessage(m)
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

/** Só conversas reais (contato ou grupo) — ignora status/broadcast. */
function isRealChat(jid) {
  return (
    typeof jid === 'string' &&
    (jid.endsWith('@s.whatsapp.net') || jid.endsWith('@g.us'))
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

/** Nome de exibição de uma conversa. */
function chatDisplayName(jid) {
  const c = store.chats.get(jid)
  if (c?.name) return c.name
  const ct = store.contacts.get(jid)
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
    const rec = {
      id: m.key.id,
      fromMe: !!m.key.fromMe,
      text,
      type,
      time,
      pushName: m.pushName || '',
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
      chat.lastText = text
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
    if (!c.fromMeLast) {
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
app.use(express.json())
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
} else {
  console.log('⚠️   WA_AUTH_TOKEN não definido — endpoints abertos (uso local)')
}

// status da conexão
app.get('/status', (_req, res) => {
  res.json({ state: connState, me: meNumber })
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

// lista de conversas (mais recentes primeiro)
app.get('/chats', (_req, res) => {
  const chats = [...store.chats.values()]
    .filter((c) => c.lastTime)
    .map((c) => ({
      id: c.id,
      name: chatDisplayName(c.id),
      isGroup: c.id.endsWith('@g.us'),
      lastText: c.lastText || '',
      lastTime: c.lastTime || 0,
      fromMeLast: !!c.fromMeLast,
      unread: c.unread || 0,
      status: c.status || 'LEAD',
      archived: !!c.archived,
      tags: c.tags || [],
      value: c.value || 0,
      source: c.source || '',
      email: c.email || '',
      notes: c.notes || '',
      linkedProposalId: c.linkedProposalId || '',
    }))
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
  'archived',
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
