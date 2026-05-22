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
} from '@whiskeysockets/baileys'
import NodeCache from '@cacheable/node-cache'
import P from 'pino'
import qrcodeTerminal from 'qrcode-terminal'
import QRCode from 'qrcode'
import express from 'express'
import multer from 'multer'
import { rmSync } from 'node:fs'
import { writeFile, readFile, unlink } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { tmpdir } from 'node:os'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ffmpegPath from 'ffmpeg-static'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const AUTH_DIR = path.join(__dirname, 'auth')
const PORT = Number(process.env.PORT) || 3100

const logger = P({ level: 'silent' })
const execFileAsync = promisify(execFile)

// ─── Estado da conexão (em memória) ──────────────────────────────
let sock = null
let currentQR = null        // string crua do QR enquanto aguarda scan
let connState = 'starting'  // starting | qr | open | close
let meNumber = null         // número conectado, quando aberto

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
    browser: ['Fysi CRM', 'Chrome', '1.0.0'],
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

  // log de mensagens recebidas — prova que o canal de leitura funciona
  sock.ev.on('messages.upsert', ({ messages, type }) => {
    if (type !== 'notify') return
    for (const m of messages) {
      if (m.key.fromMe) continue
      const from = m.key.remoteJid
      const text =
        m.message?.conversation ||
        m.message?.extendedTextMessage?.text ||
        '[mídia/outro]'
      console.log(`💬  ${from}: ${text}`)
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

app.use(express.json())
app.use(express.static(path.join(__dirname, 'public')))

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

app.listen(PORT, () => {
  console.log(`\n🚀  Fysi WA Server na porta ${PORT} — http://localhost:${PORT}`)
})

startSock()
