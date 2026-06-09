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

  /** Extrai preview legível da última mensagem do chat (wppconnect).
   *  Trata tipos especiais (sticker, reaction, vcard, etc) em vez de
   *  mostrar JID/body cru. */
  function extractLastText(lm) {
    if (!lm) return ''
    const t = lm.type || ''
    const body = (lm.body || '').trim()
    const caption = (lm.caption || '').trim()
    // se body é um JID puro (caso de vcard que vem como "123@lid"),
    // não mostra — substitui por label genérico
    const isJid = /^[\d-]+@(s\.whatsapp\.net|lid|g\.us|c\.us)$/.test(body)
    if (t === 'sticker') return '🌟 Figurinha'
    if (t === 'ptt') return '🎙️ Mensagem de voz'
    if (t === 'audio') return '🎵 Áudio'
    if (t === 'image') return caption || '🖼️ Imagem'
    if (t === 'video') return caption || '🎬 Vídeo'
    if (t === 'document') return caption || ('📎 ' + (lm.filename || lm.mediaData?.filename || 'Documento'))
    if (t === 'vcard' || t === 'multi_vcard' || t === 'contact_card') return '👤 Contato'
    if (t === 'location' || t === 'live_location') return '📍 Localização'
    if (t === 'revoked') return '🗑️ Mensagem apagada'
    if (t === 'reaction' || t === 'reaction_in_chat') return 'Reagiu ' + (lm.reactionText || body || '👍')
    if (t === 'poll_creation' || t === 'poll') return '📊 Enquete: ' + (lm.pollName || body || '')
    if (t === 'order') return '🛍️ Pedido'
    if (t === 'product') return '🛍️ Produto'
    if (t === 'call_log') return '📞 Chamada'
    if (t === 'gp2' || t === 'notification_template') return '⚙️ Notificação'
    if (isJid) return '👤 Contato'
    return body || caption || ''
  }

  function chatToIngest(c) {
    const id = c.id?._serialized || c.id
    if (!id || typeof id !== 'string') return null
    return {
      id,
      name: bestName(c),
      isGroup: !!c.isGroup,
      lastTime: Number(c.t) || 0,
      lastText: extractLastText(c.lastMessage),
      fromMeLast: !!c.lastReceivedKey?.fromMe,
      unread: c.unreadCount || 0,
    }
  }

  // wppconnect usa nomes em inglês; o wa-server fala português.
  // Mapeia antes de empurrar, senão o bubble cai no fallback de texto.
  const TYPE_MAP = {
    image: 'imagem',
    video: 'video',
    audio: 'audio',
    ptt: 'audio',
    document: 'documento',
    sticker: 'sticker',
    chat: 'texto',
  }

  function msgToIngest(m) {
    const rawType = m.type || 'chat'
    const type = TYPE_MAP[rawType] || rawType
    const isMedia = ['imagem', 'video', 'audio', 'documento'].includes(type)
    const caption = (m.caption || '').trim()
    // Pra mídia, m.body do wppconnect é base64 cru do arquivo —
    // NUNCA usar como texto. Pra texto puro, usa body normalmente.
    const text = isMedia ? caption : (m.body || m.caption || '')
    return {
      id: m.id?._serialized || m.id,
      chatId: m.from?._serialized || m.from || (m.id?.remote?._serialized) || '',
      fromMe: !!m.fromMe,
      text,
      type,
      hasMedia: isMedia,
      meta: isMedia
        ? {
            caption,
            fileName: m.filename || m.mediaData?.filename || '',
            mimetype: m.mimetype || '',
            fileLength: Number(m.size || 0) || undefined,
          }
        : null,
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
      // dispara download de fotos em background (throttled)
      queuePhotos(list)
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

  // ── Foto de perfil ─────────────────────────────────────────────────────
  // Pra cada chat sem foto cachada, baixa via WPP.contact.getProfilePictureUrl
  // e empurra base64 pra wa-server. Throttle pra não martelar o WhatsApp.
  const photoCache = new Set() // chatIds que já tentamos baixar (sucesso ou não)
  let photoQueue = []
  let photoBusy = false

  async function processPhotoQueue() {
    if (photoBusy || photoQueue.length === 0) return
    photoBusy = true
    while (photoQueue.length > 0) {
      const id = photoQueue.shift()
      if (photoCache.has(id)) continue
      photoCache.add(id)
      try {
        const url = await window.WPP.contact.getProfilePictureUrl(id)
        if (!url) continue
        const resp = await fetch(url, { mode: 'cors' })
        if (!resp.ok) continue
        const blob = await resp.blob()
        if (blob.size > 2_000_000) continue
        const reader = new FileReader()
        await new Promise((resolve) => {
          reader.onloadend = () => {
            const dataBase64 = String(reader.result || '').split(',')[1] || ''
            if (dataBase64) {
              post('/ingest/photo', {
                chatId: id,
                mimetype: blob.type || 'image/jpeg',
                dataBase64,
              })
            }
            resolve()
          }
          reader.readAsDataURL(blob)
        })
      } catch {
        // contato pode ter foto privada, ser @lid sem mapping, etc — silencia
      }
      // 250ms entre downloads → 4/s, ~6min pra 1500 conversas
      await new Promise((r) => setTimeout(r, 250))
    }
    photoBusy = false
  }

  function queuePhotos(chats) {
    for (const c of chats) {
      const id = c.id?._serialized || c.id
      if (id && !photoCache.has(id)) photoQueue.push(id)
    }
    processPhotoQueue()
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
