'use client'

import { useEffect, useRef, useState } from 'react'
import { waServer, WaChat, WaMessage, STATUS_META } from '@/lib/waServer'
import { Search, Send, Users, Zap, FileText, PanelLeftClose, PanelLeftOpen, Info, Archive, ArchiveRestore, Tag, X, ChevronDown } from 'lucide-react'
import { LEAD_STATUSES } from '@/lib/waServer'
import { useSearchParams } from 'next/navigation'
import ModelsPanel from './ModelsPanel'
import ProposalPicker from './ProposalPicker'
import LeadDetailsPanel from './LeadDetailsPanel'

/* ── tokens ──────────────────────────────────────────── */

const T = {
  textPrimary: '#162322',
  textMuted: '#6B8585',
  textDim: '#8AA09A',
  border: '#E6E6E1',
  borderSubtle: '#F0F0EC',
  card: '#FFFFFF',
  bgSubtle: '#FAFAF8',
  conversationBg: '#F0EDE4',
  accent: '#0D3839',
  accentBright: '#F4F99D',
  green: '#22C55E',
}

/* ── helpers ─────────────────────────────────────────── */

function fmtTime(t: number) {
  if (!t) return ''
  const d = new Date(t * 1000)
  const sameDay = d.toDateString() === new Date().toDateString()
  return sameDay
    ? d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?'
}

/* ── avatar ──────────────────────────────────────────── */

function Avatar({
  chatId,
  name,
  isGroup,
  size,
  active,
}: {
  chatId: string
  name: string
  isGroup: boolean
  size: number
  active?: boolean
}) {
  const [error, setError] = useState(false)
  const [bust, setBust] = useState(0)
  // se a foto falhou, tenta de novo em 60s (pode ter chegado depois)
  useEffect(() => {
    if (!error) return
    const t = setTimeout(() => {
      setError(false)
      setBust((b) => b + 1)
    }, 60_000)
    return () => clearTimeout(t)
  }, [error])
  return (
    <div
      className="rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden font-bold"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.32),
        background: active ? T.accent : '#F4F3EF',
        color: active ? T.accentBright : T.textDim,
        border: `1px solid ${active ? T.accent : T.border}`,
      }}
    >
      {error ? (
        isGroup ? (
          <Users size={Math.round(size * 0.42)} />
        ) : (
          <span>{initials(name)}</span>
        )
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={waServer.photoUrl(chatId) + (bust ? `?b=${bust}` : '')}
          alt=""
          onError={() => setError(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      )}
    </div>
  )
}

/* ── linkify ─────────────────────────────────────────── */

function renderText(text: string, mine: boolean) {
  const re = /(https?:\/\/[^\s]+)/g
  const out: React.ReactNode[] = []
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index))
    out.push(
      <a
        key={m.index}
        href={m[0]}
        target="_blank"
        rel="noopener noreferrer"
        className="underline break-all"
        style={{ color: mine ? '#C8E6E0' : '#0D7A4A' }}
      >
        {m[0]}
      </a>
    )
    last = m.index + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return out.length ? out : text
}

/* ── chat list row ───────────────────────────────────── */

