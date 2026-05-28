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
  async function post(path, body) {
    try {
      const r = await fetch(WA_URL + path, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + WA_TOKEN,
        },
        body: JSON.stringify(body),
      })
      if (!r.ok) console.warn(TAG, path, r.status, await r.text())
    } catch (e) {
      console.warn(TAG, path, 'erro:', e.message)
    }
  }

  // converte um chat do wppconnect num shape que o wa-server entende
  function chatToIngest(c) {
    const id = c.id?._serialized || c.id
    if (!id || typeof id !== 'string') return null
    return {
      id,
      name: c.name || c.formattedTitle || c.contact?.name || c.contact?.pushname || '',
      isGroup: !!c.isGroup,
      lastTime: Number(c.t) || 0, // timestamp (segundos)
      lastText: c.lastReceivedKey?.fromMe ? (c.lastMessage?.body || '') : (c.lastMessage?.body || ''),
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
      await post('/ingest/chats', { chats })
    } catch (e) {
      console.warn(TAG, 'fullSync erro:', e.message)
    }
  }

  // ── eventos em tempo real ──────────────────────────────────────────────
  function bindEvents() {
    if (!window.WPP || !window.WPP.on) return
    // mensagem nova
    window.WPP.on('chat.new_message', (msg) => {
      const m = msgToIngest(msg)
      if (m.chatId) post('/ingest/message', { message: m })
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
