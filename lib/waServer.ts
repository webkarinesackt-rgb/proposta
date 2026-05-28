/**
 * Cliente do wa-server (motor do WhatsApp).
 * Em dev, o wa-server roda em http://localhost:3100.
 */
const WA = process.env.NEXT_PUBLIC_WA_SERVER_URL || 'http://localhost:3100'
const TOKEN = process.env.NEXT_PUBLIC_WA_AUTH_TOKEN || ''

function authHeaders(init?: HeadersInit): Headers {
  const h = new Headers(init)
  if (TOKEN && !h.has('Authorization')) h.set('Authorization', `Bearer ${TOKEN}`)
  return h
}

function withTokenQS(url: string): string {
  if (!TOKEN) return url
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}t=${encodeURIComponent(TOKEN)}`
}

function waFetch(path: string, init: RequestInit = {}) {
  return fetch(`${WA}${path}`, { ...init, headers: authHeaders(init.headers) })
}

export interface WaChat {
  id: string
  name: string
  isGroup: boolean
  lastText: string
  lastTime: number
  fromMeLast: boolean
  unread: number
  status: string
  archived: boolean
  tags: string[]
  value: number
  source: string
  email: string
  notes: string
  linkedProposalId: string
}

export interface WaChatPatch {
  name?: string
  archived?: boolean
  tags?: string[]
  value?: number
  source?: string
  email?: string
  notes?: string
  linkedProposalId?: string
  status?: string
}

export const LEAD_SOURCES = [
  'Instagram',
  'Indicação',
  'Tráfego pago',
  'Site',
  'Orgânico (WhatsApp)',
  'Lista de espera',
  'Outro',
] as const

/** Etiquetas de pipeline (mesma ordem e ids do wa-server). */
export const LEAD_STATUSES = [
  { id: 'LEAD',       label: 'Lead',                color: '#3B82F6', bg: '#EFF6FF' },
  { id: 'NEGOCIACAO', label: 'Negociação',          color: '#EAB308', bg: '#FEFCE8' },
  { id: 'REUNIAO',    label: 'Reunião agendada',    color: '#F97316', bg: '#FFF7ED' },
  { id: 'PROPOSTA',   label: 'Proposta enviada',    color: '#EF4444', bg: '#FEF2F2' },
  { id: 'AGUARDANDO', label: 'Aguardando resposta', color: '#A855F7', bg: '#FAF5FF' },
  { id: 'FECHADO',    label: 'Fechado',             color: '#22C55E', bg: '#F0FDF4' },
  { id: 'PERDIDA',    label: 'Perdida',             color: '#64748B', bg: '#F1F5F9' },
] as const

export type LeadStatusId = (typeof LEAD_STATUSES)[number]['id']

export const STATUS_META: Record<string, { label: string; color: string; bg: string }> =
  Object.fromEntries(LEAD_STATUSES.map((s) => [s.id, s]))

export interface WaMessage {
  id: string
  fromMe: boolean
  text: string
  type: string
  time: number
  pushName: string
  hasMedia?: boolean
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

export interface WaDashboard {
  period: string
  totalChats: number
  unanswered: number
  received: number
  sent: number
  activeChats: number
  avgResponseMin: number
  longestWaitH: number
}

export interface WaSearchHit {
  chatId: string
  name: string
  count: number
  snippet: string
  time: number
  fromMe: boolean
}

export const waServer = {
  base: WA,

  /**
   * URL pra baixar mídia (áudio/imagem) — usado em <img>/<audio>, que não
   * conseguem mandar header Authorization, então o token vai como ?t=.
   */
  mediaUrl(chatId: string, messageId: string) {
    return withTokenQS(
      `${WA}/chats/${encodeURIComponent(chatId)}/media/${encodeURIComponent(messageId)}`
    )
  },

  /** URL da foto de perfil (idem: token via ?t=). */
  photoUrl(chatId: string) {
    return withTokenQS(`${WA}/chats/${encodeURIComponent(chatId)}/photo`)
  },

  async status(): Promise<WaStatus> {
    const r = await waFetch('/status')
    return r.json()
  },

  async chats(): Promise<WaChat[]> {
    const r = await waFetch('/chats')
    const j = await r.json()
    return j.chats || []
  },

  async messages(id: string): Promise<{ id: string; name: string; messages: WaMessage[] }> {
    const r = await waFetch(`/chats/${encodeURIComponent(id)}/messages`)
    return r.json()
  },

  async sendText(id: string, text: string): Promise<{ ok: boolean; error?: string }> {
    const r = await waFetch(`/chats/${encodeURIComponent(id)}/send-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    return r.json()
  },

  // ── biblioteca de modelos ──

  async library(): Promise<{ snippets: WaSnippet[]; audios: WaAudio[] }> {
    const r = await waFetch('/library')
    const j = await r.json()
    return { snippets: j.snippets || [], audios: j.audios || [] }
  },

  async addSnippet(name: string, category: string, content: string) {
    const r = await waFetch('/library/snippet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, category, content }),
    })
    return r.json()
  },

  async delSnippet(id: string) {
    await waFetch(`/library/snippet/${id}`, { method: 'DELETE' })
  },

  async addAudio(name: string, category: string, file: File) {
    const fd = new FormData()
    fd.append('name', name)
    fd.append('category', category)
    fd.append('audio', file)
    const r = await waFetch('/library/audio', { method: 'POST', body: fd })
    return r.json()
  },

  async delAudio(id: string) {
    await waFetch(`/library/audio/${id}`, { method: 'DELETE' })
  },

  async sendSavedAudio(chatId: string, audioId: string) {
    const r = await waFetch(
      `/chats/${encodeURIComponent(chatId)}/send-audio/${audioId}`,
      { method: 'POST' }
    )
    return r.json()
  },

  async dashboard(period: string): Promise<WaDashboard> {
    const r = await waFetch(`/dashboard?period=${period}`)
    return r.json()
  },

  async searchMessages(q: string): Promise<WaSearchHit[]> {
    if (!q || q.trim().length < 2) return []
    const r = await waFetch(`/search?q=${encodeURIComponent(q)}`)
    const j = await r.json()
    return j.results || []
  },

  async setStatus(chatId: string, status: string) {
    const r = await waFetch(`/chats/${encodeURIComponent(chatId)}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    return r.json()
  },

  async updateChat(chatId: string, patch: WaChatPatch) {
    const r = await waFetch(`/chats/${encodeURIComponent(chatId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    return r.json()
  },
}
