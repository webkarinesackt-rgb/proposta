// Inject script — roda no MAIN world da página do WhatsApp Web.
// Tem acesso a window.WPP (exposto pelo wppconnect-wa.js).
//
// Responsabilidades:
//  - esperar WPP ficar pronto (WhatsApp Web autenticado)
//  - escutar eventos de mensagem em tempo real
//  - empurrar pra https://wa-fysi.../ingest/...
//  - tb fazer sync periodico do snapshot completo (catch-up)

(function () {
  const TAG = '[Fysi Bridge]'
  const root = document.documentElement
  const WA_URL = root.getAttribute('data-fysi-wa-url') || ''
  const WA_TOKEN = root.getAttribute('data-fysi-wa-token') || ''

  if (!WA_URL || !WA_TOKEN) {
    console.warn(TAG, 'sem URL/token configurados — abra o popup da extensão')
    return
  }

  // ── helpers ────────────────────────────────────────────────────────────
  // NÃO usar fetch() direto: WhatsApp Web tem CSP estrita que bloqueia
  // chamadas pra domínios fora do allowlist deles. Em vez disso, posta
  // pro content script (que vive no contexto da extensão, sem essa CSP)
  // via window.postMessage.
  function post(path, body) {
    window.postMessage(
      { __fysiBridge: true, path, body },
      window.location.origin
    )
  }

  // tenta extrair o melhor nome possível pra um chat
  function bestName(c) {
    return (
      c.name ||
      c.formattedTitle ||
      c.contact?.name ||
      c.contact?.formattedName ||
      c.contact?.pushname ||
      c.contact?.verifiedName ||
      c.contact?.shortName ||
      c.groupMetadata?.subject ||
      ''
    )
  }

  // converte um chat do wppconnect num shape que o wa-server entende
  function chatToIngest(c) {
    const id = c.id?._serialized || c.id
    if (!id || typeof id !== 'string') return null
    return {
      id,
      name: bestName(c),
      isGroup: !!c.isGroup,
      lastTime: Number(c.t) || 0, // timestamp (segundos)
      lastText: c.lastMessage?.body || c.lastMessage?.caption || '',
      fromMeLast: !!c.lastReceivedKey?.fromMe,
      unread: c.unreadCount || 0,
    }
  }

  function msgToIngest(m) {
    return {
      id: m.id?._serialized || m.id,
      chatId: m.from?._serialized || m.from || (m.id?.remote?._serialized) || '',
      fromMe: !!m.fromMe,
      text: m.body || m.caption || '',
      type: m.type || 'chat',
      time: Number(m.t) || Math.floor(Date.now() / 1000),
      pushName: m.notifyName || m.senderObj?.pushname || '',
    }
  }

  // ── sync de snapshot completo ──────────────────────────────────────────
  async function fullSync() {
    if (!window.WPP || !window.WPP.chat || !window.WPP.isReady) return
    try {
      const list = await window.WPP.chat.list({ withLabels: false })
      const chats = list.map(chatToIngest).filter(Boolean)
      console.log(TAG, 'full sync —', chats.length, 'conversas')
      post('/ingest/chats', { chats })
    } catch (e) {
      // 'dropping db read operation due to logout' acontece quando o WPP
      // está em estado de transição; ignora e tenta no próximo ciclo.
      if (!String(e?.message).includes('dropping db')) {
        console.warn(TAG, 'fullSync erro:', e.message)
      }
    }
  }

  // tipos de mensagem com mídia (wppconnect)
  const MEDIA_TYPES = new Set(['image', 'video', 'audio', 'ptt', 'document', 'sticker'])

  /** Baixa o blob da mídia via wppconnect e empurra base64 pro wa-server. */
  async function pushMediaIfAny(msg) {
    try {
      const type = msg.type
      if (!MEDIA_TYPES.has(type)) return
      const id = msg.id?._serialized || msg.id
      const chatId = msg.from?._serialized || msg.from
      if (!id || !chatId) return
      // WPP.chat.downloadMedia aceita o msgId ou o msg inteiro
      const blob = await window.WPP.chat.downloadMedia(id)
      if (!blob) return
      // converte Blob → base64
      const reader = new FileReader()
      reader.onloadend = () => {
        const result = reader.result || ''
        const dataBase64 = String(result).split(',')[1] || ''
        if (!dataBase64) return
        post('/ingest/media', {
          chatId,
          msgId: id,
          mimetype: blob.type || msg.mimetype || '',
          dataBase64,
        })
      }
      reader.readAsDataURL(blob)
    } catch (e) {
      // download falha quando msg expira / mídia revogada — silencia
    }
  }

  // ── eventos em tempo real ──────────────────────────────────────────────
  function bindEvents() {
    if (!window.WPP || !window.WPP.on) return
    // mensagem nova
    window.WPP.on('chat.new_message', (msg) => {
      const m = msgToIngest(msg)
      if (m.chatId) {
        post('/ingest/message', { message: m })
        // pra mensagens de mídia, baixa e empurra binário também
        pushMediaIfAny(msg)
      }
    })
    // chat atualizado (rename, unread, archive)
    if (window.WPP.chat?.on) {
      window.WPP.chat.on('change', (chat) => {
        const c = chatToIngest(chat)
        if (c) post('/ingest/chat', { chat: c })
      })
    }
    console.log(TAG, 'eventos vinculados')
  }

  // ── espera WPP ficar pronto (login + sync inicial) ─────────────────────
  function waitForReady() {
    const iv = setInterval(() => {
      if (window.WPP?.isReady) {
        clearInterval(iv)
        console.log(TAG, 'WPP pronto — começando sync')
        bindEvents()
        fullSync()
        setInterval(fullSync, 60_000) // catch-up a cada 1 min
      }
    }, 1500)
  }

  // wppconnect-wa.js é UMD — vamos esperar window.WPP existir
  if (window.WPP) waitForReady()
  else {
    const iv = setInterval(() => {
      if (window.WPP) {
        clearInterval(iv)
        console.log(TAG, 'WPP carregado, aguardando isReady…')
        waitForReady()
      }
    }, 200)
  }

  console.log(TAG, 'inject carregado. URL:', WA_URL)
})()