function ChatRow({
  chat,
  active,
  onClick,
  onSetStatus,
  onArchive,
}: {
  chat: WaChat
  active: boolean
  onClick: () => void
  onSetStatus: (status: string) => void
  onArchive: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const statusMeta = STATUS_META[chat.status] || STATUS_META.LEAD
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      className="relative w-full flex items-center gap-3 px-4 py-3 text-left transition-colors cursor-pointer"
      style={{
        background: active ? 'rgba(13,56,57,0.04)' : 'transparent',
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = T.bgSubtle
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = 'transparent'
      }}
    >
      {active && (
        <span
          className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full"
          style={{ background: T.accent }}
        />
      )}
      <Avatar
        chatId={chat.id}
        name={chat.name}
        isGroup={chat.isGroup}
        size={42}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span
            className="text-[13px] font-bold truncate"
            style={{ color: T.textPrimary }}
          >
            {chat.name}
          </span>
          <span className="text-[10px] flex-shrink-0" style={{ color: T.textDim }}>
            {fmtTime(chat.lastTime)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <span className="text-[12px] truncate" style={{ color: T.textMuted }}>
            {chat.fromMeLast && (
              <span style={{ color: T.textDim }}>Você: </span>
            )}
            {chat.lastText || '—'}
          </span>
          <div
            className="relative flex-shrink-0 flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            {chat.unread > 0 && (
              <span
                className="text-[10px] font-bold rounded-full flex items-center justify-center text-white"
                style={{
                  background: T.green,
                  minWidth: 18,
                  height: 18,
                  padding: '0 5px',
                }}
              >
                {chat.unread}
              </span>
            )}
            {chat.unread > 0 ? (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setMenuOpen((o) => !o)
                }}
                title="Ações da conversa"
                className="rounded p-0.5 transition-colors hover:bg-black/5"
                style={{ color: T.textDim }}
              >
                <ChevronDown size={14} />
              </button>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setMenuOpen((o) => !o)
                }}
                title="Mudar etapa"
                className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded flex items-center gap-0.5 transition-all"
                style={{
                  background: statusMeta.bg,
                  color: statusMeta.color,
                  border: `1px solid ${statusMeta.color}30`,
                }}
              >
                {statusMeta.label.length > 11
                  ? statusMeta.label.slice(0, 9) + '…'
                  : statusMeta.label}
                <ChevronDown size={9} />
              </button>
            )}
              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={(e) => {
                      e.stopPropagation()
                      setMenuOpen(false)
                    }}
                  />
                  <div
                    className="absolute z-40 top-full mt-1.5 right-0 w-56 rounded-xl py-1"
                    style={{
                      background: '#FFFFFF',
                      border: `1px solid ${T.border}`,
                      boxShadow: '0 12px 32px rgba(0,0,0,0.12)',
                    }}
                  >
                    {LEAD_STATUSES.map((s) => (
                      <button
                        key={s.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          onSetStatus(s.id)
                          setMenuOpen(false)
                        }}
                        className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-[#FAFAF8] transition-colors"
                      >
                        <span
                          className="text-[10px] font-bold uppercase tracking-[0.06em] px-2 py-0.5 rounded-full"
                          style={{
                            background: s.bg,
                            color: s.color,
                            border: `1px solid ${s.color}30`,
                          }}
                        >
                          {s.label}
                        </span>
                        {chat.status === s.id && (
                          <span className="ml-auto text-[10px] text-[#8AA09A]">
                            atual
                          </span>
                        )}
                      </button>
                    ))}
                    <div
                      className="my-1"
                      style={{ borderTop: `1px solid ${T.borderSubtle}` }}
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onArchive()
                        setMenuOpen(false)
                      }}
                      className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-[#FAFAF8] transition-colors text-[12px] text-[#6B8585]"
                    >
                      <Archive size={11} />
                      {chat.archived ? 'Desarquivar' : 'Arquivar conversa'}
                    </button>
                  </div>
                </>
              )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── bolha de mensagem ───────────────────────────────── */

function Bubble({ msg, chatId }: { msg: WaMessage; chatId: string }) {
  const mine = msg.fromMe
  const isAudio = msg.type === 'audio' && msg.hasMedia
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div
        className="max-w-[72%] px-3.5 py-2 rounded-2xl"
        style={{
          background: mine ? T.accent : '#FFFFFF',
          color: mine ? '#FFFFFF' : T.textPrimary,
          border: mine ? 'none' : `1px solid ${T.border}`,
          borderBottomRightRadius: mine ? 4 : 16,
          borderBottomLeftRadius: mine ? 16 : 4,
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
        }}
      >
        {isAudio ? (
          <audio
            controls
            preload="none"
            src={waServer.mediaUrl(chatId, msg.id)}
            style={{ height: 36, maxWidth: 240, display: 'block' }}
          />
        ) : (
          <p className="text-[13px] leading-snug whitespace-pre-wrap break-words">
            {renderText(msg.text, mine)}
          </p>
        )}
        <p
          className="text-[10px] mt-1 text-right"
          style={{ color: mine ? 'rgba(255,255,255,0.5)' : T.textDim }}
        >
          {fmtTime(msg.time)}
        </p>
      </div>
    </div>
  )
}

/* ── main ────────────────────────────────────────────── */

