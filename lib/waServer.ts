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
  const method = (init.method || 'GET').toUpperCase()
  // Timeout SÓ em GET (leituras idempotentes: status/chats/messages) — evita
  // que um poll travado fique pendurado e vá acumulando. NÃO se aplica a envios
  // (POST/PATCH): abortar o cliente não cancela o envio no servidor, então a
  // mensagem poderia ir mesmo assim e o operador reenviaria (duplicada).
  const signal = init.signal ?? (method === 'GET' ? AbortSignal.timeout(30000) : undefined)
  return fetch(`${WA}${path}`, {
    ...init,
    headers: authHeaders(init.headers),
    signal,
  })
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
  ignored: boolean
  tags: string[]
  value: number
  source: string
  email: string
  notes: string
  linkedProposalId: string
  nextAction?: string
  nextActionDate?: number // unix timestamp em segundos
  pinned?: boolean
}

export interface WaChatPatch {
  name?: string
  alias?: string
  archived?: boolean
  ignored?: boolean
  tags?: string[]
  value?: number
  source?: string
  email?: string
  notes?: string
  linkedProposalId?: string
  status?: string
  nextAction?: string
  nextActionDate?: number
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
  { id: 'ACEITA',     label: 'Proposta aceita',     color: '#0EA5E9', bg: '#E0F2FE' },
  { id: 'FECHADO',    label: 'Fechado',             color: '#22C55E', bg: '#F0FDF4' },
  { id: 'PERDIDA',    label: 'Perdida',             color: '#64748B', bg: '#F1F5F9' },
] as const

export type LeadStatusId = (typeof LEAD_STATUSES)[number]['id']

export const STATUS_META: Record<string, { label: string; color: string; bg: string }> =
  Object.fromEntries(LEAD_STATUSES.map((s) => [s.id, s]))

export interface WaQuoted {
  text: string
  type: string
  fromMe: boolean
  sender: string // display name de quem foi citado, se conhecido
}

export interface WaMessageMeta {
  caption?: string
  fileName?: string
  mimetype?: string
  fileLength?: number
}

export interface WaMessage {
  id: string
  fromMe: boolean
  text: string
  type: string
  time: number
  pushName: string
  hasMedia?: boolean
  /** 0=desconhecido, 2=enviada (✓), 3=entregue (✓✓ cinza), 4/5=lida/tocada (✓✓ azul) */
  status?: number
  meta?: WaMessageMeta | null
  quoted?: WaQuoted | null
  reactions?: { by: string; emoji: string }[]
}

export interface WaSeriesPoint {
  t: number
  received: number
  sent: number
}

export interface WaStatus {
  state: 'starting' | 'qr' | 'open' | 'close'
  me: string | null
  /** Idade do último push da extensão Chrome (segundos). Null = nunca recebido. */
  ingest?: { lastAt: number; ageS: number } | null
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

  /**
   * URL da foto de perfil (idem: token via ?t=).
   * `bust` é um número opcional pra forçar refresh do cache (cache-bust).
   * Importante: bust precisa ser anexado APÓS ?t= existir, senão vira
   * `?t=TOKEN?b=N` (URL malformada).
   */
  photoUrl(chatId: string, bust?: number) {
    const url = withTokenQS(`${WA}/chats/${encodeURIComponent(chatId)}/photo`)
    if (!bust) return url
    return url + (url.includes('?') ? '&' : '?') + 'b=' + bust
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

  async addChat(number: string, name?: string): Promise<{ ok: boolean; jid?: string; error?: string }> {
    const r = await waFetch('/chats/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ number, name: name || '' }),
    })
    return r.json()
  },

  async messages(id: string): Promise<{ id: string; name: string; messages: WaMessage[] }> {
    const r = await waFetch(`/chats/${encodeURIComponent(id)}/messages`)
    return r.json()
  },

  async sendMedia(
    chatId: string,
    file: File,
    caption?: string,
    asDocument?: boolean,
    quotedId?: string
  ): Promise<{ ok: boolean; id?: string; error?: string }> {
    const fd = new FormData()
    fd.append('file', file)
    if (caption) fd.append('caption', caption)
    if (asDocument) fd.append('kind', 'document')
    if (quotedId) fd.append('quotedId', quotedId)
    const r = await waFetch(`/chats/${encodeURIComponent(chatId)}/send-media`, {
      method: 'POST',
      body: fd,
    })
    return r.json()
  },

  async sendText(
    id: string,
    text: string,
    quotedId?: string
  ): Promise<{ ok: boolean; error?: string }> {
    const r = await waFetch(`/chats/${encodeURIComponent(id)}/send-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, quotedId }),
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

  async dashboardSeries(period: string): Promise<{ period: string; step: number; series: WaSeriesPoint[] }> {
    const r = await waFetch(`/dashboard/series?period=${period}`)
    return r.json()
  },

  async markRead(chatId: string) {
    const r = await waFetch(`/chats/${encodeURIComponent(chatId)}/read`, {
      method: 'POST',
    })
    return r.json()
  },

  async searchMessages(q: string): Promise<WaSearchHit[]> {
    if (!q || q.trim().length < 2) return []
    const r = await waFetch(`/search?q=${encodeURIComponent(q)}`)
    const j = await r.json()
    return j.results || []
  },

  async groupInfo(chatId: string): Promise<{
    ok: boolean
    subject?: string
    description?: string
    owner?: string
    createdAt?: number
    participantCount?: number
    participants?: { jid: string; number: string; name: string; isAdmin: boolean; isOwner: boolean }[]
    error?: string
  }> {
    const r = await waFetch(`/chats/${encodeURIComponent(chatId)}/group-info`)
    return r.json()
  },

  async presence(chatId: string): Promise<{ state: string; ts: number } | null> {
    try {
      const r = await waFetch(`/chats/${encodeURIComponent(chatId)}/presence`)
      const j = await r.json()
      return j.presence || null
    } catch {
      return null
    }
  },

  /**
   * URL do stream SSE de eventos. EventSource não suporta headers,
   * então o token precisa ir como query param.
   */
  eventsUrl() {
    return withTokenQS(`${WA}/events`)
  },

  /** URL da página HTML do QR (servida pelo wa-server). Token via ?t=
   *  porque a página é renderizada sem headers. */
  qrUrl() {
    return withTokenQS(`${WA}/`)
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
