/**
 * Cliente do wa-server (motor do WhatsApp).
 * Em dev, o wa-server roda em http://localhost:3100.
 */
const WA = process.env.NEXT_PUBLIC_WA_SERVER_URL || 'http://localhost:3100'

export interface WaChat {
  id: string
  name: string
  isGroup: boolean
  lastText: string
  lastTime: number
  fromMeLast: boolean
  unread: number
}

export interface WaMessage {
  id: string
  fromMe: boolean
  text: string
  type: string
  time: number
  pushName: string
}

export interface WaStatus {
  state: 'starting' | 'qr' | 'open' | 'close'
  me: string | null
}

export interface WaSnippet {
  id: string
  name: string
  category: string
  content: string
}

export interface WaAudio {
  id: string
  name: string
  category: string
  file: string
  seconds: number
}

export const waServer = {
  base: WA,

  async status(): Promise<WaStatus> {
    const r = await fetch(`${WA}/status`)
    return r.json()
  },

  async chats(): Promise<WaChat[]> {
    const r = await fetch(`${WA}/chats`)
    const j = await r.json()
    return j.chats || []
  },

  async messages(id: string): Promise<{ id: string; name: string; messages: WaMessage[] }> {
    const r = await fetch(`${WA}/chats/${encodeURIComponent(id)}/messages`)
    return r.json()
  },

  async sendText(id: string, text: string): Promise<{ ok: boolean; error?: string }> {
    const r = await fetch(`${WA}/chats/${encodeURIComponent(id)}/send-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    return r.json()
  },

  // ── biblioteca de modelos ──

  async library(): Promise<{ snippets: WaSnippet[]; audios: WaAudio[] }> {
    const r = await fetch(`${WA}/library`)
    const j = await r.json()
    return { snippets: j.snippets || [], audios: j.audios || [] }
  },

  async addSnippet(name: string, category: string, content: string) {
    const r = await fetch(`${WA}/library/snippet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, category, content }),
    })
    return r.json()
  },

  async delSnippet(id: string) {
    await fetch(`${WA}/library/snippet/${id}`, { method: 'DELETE' })
  },

  async addAudio(name: string, category: string, file: File) {
    const fd = new FormData()
    fd.append('name', name)
    fd.append('category', category)
    fd.append('audio', file)
    const r = await fetch(`${WA}/library/audio`, { method: 'POST', body: fd })
    return r.json()
  },

  async delAudio(id: string) {
    await fetch(`${WA}/library/audio/${id}`, { method: 'DELETE' })
  },

  async sendSavedAudio(chatId: string, audioId: string) {
    const r = await fetch(
      `${WA}/chats/${encodeURIComponent(chatId)}/send-audio/${audioId}`,
      { method: 'POST' }
    )
    return r.json()
  },
}
