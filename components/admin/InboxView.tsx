'use client'

import { useEffect, useRef, useState } from 'react'
import { waServer, WaChat, WaMessage } from '@/lib/waServer'
import { Search, Send, Users, Zap, FileText } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import ModelsPanel from './ModelsPanel'
import ProposalPicker from './ProposalPicker'

/* ── tokens ──────────────────────────────────────────── */

const T = {
  textPrimary: '#E6F1EE',
  textMuted: 'rgba(139,183,175,0.7)',
  textDim: 'rgba(139,183,175,0.45)',
  border: 'rgba(139,183,175,0.12)',
  glass: 'rgba(15,57,58,0.45)',
  glassDark: 'rgba(5,20,21,0.55)',
  accent: '#F4F99D',
  accentDark: '#0D3839',
  green: '#9DE9A8',
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

/* ── avatar com foto (fallback iniciais) ─────────────── */

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
  return (
    <div
      className="rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden font-bold"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.32),
        background: active
          ? 'linear-gradient(135deg, #6BA89E 0%, #0D3839 100%)'
          : 'rgba(139,183,175,0.12)',
        color: active ? '#F4F99D' : 'rgba(139,183,175,0.85)',
        border: active
          ? '1px solid rgba(244,249,157,0.3)'
          : '1px solid rgba(139,183,175,0.15)',
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
          src={waServer.photoUrl(chatId)}
          alt=""
          onError={() => setError(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      )}
    </div>
  )
}