export default function InboxView() {
  const [chats, setChats] = useState<WaChat[]>([])
  const [conn, setConn] = useState<string>('...')
  const [serverOff, setServerOff] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedName, setSelectedName] = useState('')
  const [messages, setMessages] = useState<WaMessage[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [search, setSearch] = useState('')
  const [showModels, setShowModels] = useState(false)
  const [showProposals, setShowProposals] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [chatFilter, setChatFilter] = useState<'all' | 'unanswered' | 'archived' | 'groups'>('all')
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [tagMenuOpen, setTagMenuOpen] = useState(false)
  const [listOpen, setListOpen] = useState(true)
  const msgEndRef = useRef<HTMLDivElement>(null)

  // poll: status + lista de conversas
  useEffect(() => {
    let alive = true
    async function tick() {
      try {
        const [st, cs] = await Promise.all([waServer.status(), waServer.chats()])
        if (!alive) return
        setConn(st.state)
        setChats(cs)
        setServerOff(false)
      } catch {
        if (alive) setServerOff(true)
      }
    }
    tick()
    const iv = setInterval(tick, 5000)
    return () => {
      alive = false
      clearInterval(iv)
    }
  }, [])

  // poll: mensagens da conversa selecionada
  useEffect(() => {
    if (!selectedId) {
      setMessages([])
      return
    }
    let alive = true
    async function tick() {
      try {
        const r = await waServer.messages(selectedId!)
        if (!alive) return
        setMessages(r.messages || [])
        setSelectedName(r.name)
      } catch {}
    }
    tick()
    const iv = setInterval(tick, 3000)
    return () => {
      alive = false
      clearInterval(iv)
    }
  }, [selectedId])

  // rola para a última mensagem APENAS quando chega mensagem nova
  // (evita o scroll automático a cada poll bagunçar a leitura)
  const lastMsgIdRef = useRef<string | null>(null)
  useEffect(() => {
    const last = messages[messages.length - 1]?.id ?? null
    if (last && last !== lastMsgIdRef.current) {
      lastMsgIdRef.current = last
      msgEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])
  useEffect(() => {
    // ao trocar de conversa, reseta — a próxima leva rola
    lastMsgIdRef.current = null
  }, [selectedId])

  // ?filter=unanswered → ativa o filtro / ?chat=jid → abre a conversa
  const sp = useSearchParams()
  useEffect(() => {
    if (sp.get('filter') === 'unanswered') setChatFilter('unanswered')
    const c = sp.get('chat')
    if (c) setSelectedId(c)
  }, [sp])

  async function refreshMessages() {
    if (!selectedId) return
    try {
      const r = await waServer.messages(selectedId)
      setMessages(r.messages || [])
    } catch {}
  }

  async function reloadChats() {
    try {
      const cs = await waServer.chats()
      setChats(cs)
    } catch {}
  }

  async function handleSetChatStatus(id: string, status: string) {
    setChats((cs) => cs.map((c) => (c.id === id ? { ...c, status } : c)))
    try {
      await waServer.updateChat(id, { status })
    } catch {}
    reloadChats()
  }

  async function handleArchiveChat(id: string, archived: boolean) {
    setChats((cs) => cs.map((c) => (c.id === id ? { ...c, archived } : c)))
    try {
      await waServer.updateChat(id, { archived })
    } catch {}
    reloadChats()
    if (archived && id === selectedId) setSelectedId(null)
  }

  async function handleSend() {
    const text = draft.trim()
    if (!text || !selectedId || sending) return
    setSending(true)
    setDraft('')
    try {
      const r = await waServer.sendText(selectedId, text)
      if (!r.ok) {
        setDraft(text)
        alert('Erro ao enviar: ' + (r.error || 'desconhecido'))
      } else {
        const m = await waServer.messages(selectedId)
        setMessages(m.messages || [])
      }
    } catch {
      setDraft(text)
      alert('Não foi possível falar com o servidor do WhatsApp.')
    } finally {
      setSending(false)
    }
  }

  const unansweredCount = chats.filter(
    (c) => !c.archived && !c.isGroup && !c.fromMeLast
  ).length
  const archivedCount = chats.filter((c) => c.archived).length
  const groupsCount = chats.filter((c) => !c.archived && c.isGroup).length

  // todas as tags com contagem (entre conversas não-arquivadas)
  const allTags: [string, number][] = (() => {
    const m = new Map<string, number>()
    for (const c of chats) {
      if (c.archived) continue
      for (const t of c.tags || []) m.set(t, (m.get(t) || 0) + 1)
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  })()

  const filtered = chats.filter((c) => {
    if (search.trim() && !c.name.toLowerCase().includes(search.toLowerCase())) return false
    if (tagFilter && !(c.tags || []).includes(tagFilter)) return false
    if (chatFilter === 'archived') return !!c.archived
    if (c.archived) return false
    if (chatFilter === 'groups') return c.isGroup
    if (chatFilter === 'unanswered' && (c.isGroup || c.fromMeLast)) return false
    return true
  })

  const currentChat = chats.find((c) => c.id === selectedId)

  const firstFilteredId = filtered[0]?.id || null
  useEffect(() => {
    if (chatFilter === 'unanswered' && !selectedId && firstFilteredId) {
      setSelectedId(firstFilteredId)
    }
  }, [chatFilter, firstFilteredId, selectedId])

  return (
    <div className="flex-1 min-h-0 flex flex-col" style={{ background: T.card }}>
      {serverOff && (
        <div
          className="px-6 py-2 text-[12px] font-semibold flex-shrink-0"
          style={{
            background: '#FEF2F2',
            borderBottom: '1px solid #FCA5A5',
            color: '#B91C1C',
          }}
        >
          Servidor do WhatsApp offline. Rode <code>npm start</code> em{' '}
          <code>wa-server</code>.
        </div>
      )}
      {conn !== 'open' && !serverOff && (
        <div
          className="px-6 py-2 text-[12px] font-semibold flex-shrink-0"
          style={{
            background: '#FEF9E7',
            borderBottom: '1px solid #FDE68A',
            color: '#92400E',
          }}
        >
          WhatsApp: {conn === 'qr' ? 'aguardando QR' : 'reconectando…'}
        </div>
      )}

      <div className="flex-1 min-h-0 flex">
        {/* ── lista de conversas ── */}
        {listOpen && (
        <div
          className="w-[340px] flex-shrink-0 flex flex-col"
          style={{ borderRight: `1px solid ${T.border}`, background: T.card }}
        >
          <div className="p-4 flex-shrink-0">
            <p
              className="text-[10px] font-bold uppercase tracking-[0.18em] mb-3"
              style={{ color: T.textDim }}
            >
              Conversas
            </p>
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{
                background: T.bgSubtle,
                border: `1px solid ${T.border}`,
              }}
            >
              <Search size={14} style={{ color: T.textDim }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar conversa"
                className="flex-1 bg-transparent text-[13px] outline-none"
                style={{ color: T.textPrimary }}
              />
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {(
                [
                  { id: 'all', label: 'Ativas' },
                  {
                    id: 'unanswered',
                    label: `Sem resposta${unansweredCount ? ` · ${unansweredCount}` : ''}`,
                  },
                  {
                    id: 'groups',
                    label: `Grupos${groupsCount ? ` · ${groupsCount}` : ''}`,
                  },
                  {
                    id: 'archived',
                    label: `Arquivadas${archivedCount ? ` · ${archivedCount}` : ''}`,
                  },
                ] as const
              ).map((f) => {
                const active = chatFilter === f.id
                return (
                  <button
                    key={f.id}
                    onClick={() => setChatFilter(f.id)}
                    className="py-1.5 px-3 rounded-full text-[11px] font-bold transition-colors"
                    style={{
                      background: active ? T.accent : T.bgSubtle,
                      color: active ? T.accentBright : T.textMuted,
                      border: `1px solid ${active ? T.accent : T.border}`,
                    }}
                  >
                    {f.label}
                  </button>
                )
              })}

              {/* Dropdown de Etiquetas */}
              <div className="relative">
                <button
                  onClick={() => setTagMenuOpen((o) => !o)}
                  className="py-1.5 px-3 rounded-full text-[11px] font-bold transition-colors flex items-center gap-1"
                  style={{
                    background: tagFilter ? T.accent : T.bgSubtle,
                    color: tagFilter ? T.accentBright : T.textMuted,
                    border: `1px solid ${tagFilter ? T.accent : T.border}`,
                  }}
                >
                  <Tag size={10} />
                  {tagFilter || 'Etiquetas'}
                </button>
                {tagMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      onClick={() => setTagMenuOpen(false)}
                    />
                    <div
                      className="absolute z-40 top-full mt-1.5 left-0 w-56 rounded-xl py-1 max-h-72 overflow-y-auto thin-scroll"
                      style={{
                        background: '#FFFFFF',
                        border: `1px solid ${T.border}`,
                        boxShadow: '0 12px 32px rgba(0,0,0,0.12)',
                      }}
                    >
                      {tagFilter && (
                        <button
                          onClick={() => {
                            setTagFilter(null)
                            setTagMenuOpen(false)
                          }}
                          className="w-full text-left px-3 py-2 text-[11px] font-bold flex items-center gap-2"
                          style={{
                            color: T.accent,
                            borderBottom: `1px solid ${T.borderSubtle}`,
                          }}
                        >
                          <X size={11} />
                          Limpar filtro
                        </button>
                      )}
                      {allTags.length === 0 ? (
                        <p className="text-[11px] text-[#A8B5B0] text-center py-4 px-3">
                          Sem etiquetas ainda. Adicione em &quot;Detalhes&quot;.
                        </p>
                      ) : (
                        allTags.map(([t, n]) => {
                          const isActive = tagFilter === t
                          return (
                            <button
                              key={t}
                              onClick={() => {
                                setTagFilter(t)
                                setTagMenuOpen(false)
                              }}
                              className="w-full text-left px-3 py-2 flex items-center justify-between hover:bg-[#FAFAF8] transition-colors"
                              style={{
                                background: isActive ? '#FAFAF8' : 'transparent',
                              }}
                            >
                              <span
                                className="text-[10px] font-bold uppercase tracking-[0.05em] px-2 py-0.5 rounded-full"
                                style={{
                                  background: '#EFF6FF',
                                  color: '#1E40AF',
                                  border: '1px solid #BFDBFE',
                                }}
                              >
                                {t}
                              </span>
                              <span className="text-[10px] text-[#A8B5B0] font-semibold">
                                {n}
                              </span>
                            </button>
                          )
                        })
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto thin-scroll">
            {filtered.length === 0 ? (
              <p
                className="text-[12px] text-center px-4 py-8"
                style={{ color: T.textDim }}
              >
                {chats.length === 0
                  ? 'Sincronizando conversas…'
                  : chatFilter === 'unanswered'
                  ? 'Tudo respondido ✨'
                  : 'Nada encontrado.'}
              </p>
            ) : (
              filtered.map((c) => (
                <ChatRow
                  key={c.id}
                  chat={c}
                  active={c.id === selectedId}
                  onClick={() => setSelectedId(c.id)}
                  onSetStatus={(s) => handleSetChatStatus(c.id, s)}
                  onArchive={() => handleArchiveChat(c.id, !c.archived)}
                />
              ))
            )}
          </div>

          <div
            className="px-4 py-2.5 text-[10px] flex-shrink-0 flex items-center justify-between"
            style={{ borderTop: `1px solid ${T.borderSubtle}`, color: T.textDim }}
          >
            <span>
              {chats.length} conversa{chats.length !== 1 ? 's' : ''}
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: conn === 'open' ? T.green : '#EF4444',
                }}
              />
              {conn === 'open' ? 'online' : conn}
            </span>
          </div>
        </div>
        )}

        {/* ── conversa ── */}
        <div
          className="flex-1 min-w-0 flex flex-col relative"
          style={{ background: T.conversationBg }}
        >
          {!selectedId ? (
            <div className="flex-1 flex items-center justify-center flex-col gap-3 px-6 text-center relative">
              {!listOpen && (
                <button
                  onClick={() => setListOpen(true)}
                  title="Mostrar conversas"
                  className="absolute top-3 left-3 w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[#F4F3EF]"
                  style={{ color: T.textMuted, background: '#FFFFFF', border: `1px solid ${T.border}` }}
                >
                  <PanelLeftOpen size={16} />
                </button>
              )}
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{
                  background: '#FFFFFF',
                  border: `1px solid ${T.border}`,
                }}
              >
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={T.textDim}
                  strokeWidth="1.5"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <p
                className="text-[13px]"
                style={{ color: T.textMuted, maxWidth: 280 }}
              >
                Selecione uma conversa à esquerda para começar a responder.
              </p>
            </div>
          ) : (
            <>
              {/* header da conversa */}
              <div
                className="px-5 py-3 flex items-center gap-3 flex-shrink-0"
                style={{
                  background: T.card,
                  borderBottom: `1px solid ${T.border}`,
                }}
              >
                <button
                  onClick={() => setListOpen((o) => !o)}
                  title={listOpen ? 'Ocultar conversas' : 'Mostrar conversas'}
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors hover:bg-[#F4F3EF]"
                  style={{ color: T.textMuted }}
                >
                  {listOpen ? (
                    <PanelLeftClose size={16} />
                  ) : (
                    <PanelLeftOpen size={16} />
                  )}
                </button>
                <Avatar
                  chatId={selectedId}
                  name={selectedName}
                  isGroup={selectedId.endsWith('@g.us')}
                  size={38}
                  active
                />
                <div className="min-w-0">
                  <p
                    className="text-[14px] font-bold truncate"
                    style={{ color: T.textPrimary }}
                  >
                    {selectedName}
                  </p>
                  <p className="text-[10px]" style={{ color: T.textDim }}>
                    {selectedId.endsWith('@g.us') ? 'Grupo' : 'Contato'}
                  </p>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  {currentChat && (
                    <button
                      onClick={async () => {
                        const wasArchived = currentChat.archived
                        await waServer.updateChat(selectedId, {
                          archived: !wasArchived,
                        })
                        await reloadChats()
                        if (!wasArchived) setSelectedId(null)
                      }}
                      title={currentChat.archived ? 'Desarquivar' : 'Arquivar conversa'}
                      className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[#F4F3EF]"
                      style={{ color: T.textMuted }}
                    >
                      {currentChat.archived ? (
                        <ArchiveRestore size={14} />
                      ) : (
                        <Archive size={14} />
                      )}
                    </button>
                  )}
                  <button
                    onClick={() => setShowProposals((v) => !v)}
                    className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors"
                    style={{
                      background: showProposals ? T.accent : T.bgSubtle,
                      color: showProposals ? T.accentBright : T.textPrimary,
                      border: `1px solid ${
                        showProposals ? T.accent : T.border
                      }`,
                    }}
                  >
                    <FileText size={12} />
                    Proposta
                  </button>
                  <button
                    onClick={() => {
                      setShowModels((v) => {
                        const next = !v
                        if (next) setShowDetails(false)
                        return next
                      })
                    }}
                    className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors"
                    style={{
                      background: showModels ? T.accent : T.bgSubtle,
                      color: showModels ? T.accentBright : T.textPrimary,
                      border: `1px solid ${showModels ? T.accent : T.border}`,
                    }}
                  >
                    <Zap size={12} />
                    Modelos
                  </button>
                  <button
                    onClick={() => {
                      setShowDetails((v) => {
                        const next = !v
                        if (next) setShowModels(false)
                        return next
                      })
                    }}
                    className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors"
                    style={{
                      background: showDetails ? T.accent : T.bgSubtle,
                      color: showDetails ? T.accentBright : T.textPrimary,
                      border: `1px solid ${showDetails ? T.accent : T.border}`,
                    }}
                  >
                    <Info size={12} />
                    Detalhes
                  </button>
                </div>
              </div>

              {/* mensagens */}
              <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 flex flex-col gap-2">
                {messages.length === 0 ? (
                  <p
                    className="text-[12px] text-center py-8"
                    style={{ color: T.textDim }}
                  >
                    Sem mensagens nesta conversa.
                  </p>
                ) : (
                  messages.map((m) => (
                    <Bubble key={m.id} msg={m} chatId={selectedId} />
                  ))
                )}
                <div ref={msgEndRef} />
              </div>

              {/* composer */}
              <div
                className="px-4 py-3 flex items-center gap-2 flex-shrink-0"
                style={{
                  background: T.card,
                  borderTop: `1px solid ${T.border}`,
                }}
              >
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSend()
                    }
                  }}
                  placeholder="Escreva uma mensagem…"
                  disabled={conn !== 'open'}
                  className="flex-1 px-4 py-2.5 rounded-xl text-[13px] outline-none"
                  style={{
                    background: T.bgSubtle,
                    border: `1px solid ${T.border}`,
                    color: T.textPrimary,
                  }}
                />
                <button
                  onClick={handleSend}
                  disabled={sending || !draft.trim() || conn !== 'open'}
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-30"
                  style={{ background: T.accent, color: T.accentBright }}
                >
                  <Send size={16} />
                </button>
              </div>

              {showProposals && (
                <ProposalPicker
                  chatId={selectedId}
                  onClose={() => setShowProposals(false)}
                  onSent={refreshMessages}
                />
              )}
            </>
          )}
        </div>

        {showModels && selectedId && (
          <ModelsPanel
            chatId={selectedId}
            onClose={() => setShowModels(false)}
            onSent={refreshMessages}
          />
        )}
        {showDetails && selectedId && currentChat && (
          <LeadDetailsPanel
            chat={currentChat}
            onClose={() => setShowDetails(false)}
            onUpdated={reloadChats}
          />
        )}
      </div>
    </div>
  )
}