/* ── transforma URLs em links clicáveis ──────────────── */

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
        style={{ color: mine ? '#FBFFCE' : '#9DE9A8' }}
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
}: {
  chat: WaChat
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="relative w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
      style={{
        background: active
          ? 'linear-gradient(90deg, rgba(244,249,157,0.07) 0%, transparent 80%)'
          : 'transparent',
      }}
      onMouseEnter={(e) => {
        if (!active)
          e.currentTarget.style.background = 'rgba(139,183,175,0.04)'
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = 'transparent'
      }}
    >
      {active && (
        <span
          className="absolute left-0 top-2 bottom-2 w-[2px] rounded-r-full"
          style={{
            background: T.accent,
            boxShadow: '0 0 10px rgba(244,249,157,0.5)',
          }}
        />
      )}
      <Avatar
        chatId={chat.id}
        name={chat.name}
        isGroup={chat.isGroup}
        size={42}
        active={active}
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
          {chat.unread > 0 && (
            <span
              className="text-[10px] font-bold rounded-full flex-shrink-0 flex items-center justify-center"
              style={{
                background: T.accent,
                color: T.accentDark,
                minWidth: 18,
                height: 18,
                padding: '0 5px',
              }}
            >
              {chat.unread}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

/* ── message bubble ──────────────────────────────────── */

function Bubble({ msg, chatId }: { msg: WaMessage; chatId: string }) {
  const mine = msg.fromMe
  const isAudio = msg.type === 'audio' && msg.hasMedia
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div
        className="max-w-[72%] px-3.5 py-2 rounded-2xl"
        style={{
          background: mine
            ? 'linear-gradient(135deg, #14595B 0%, #0D3839 100%)'
            : 'rgba(15,57,58,0.55)',
          color: T.textPrimary,
          border: mine
            ? '1px solid rgba(184,212,208,0.18)'
            : '1px solid rgba(139,183,175,0.13)',
          borderBottomRightRadius: mine ? 4 : 16,
          borderBottomLeftRadius: mine ? 16 : 4,
          boxShadow: mine ? '0 4px 12px rgba(0,0,0,0.18)' : 'none',
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
          style={{ color: mine ? 'rgba(230,241,238,0.5)' : T.textDim }}
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
  const [chatFilter, setChatFilter] = useState<'all' | 'unanswered'>('all')
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
      } catch {
        /* ignora — o poll de status já sinaliza servidor offline */
      }
    }
    tick()
    const iv = setInterval(tick, 3000)
    return () => {
      alive = false
      clearInterval(iv)
    }
  }, [selectedId])

  // rola para a última mensagem
  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ?filter=unanswered → ativa o filtro automaticamente
  const sp = useSearchParams()
  useEffect(() => {
    if (sp.get('filter') === 'unanswered') setChatFilter('unanswered')
  }, [sp])

  async function refreshMessages() {
    if (!selectedId) return
    try {
      const r = await waServer.messages(selectedId)
      setMessages(r.messages || [])
    } catch {
      /* o poll de status sinaliza servidor offline */
    }
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

  // "não respondida" = conversa individual cuja última mensagem é do contato
  const unansweredCount = chats.filter((c) => !c.isGroup && !c.fromMeLast).length
  const filtered = chats.filter((c) => {
    if (search.trim() && !c.name.toLowerCase().includes(search.toLowerCase())) return false
    if (chatFilter === 'unanswered' && (c.isGroup || c.fromMeLast)) return false
    return true
  })

  // ao filtrar não respondidas, abre automaticamente a mais recente
  const firstFilteredId = filtered[0]?.id || null
  useEffect(() => {
    if (chatFilter === 'unanswered' && !selectedId && firstFilteredId) {
      setSelectedId(firstFilteredId)
    }
  }, [chatFilter, firstFilteredId, selectedId])

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {serverOff && (
        <div
          className="px-6 py-2 text-[12px] font-semibold flex-shrink-0"
          style={{
            background: 'rgba(229,115,115,0.10)',
            borderBottom: '1px solid rgba(229,115,115,0.25)',
            color: '#FFC7BD',
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
            background: 'rgba(244,213,93,0.08)',
            borderBottom: '1px solid rgba(244,213,93,0.2)',
            color: '#F4D55D',
          }}
        >
          WhatsApp: {conn === 'qr' ? 'aguardando QR' : 'reconectando…'}
        </div>
      )}

      {/* corpo: lista + conversa */}
      <div className="flex-1 min-h-0 flex">
        {/* ── lista de conversas ── */}
        <div
          className="w-[340px] flex-shrink-0 flex flex-col"
          style={{
            background: T.glassDark,
            borderRight: `1px solid ${T.border}`,
            backdropFilter: 'blur(10px)',
          }}
        >
          {/* search + filter */}
          <div className="p-4 flex-shrink-0">
            <p
              className="text-[10px] font-bold uppercase tracking-[0.18em] mb-3"
              style={{ color: 'rgba(139,183,175,0.5)' }}
            >
              ◈ Conversas
            </p>
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{
                background: 'rgba(139,183,175,0.06)',
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
            <div className="flex gap-1.5 mt-2">
              {(
                [
                  { id: 'all', label: 'Todas' },
                  {
                    id: 'unanswered',
                    label: `Sem resposta${unansweredCount ? ` · ${unansweredCount}` : ''}`,
                  },
                ] as const
              ).map((f) => {
                const active = chatFilter === f.id
                return (
                  <button
                    key={f.id}
                    onClick={() => setChatFilter(f.id)}
                    className="flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-colors"
                    style={{
                      background: active ? T.accent : 'rgba(139,183,175,0.06)',
                      color: active ? T.accentDark : T.textMuted,
                      border: `1px solid ${active ? T.accent : T.border}`,
                    }}
                  >
                    {f.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto">
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
                />
              ))
            )}
          </div>

          <div
            className="px-4 py-2.5 text-[10px] flex-shrink-0 flex items-center justify-between"
            style={{ borderTop: `1px solid ${T.border}`, color: T.textDim }}
          >
            <span>
              {chats.length} conversa{chats.length !== 1 ? 's' : ''}
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: conn === 'open' ? T.green : '#E57373',
                  boxShadow: `0 0 6px ${conn === 'open' ? T.green : '#E57373'}88`,
                }}
              />
              {conn === 'open' ? 'online' : conn}
            </span>
          </div>
        </div>

        {/* ── conversa ── */}
        <div
          className="flex-1 min-w-0 flex flex-col relative"
          style={{
            background:
              'radial-gradient(ellipse at 50% 0%, rgba(15,57,58,0.35) 0%, transparent 60%)',
          }}
        >
          {!selectedId ? (
            <div className="flex-1 flex items-center justify-center flex-col gap-3 px-6 text-center">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{
                  background: 'rgba(139,183,175,0.05)',
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
                  background: T.glass,
                  borderBottom: `1px solid ${T.border}`,
                  backdropFilter: 'blur(8px)',
                }}
              >
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
                  <button
                    onClick={() => setShowProposals((v) => !v)}
                    className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors"
                    style={{
                      background: showProposals
                        ? T.accent
                        : 'rgba(139,183,175,0.08)',
                      color: showProposals ? T.accentDark : T.textPrimary,
                      border: `1px solid ${
                        showProposals ? T.accent : T.border
                      }`,
                    }}
                  >
                    <FileText size={12} />
                    Proposta
                  </button>
                  <button
                    onClick={() => setShowModels((v) => !v)}
                    className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors"
                    style={{
                      background: showModels
                        ? T.accent
                        : 'rgba(139,183,175,0.08)',
                      color: showModels ? T.accentDark : T.textPrimary,
                      border: `1px solid ${showModels ? T.accent : T.border}`,
                    }}
                  >
                    <Zap size={12} />
                    Modelos
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
                  background: T.glass,
                  borderTop: `1px solid ${T.border}`,
                  backdropFilter: 'blur(8px)',
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
                    background: 'rgba(139,183,175,0.06)',
                    border: `1px solid ${T.border}`,
                    color: T.textPrimary,
                  }}
                />
                <button
                  onClick={handleSend}
                  disabled={sending || !draft.trim() || conn !== 'open'}
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-30"
                  style={{
                    background: T.accent,
                    color: T.accentDark,
                    boxShadow:
                      sending || !draft.trim() || conn !== 'open'
                        ? 'none'
                        : '0 4px 16px rgba(244,249,157,0.25)',
                  }}
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
      </div>
    </div>
  )
}
