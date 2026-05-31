'use client'

import { useEffect, useMemo, useRef, useState, memo } from 'react'
import { waServer, WaChat, WaMessage, STATUS_META } from '@/lib/waServer'
import { Search, Send, Users, Zap, FileText, PanelLeftClose, PanelLeftOpen, Info, Archive, ArchiveRestore, Tag, X, ChevronDown, ArrowDown, Copy, Check } from 'lucide-react'
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
  // WhatsApp Web exato — fundo beige da área de mensagens
  conversationBg: '#EFEAE2',
  accent: '#0D3839',
  accentBright: '#F4F99D',
  green: '#22C55E',
}

// Padrão sutil estilo doodle do WhatsApp Web (dots minúsculos em SVG inline,
// data URL pra não precisar de fetch). Aplicado em background-image junto
// com conversationBg.
const WA_PATTERN = `url("data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56"><circle cx="2" cy="2" r="1" fill="%23000" fill-opacity="0.04"/><circle cx="29" cy="29" r="0.7" fill="%23000" fill-opacity="0.03"/><circle cx="48" cy="14" r="0.6" fill="%23000" fill-opacity="0.025"/><circle cx="14" cy="48" r="0.8" fill="%23000" fill-opacity="0.035"/></svg>'
)}")`

/* ── helpers ─────────────────────────────────────────── */

function fmtTime(t: number) {
  if (!t) return ''
  const d = new Date(t * 1000)
  const sameDay = d.toDateString() === new Date().toDateString()
  return sameDay
    ? d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

/** Chave de "dia" pra agrupar mensagens (YYYY-MM-DD local). */
function dayKey(t: number) {
  if (!t) return ''
  const d = new Date(t * 1000)
  return d.toDateString()
}

/** Label do dia pra separador: "Hoje", "Ontem" ou data por extenso. */
function dayLabel(t: number) {
  const d = new Date(t * 1000)
  const today = new Date()
  const ydy = new Date()
  ydy.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Hoje'
  if (d.toDateString() === ydy.toDateString()) return 'Ontem'
  const sameYear = d.getFullYear() === today.getFullYear()
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    ...(sameYear ? {} : { year: 'numeric' }),
  })
}

function DaySeparator({ timestamp }: { timestamp: number }) {
  return (
    <div className="flex justify-center my-3">
      <span
        className="text-[10px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full"
        style={{
          background: 'rgba(13,56,57,0.06)',
          color: '#6B8585',
        }}
      >
        {dayLabel(timestamp)}
      </span>
    </div>
  )
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?'
}

/* ── avatar ──────────────────────────────────────────── */

const Avatar = memo(_Avatar)
function _Avatar({
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
          src={waServer.photoUrl(chatId, bust || undefined)}
          alt=""
          loading="lazy"
          decoding="async"
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

const ChatRow = memo(_ChatRow)
function _ChatRow({
  chat,
  active,
  onClick,
  onSetStatus,
  onArchive,
  onIgnore,
  matchSnippet,
}: {
  chat: WaChat
  active: boolean
  onClick: () => void
  onSetStatus: (status: string) => void
  onArchive: () => void
  onIgnore: () => void
  matchSnippet?: string
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
          <span
            className="text-[12px] truncate"
            style={{
              color: matchSnippet ? T.textPrimary : T.textMuted,
              fontStyle: matchSnippet ? 'italic' : 'normal',
            }}
            title={matchSnippet || undefined}
          >
            {matchSnippet ? (
              <>
                <Search
                  size={9}
                  className="inline mr-1 -mt-0.5"
                  style={{ color: T.accent }}
                />
                {matchSnippet}
              </>
            ) : (
              <>
                {chat.fromMeLast && (
                  <span style={{ color: T.textDim }}>Você: </span>
                )}
                {chat.lastText || '—'}
              </>
            )}
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
                        onIgnore()
                        setMenuOpen(false)
                      }}
                      className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-[#FAFAF8] transition-colors text-[12px] text-[#6B8585]"
                      title='Tira essa conversa do filtro "Sem resposta" sem precisar responder'
                    >
                      <span className="text-[11px]">🔕</span>
                      {chat.ignored ? 'Não ignorar mais' : 'Ignorar (sair de Sem resposta)'}
                    </button>
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

const Bubble = memo(_Bubble)
function _Bubble({ msg, chatId }: { msg: WaMessage; chatId: string }) {
  const mine = msg.fromMe
  const isAudio = msg.type === 'audio' && msg.hasMedia
  const isImage = msg.type === 'imagem' && msg.hasMedia
  const isVideo = msg.type === 'video' && msg.hasMedia
  const isDocument = msg.type === 'documento' && msg.hasMedia
  const isMedia = isAudio || isImage || isVideo || isDocument
  const caption = msg.meta?.caption || ''
  const [copied, setCopied] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)
  // copiável: texto puro OU caption de mídia
  const copyable = msg.text || caption
  const canCopy = !isAudio && !!copyable && copyable !== '[mensagem]'

  async function copyText() {
    try {
      await navigator.clipboard.writeText(copyable)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {}
  }

  function fmtBytes(n: number) {
    if (!n) return ''
    if (n < 1024) return `${n} B`
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
    return `${(n / 1024 / 1024).toFixed(1)} MB`
  }

  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'} group`}>
      <div
        className="relative max-w-[72%] rounded-2xl overflow-hidden"
        style={{
          background: mine ? T.accent : '#FFFFFF',
          color: mine ? '#FFFFFF' : T.textPrimary,
          border: mine ? 'none' : `1px solid ${T.border}`,
          borderBottomRightRadius: mine ? 4 : 16,
          borderBottomLeftRadius: mine ? 16 : 4,
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
        }}
      >
        {canCopy && (
          <button
            onClick={copyText}
            title={copied ? 'Copiado!' : 'Copiar texto'}
            className="absolute top-1 right-1 z-10 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{
              background: '#FFFFFF',
              border: `1px solid ${T.border}`,
              color: copied ? '#22C55E' : T.textDim,
              boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
            }}
          >
            {copied ? <Check size={11} /> : <Copy size={11} />}
          </button>
        )}

        {/* Mensagem citada (quoted/reply) */}
        {msg.quoted && (
          <div
            className="m-2 mb-0 px-2.5 py-1.5 rounded-lg text-[11px] border-l-2"
            style={{
              background: mine ? 'rgba(255,255,255,0.08)' : '#FAFAF8',
              borderColor: mine ? '#F4F99D' : T.accent,
              color: mine ? 'rgba(255,255,255,0.85)' : T.textMuted,
            }}
          >
            <span
              className="font-semibold block leading-tight"
              style={{ color: mine ? '#F4F99D' : T.accent, fontSize: 10 }}
            >
              {msg.quoted.fromMe ? 'Você' : msg.quoted.sender || 'Citação'}
            </span>
            <span className="block truncate leading-snug">
              {msg.quoted.text || (msg.quoted.type === 'imagem' ? '🖼️ Imagem' : msg.quoted.type === 'audio' ? '🎙️ Áudio' : '[mensagem]')}
            </span>
          </div>
        )}

        {/* Conteúdo principal */}
        {isImage ? (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={waServer.mediaUrl(chatId, msg.id)}
              alt={caption || 'imagem'}
              loading="lazy"
              decoding="async"
              onLoad={() => setImgLoaded(true)}
              className="block w-full max-w-[320px] cursor-zoom-in transition-opacity"
              style={{
                maxHeight: 320,
                objectFit: 'cover',
                background: '#F4F3EF',
                minHeight: imgLoaded ? undefined : 160,
                opacity: imgLoaded ? 1 : 0.4,
              }}
              onClick={() => window.open(waServer.mediaUrl(chatId, msg.id), '_blank')}
            />
            {caption && (
              <p className="px-3 pt-2 text-[13px] leading-snug whitespace-pre-wrap break-words">
                {renderText(caption, mine)}
              </p>
            )}
          </div>
        ) : isVideo ? (
          <div>
            <video
              controls
              preload="metadata"
              src={waServer.mediaUrl(chatId, msg.id)}
              className="block w-full max-w-[320px]"
              style={{ maxHeight: 320, background: '#000' }}
            />
            {caption && (
              <p className="px-3 pt-2 text-[13px] leading-snug whitespace-pre-wrap break-words">
                {renderText(caption, mine)}
              </p>
            )}
          </div>
        ) : isDocument ? (
          <a
            href={waServer.mediaUrl(chatId, msg.id)}
            target="_blank"
            rel="noopener"
            download={msg.meta?.fileName || 'arquivo'}
            className="m-2 mb-0 px-3 py-2.5 rounded-lg flex items-center gap-3 transition-opacity hover:opacity-80"
            style={{
              background: mine ? 'rgba(255,255,255,0.10)' : '#FAFAF8',
              border: `1px solid ${mine ? 'rgba(255,255,255,0.15)' : T.border}`,
            }}
          >
            <span className="text-[20px]">📎</span>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold truncate" style={{ color: mine ? '#FFF' : T.textPrimary }}>
                {msg.meta?.fileName || 'arquivo'}
              </p>
              <p className="text-[10px]" style={{ color: mine ? 'rgba(255,255,255,0.6)' : T.textDim }}>
                {fmtBytes(msg.meta?.fileLength || 0)} · clique pra baixar
              </p>
            </div>
          </a>
        ) : isAudio ? (
          <div className="px-3 py-2">
            <audio
              controls
              preload="none"
              src={waServer.mediaUrl(chatId, msg.id)}
              style={{ height: 36, maxWidth: 240, display: 'block' }}
            />
          </div>
        ) : (
          <p className="px-3.5 py-2 text-[13px] leading-snug whitespace-pre-wrap break-words">
            {renderText(msg.text, mine)}
          </p>
        )}
        <div
          className="px-3 pb-1.5 text-[10px] mt-1 flex items-center justify-end gap-1 cursor-help"
          style={{ color: mine ? 'rgba(255,255,255,0.55)' : T.textDim }}
          title={
            msg.time
              ? new Date(msg.time * 1000).toLocaleString('pt-BR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : ''
          }
        >
          <span>{fmtTime(msg.time)}</span>
          {mine && msg.status != null && msg.status >= 2 && (
            <span
              style={{
                // 4/5 = lida/tocada → azul; 3 = entregue ✓✓; 2 = enviada ✓
                color:
                  msg.status >= 4
                    ? '#60A5FA'
                    : 'rgba(255,255,255,0.55)',
                fontWeight: 700,
                letterSpacing: '-2px',
              }}
              aria-label={
                msg.status >= 4 ? 'lida' : msg.status === 3 ? 'entregue' : 'enviada'
              }
            >
              {msg.status >= 3 ? '✓✓' : '✓'}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── main ────────────────────────────────────────────── */

export default function InboxView() {
  const [chats, setChats] = useState<WaChat[]>([])
  const [conn, setConn] = useState<string>('...')
  const [ingest, setIngest] = useState<{ ageS: number } | null>(null)
  const [serverOff, setServerOff] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedName, setSelectedName] = useState('')
  const [messages, setMessages] = useState<WaMessage[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)
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
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [showAddChat, setShowAddChat] = useState(false)
  const [addChatNumber, setAddChatNumber] = useState('')
  const [addChatName, setAddChatName] = useState('')
  const [addChatBusy, setAddChatBusy] = useState(false)
  const [addChatError, setAddChatError] = useState('')
  const [isAtBottom, setIsAtBottom] = useState(true)
  const [newCount, setNewCount] = useState(0)
  const [presence, setPresence] = useState<{ state: string; ts: number } | null>(null)
  const [searchHits, setSearchHits] = useState<Map<string, string>>(new Map())
  const msgEndRef = useRef<HTMLDivElement>(null)
  const msgScrollRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // busca server-side em mensagens (debounced)
  useEffect(() => {
    const q = search.trim()
    if (q.length < 2) {
      setSearchHits(new Map())
      return
    }
    const t = setTimeout(async () => {
      try {
        const hits = await waServer.searchMessages(q)
        setSearchHits(new Map(hits.map((h) => [h.chatId, h.snippet])))
      } catch {}
    }, 250)
    return () => clearTimeout(t)
  }, [search])

  // Atalhos de teclado (estilo Superhuman/Front):
  //  ⌘K        — focar busca
  //  Esc       — limpar busca / des-focar
  //  J / ↓     — próxima conversa
  //  K / ↑     — conversa anterior
  //  E         — arquivar/desarquivar conversa aberta
  //  R         — focar composer pra responder
  //  ?         — mostra/esconde overlay de atalhos
  const composerRef = useRef<HTMLTextAreaElement>(null)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  // ref atualizado a cada render — handler usa SEM stale closure
  const navStateRef = useRef<{
    filtered: WaChat[]
    selectedId: string | null
    currentChat: WaChat | undefined
  }>({ filtered: [], selectedId: null, currentChat: undefined })
  useEffect(() => {
    if (composerRef.current !== null) { /* só pra tipar o ref */ }
  })

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey
      // ignora se está digitando em input/textarea (exceto atalhos específicos)
      const active = document.activeElement as HTMLElement | null
      const isTyping =
        active &&
        (active.tagName === 'INPUT' ||
          active.tagName === 'TEXTAREA' ||
          active.isContentEditable)

      // ⌘K sempre funciona
      if (meta && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
        searchInputRef.current?.select()
        return
      }
      // Esc só na busca
      if (e.key === 'Escape') {
        if (shortcutsOpen) { setShortcutsOpen(false); return }
        if (active === searchInputRef.current) {
          setSearch('')
          searchInputRef.current?.blur()
        }
        return
      }
      // ? abre overlay de atalhos (mesmo digitando? sim, com Shift)
      if (e.key === '?' && !meta) {
        e.preventDefault()
        setShortcutsOpen((o) => !o)
        return
      }
      // Atalhos de navegação só quando NÃO está digitando
      if (isTyping) return

      const { filtered, selectedId, currentChat } = navStateRef.current
      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault()
        const idx = filtered.findIndex((c) => c.id === selectedId)
        const next = filtered[Math.min(filtered.length - 1, idx + 1)]
        if (next) setSelectedId(next.id)
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault()
        const idx = filtered.findIndex((c) => c.id === selectedId)
        const prev = filtered[Math.max(0, idx - 1)]
        if (prev) setSelectedId(prev.id)
      } else if (e.key === 'e') {
        if (currentChat) {
          e.preventDefault()
          handleArchiveChat(currentChat.id, !currentChat.archived)
        }
      } else if (e.key === 'r') {
        if (selectedId) {
          e.preventDefault()
          composerRef.current?.focus()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [shortcutsOpen])

  function handleMessagesScroll() {
    const el = msgScrollRef.current
    if (!el) return
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80
    setIsAtBottom(nearBottom)
    if (nearBottom) setNewCount(0)
  }

  function scrollMessagesToBottom() {
    msgEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    setNewCount(0)
  }

  // status + lista de conversas:
  //  - 1 fetch inicial pra hidratar
  //  - depois SSE manda 'changed'/'status' e a gente refaz só o que mudou
  //  - poll de 30s como fallback (se SSE cair sem onerror disparar)
  useEffect(() => {
    let alive = true
    async function loadAll() {
      try {
        const [st, cs] = await Promise.all([waServer.status(), waServer.chats()])
        if (!alive) return
        setConn(st.state)
        setIngest(st.ingest ? { ageS: st.ingest.ageS } : null)
        setChats(cs)
        setServerOff(false)
      } catch {
        if (alive) setServerOff(true)
      }
    }
    async function loadChats() {
      try {
        const cs = await waServer.chats()
        if (alive) {
          setChats(cs)
          setServerOff(false)
        }
      } catch {
        if (alive) setServerOff(true)
      }
    }
    loadAll()

    // SSE
    const es = new EventSource(waServer.eventsUrl())
    es.addEventListener('hello', (ev) => {
      try {
        const d = JSON.parse((ev as MessageEvent).data)
        setConn(d.state)
      } catch {}
    })
    es.addEventListener('status', (ev) => {
      try {
        const d = JSON.parse((ev as MessageEvent).data)
        setConn(d.state)
      } catch {}
    })
    // Debounce: rajada de SSE 'changed' (10 chats em 100ms) coalesce em
    // 1 fetch só. Antes, N eventos disparavam N requests paralelos e
    // a última a chegar ganhava — UI piscando com dados velhos.
    let debounceTimer: ReturnType<typeof setTimeout> | null = null
    let pendingMsgRefresh = false
    function flushChanged() {
      debounceTimer = null
      loadChats()
      if (pendingMsgRefresh) {
        pendingMsgRefresh = false
        refreshMessagesRef.current?.()
      }
    }
    es.addEventListener('changed', (ev) => {
      try {
        const d = JSON.parse((ev as MessageEvent).data) as {
          kind: string
          chats?: string[]
        }
        const sel = selectedIdRef.current
        if (sel && d.chats && d.chats.includes(sel)) {
          pendingMsgRefresh = true
        }
      } catch {}
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(flushChanged, 250)
    })
    es.addEventListener('presence', (ev) => {
      try {
        const d = JSON.parse((ev as MessageEvent).data) as {
          chatId: string
          state: string
          ts: number
        }
        if (d.chatId === selectedIdRef.current) {
          setPresenceRef.current?.({ state: d.state, ts: d.ts })
        }
      } catch {}
    })
    es.onerror = () => {
      // EventSource tenta reconectar automaticamente; só marca offline
      setServerOff(true)
    }

    // fallback poll de 30s pra cobrir o caso de SSE estar saudável
    // mas a gente perdeu um evento (raro)
    const iv = setInterval(loadChats, 30_000)
    // poll do status (leve) a cada 10s pra manter o indicador da
    // extensão (idade do último ingest) atualizado
    const ivStatus = setInterval(async () => {
      try {
        const st = await waServer.status()
        if (alive) {
          setConn(st.state)
          setIngest(st.ingest ? { ageS: st.ingest.ageS } : null)
        }
      } catch {}
    }, 10_000)
    return () => {
      alive = false
      es.close()
      clearInterval(iv)
      clearInterval(ivStatus)
      if (debounceTimer) clearTimeout(debounceTimer)
    }
  }, [])

  // ref pra SSE handler enxergar o selectedId atual sem capturar stale closure
  const selectedIdRef = useRef<string | null>(null)
  useEffect(() => {
    selectedIdRef.current = selectedId
  }, [selectedId])

  // mensagens: 1 fetch inicial + refetch sob demanda via SSE.
  // poll de 20s como fallback (era 3s).
  const refreshMessagesRef = useRef<() => void>(() => {})
  useEffect(() => {
    if (!selectedId) {
      setMessages([])
      setMessagesLoading(false)
      return
    }
    let alive = true
    // limpa imediato: ao trocar de chat, esconde mensagens do anterior
    // e mostra skeleton enquanto o fetch vem
    setMessages([])
    setMessagesLoading(true)
    async function tick() {
      try {
        const r = await waServer.messages(selectedId!)
        if (!alive) return
        setMessages(r.messages || [])
        setSelectedName(r.name)
      } catch {}
      finally {
        if (alive) setMessagesLoading(false)
      }
    }
    refreshMessagesRef.current = tick
    tick()
    const iv = setInterval(tick, 20_000)
    return () => {
      alive = false
      clearInterval(iv)
    }
  }, [selectedId])

  // presence da conversa selecionada (skip grupos).
  // 1 fetch inicial + updates via SSE 'presence'. Poll 30s de fallback.
  const setPresenceRef = useRef<(p: { state: string; ts: number } | null) => void>(() => {})
  useEffect(() => {
    setPresenceRef.current = setPresence
  }, [])
  useEffect(() => {
    if (!selectedId || selectedId.endsWith('@g.us')) {
      setPresence(null)
      return
    }
    let alive = true
    async function tick() {
      const p = await waServer.presence(selectedId!)
      if (alive) setPresence(p)
    }
    tick()
    const iv = setInterval(tick, 30_000)
    return () => {
      alive = false
      clearInterval(iv)
    }
  }, [selectedId])

  // rola para a última mensagem APENAS quando chega mensagem nova
  // E o usuário está perto do final. Se ele estiver lendo histórico
  // mais acima, não bagunça — em vez disso aparece o botão "↓ X novas".
  const lastMsgIdRef = useRef<string | null>(null)
  useEffect(() => {
    const last = messages[messages.length - 1]?.id ?? null
    if (last && last !== lastMsgIdRef.current) {
      const prevId = lastMsgIdRef.current
      lastMsgIdRef.current = last
      if (isAtBottom) {
        msgEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        setNewCount(0)
      } else {
        const idx = prevId ? messages.findIndex((m) => m.id === prevId) : -1
        const added = idx >= 0 ? messages.length - idx - 1 : 1
        if (added > 0) setNewCount((c) => c + added)
      }
    }
  }, [messages, isAtBottom])
  useEffect(() => {
    // ao trocar de conversa, reseta — a próxima leva rola
    lastMsgIdRef.current = null
    setNewCount(0)
    setIsAtBottom(true)
  }, [selectedId])

  // Quando uma conversa abre, dá um scroll instantâneo pro fim
  // (em vez de smooth) — o usuário não vê o histórico subindo.
  const initialScrollDoneRef = useRef<string | null>(null)
  useEffect(() => {
    if (!selectedId) return
    if (initialScrollDoneRef.current === selectedId) return
    if (messages.length === 0) return
    initialScrollDoneRef.current = selectedId
    requestAnimationFrame(() => {
      msgEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' })
    })
  }, [selectedId, messages.length])

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

  async function handleToggleIgnore(id: string, ignored: boolean) {
    setChats((cs) => cs.map((c) => (c.id === id ? { ...c, ignored } : c)))
    try {
      await waServer.updateChat(id, { ignored })
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
        // update otimista: marca a conversa como "respondida"
        // (fromMeLast=true) IMEDIATAMENTE, sem esperar SSE.
        // Antes ela ficava ainda no filtro "Sem resposta" alguns
        // segundos até o servidor empurrar o evento de atualização.
        setChats((cs) =>
          cs.map((c) =>
            c.id === selectedId
              ? {
                  ...c,
                  fromMeLast: true,
                  lastText: text,
                  lastTime: Math.floor(Date.now() / 1000),
                }
              : c
          )
        )
        const m = await waServer.messages(selectedId)
        setMessages(m.messages || [])
        // recarrega lista do servidor pra confirmar (caso outro
        // dispositivo tenha enviado algo ao mesmo tempo)
        reloadChats()
      }
    } catch {
      setDraft(text)
      alert('Não foi possível falar com o servidor do WhatsApp.')
    } finally {
      setSending(false)
    }
  }

  const unansweredCount = chats.filter(
    (c) => !c.archived && !c.isGroup && !c.fromMeLast && !c.ignored
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

  // Filtragem cara (1500+ chats × buscar dentro do nome × ler searchHits).
  // useMemo evita refazer em todo render do componente (que dispara em
  // qualquer keystroke do composer, toggle de painel etc.)
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return chats.filter((c) => {
      if (q) {
        const nameMatch = c.name.toLowerCase().includes(q)
        const msgMatch = searchHits.has(c.id)
        if (!nameMatch && !msgMatch) return false
      }
      if (tagFilter && !(c.tags || []).includes(tagFilter)) return false
      if (chatFilter === 'archived') return !!c.archived
      if (c.archived) return false
      if (chatFilter === 'groups') return c.isGroup
      if (chatFilter === 'unanswered' && (c.isGroup || c.fromMeLast || c.ignored)) return false
      return true
    })
  }, [chats, search, searchHits, tagFilter, chatFilter])

  const currentChat = useMemo(
    () => chats.find((c) => c.id === selectedId),
    [chats, selectedId]
  )

  // sincroniza ref pros atalhos de teclado lerem o estado atual sem stale closure
  useEffect(() => {
    navStateRef.current = { filtered, selectedId, currentChat }
  }, [filtered, selectedId, currentChat])

  const firstFilteredId = filtered[0]?.id || null
  useEffect(() => {
    if (chatFilter === 'unanswered' && !selectedId && firstFilteredId) {
      setSelectedId(firstFilteredId)
    }
  }, [chatFilter, firstFilteredId, selectedId])

  // Quando abre uma conversa com unread, marca como lida no Baileys
  // (limpa contador aqui E no seu celular). Pequeno delay pra não
  // disparar em troca rápida de chat (browse acidental).
  // CAPTURA selectedId no escopo do effect: se trocar de chat antes
  // do timeout, o cleanup cancela; mesmo se vazar, a chamada usa o
  // ID certo (não o atual). Também AbortController pra não confirmar
  // no Baileys se já mudamos de chat.
  useEffect(() => {
    if (!selectedId || !currentChat?.unread) return
    const idAtDispatch = selectedId
    const controller = new AbortController()
    const t = setTimeout(() => {
      if (controller.signal.aborted) return
      waServer.markRead(idAtDispatch).catch(() => {})
      setChats((cs) =>
        cs.map((c) => (c.id === idAtDispatch ? { ...c, unread: 0 } : c))
      )
    }, 800)
    return () => {
      clearTimeout(t)
      controller.abort()
    }
  }, [selectedId, currentChat?.unread])

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
          Servidor do WhatsApp offline. Verifique o container{' '}
          <code>wa-server</code> na VPS.
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
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <p
                  className="text-[10px] font-bold uppercase tracking-[0.18em]"
                  style={{ color: T.textDim }}
                >
                  Conversas
                </p>
                {ingest && (
                  <span
                    title={
                      ingest.ageS < 90
                        ? `Extensão Chrome ativa (último push há ${ingest.ageS}s)`
                        : `Extensão Chrome inativa — último push há ${
                            ingest.ageS < 60
                              ? ingest.ageS + 's'
                              : ingest.ageS < 3600
                              ? Math.round(ingest.ageS / 60) + 'min'
                              : Math.round(ingest.ageS / 3600) + 'h'
                          }. Abra web.whatsapp.com no Chrome com a extensão.`
                    }
                    className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                    style={{
                      background: ingest.ageS < 90 ? '#F0FDF4' : '#FEF3C7',
                      color: ingest.ageS < 90 ? '#15803D' : '#A16207',
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        background: ingest.ageS < 90 ? '#22C55E' : '#EAB308',
                      }}
                    />
                    {ingest.ageS < 90 ? 'EXT' : 'EXT ⚠'}
                  </span>
                )}
              </div>
              <button
                onClick={() => {
                  setAddChatNumber('')
                  setAddChatName('')
                  setAddChatError('')
                  setShowAddChat(true)
                }}
                title="Adicionar conversa que não veio no sync"
                className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md transition-colors hover:bg-[#F4F3EF]"
                style={{ color: T.textMuted }}
              >
                + Conversa
              </button>
            </div>
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{
                background: T.bgSubtle,
                border: `1px solid ${T.border}`,
              }}
            >
              <Search size={14} style={{ color: T.textDim }} />
              <input
                ref={searchInputRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar conversa ou mensagem"
                className="flex-1 bg-transparent text-[13px] outline-none"
                style={{ color: T.textPrimary }}
              />
              {search ? (
                <button
                  onClick={() => {
                    setSearch('')
                    searchInputRef.current?.focus()
                  }}
                  title="Limpar (Esc)"
                  className="rounded p-0.5 transition-colors hover:bg-black/5"
                  style={{ color: T.textDim }}
                >
                  <X size={14} />
                </button>
              ) : (
                <span
                  className="hidden md:inline text-[10px] font-mono px-1.5 py-0.5 rounded"
                  style={{
                    background: '#FFFFFF',
                    border: `1px solid ${T.border}`,
                    color: T.textDim,
                  }}
                  title="Atalho pra focar a busca"
                >
                  ⌘K
                </span>
              )}
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
              chats.length === 0 && !serverOff ? (
                // skeleton loader enquanto sincroniza
                <div className="px-4 py-3 flex flex-col gap-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 animate-pulse"
                      style={{ opacity: 1 - i * 0.12 }}
                    >
                      <div
                        className="rounded-full flex-shrink-0"
                        style={{ width: 42, height: 42, background: T.bgSubtle }}
                      />
                      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                        <div
                          className="h-3 rounded"
                          style={{ background: T.bgSubtle, width: `${50 + (i % 3) * 15}%` }}
                        />
                        <div
                          className="h-2.5 rounded"
                          style={{ background: T.bgSubtle, width: `${70 - (i % 2) * 20}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p
                  className="text-[12px] text-center px-4 py-8"
                  style={{ color: T.textDim }}
                >
                  {chatFilter === 'unanswered'
                    ? 'Tudo respondido ✨'
                    : 'Nada encontrado.'}
                </p>
              )
            ) : (
              filtered.map((c) => {
                const q = search.trim().toLowerCase()
                const nameHits = q && c.name.toLowerCase().includes(q)
                const snippet =
                  !nameHits && searchHits.has(c.id)
                    ? searchHits.get(c.id)
                    : undefined
                return (
                  <div
                    key={c.id}
                    // browser pula layout/paint de linhas fora do viewport.
                    // contain-intrinsic-size: altura estimada da linha pra
                    // o scroll-bar não pular quando linhas saem do view.
                    style={{
                      contentVisibility: 'auto',
                      containIntrinsicSize: '0 68px',
                    }}
                  >
                    <ChatRow
                      chat={c}
                      active={c.id === selectedId}
                      onClick={() => setSelectedId(c.id)}
                      onSetStatus={(s) => handleSetChatStatus(c.id, s)}
                      onArchive={() => handleArchiveChat(c.id, !c.archived)}
                      onIgnore={() => handleToggleIgnore(c.id, !c.ignored)}
                      matchSnippet={snippet}
                    />
                  </div>
                )
              })
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
          style={{
            background: T.conversationBg,
            backgroundImage: WA_PATTERN,
          }}
        >
          {!selectedId ? (
            <div className="flex-1 flex items-center justify-center flex-col gap-4 px-6 text-center relative">
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
              {/* logo Fysi grande, igual o estilo do login */}
              <div
                className="w-24 h-24 rounded-3xl flex items-center justify-center"
                style={{
                  background:
                    'radial-gradient(circle at 30% 25%, #F4F99D 0%, #C8E6E0 60%, #6BA89E 100%)',
                  boxShadow: '0 8px 32px rgba(13,56,57,0.15)',
                }}
              >
                <span
                  style={{
                    fontFamily: '"ivypresto-display", Georgia, serif',
                    fontStyle: 'italic',
                    fontWeight: 700,
                    fontSize: 52,
                    color: '#0D3839',
                    lineHeight: 1,
                  }}
                >
                  F
                </span>
              </div>
              <div className="mt-2 max-w-[360px]">
                <h2
                  className="leading-tight mb-2"
                  style={{
                    fontFamily: '"ivypresto-display", Georgia, serif',
                    fontStyle: 'italic',
                    fontWeight: 300,
                    fontSize: '1.8rem',
                    color: T.textPrimary,
                  }}
                >
                  Inbox Fysi
                </h2>
                <p className="text-[13px] leading-relaxed" style={{ color: T.textMuted }}>
                  Selecione uma conversa à esquerda para começar a responder, ou use{' '}
                  <kbd
                    className="px-1.5 py-0.5 text-[10px] font-mono rounded"
                    style={{
                      background: '#FFFFFF',
                      border: `1px solid ${T.border}`,
                      color: T.textPrimary,
                    }}
                  >
                    ⌘K
                  </kbd>
                  {' '}para buscar.
                </p>
              </div>
              <p className="text-[10px] mt-4 opacity-60" style={{ color: T.textDim }}>
                💬 Suas mensagens são criptografadas ponta-a-ponta pelo WhatsApp
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
                  {editingName ? (
                    <input
                      autoFocus
                      value={nameDraft}
                      onChange={(e) => setNameDraft(e.target.value)}
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter') {
                          const next = nameDraft.trim()
                          if (next && next !== selectedName) {
                            setSelectedName(next)
                            setChats((cs) =>
                              cs.map((c) =>
                                c.id === selectedId ? { ...c, name: next } : c
                              )
                            )
                            try {
                              // grava como `alias` (não `name`) — precedência max
                              // em chatDisplayName e sobrevive a sync do WhatsApp
                              await waServer.updateChat(selectedId, { alias: next })
                            } catch {}
                          }
                          setEditingName(false)
                        } else if (e.key === 'Escape') {
                          setEditingName(false)
                        }
                      }}
                      onBlur={() => setEditingName(false)}
                      className="text-[14px] font-bold w-full bg-transparent outline-none border-b"
                      style={{
                        color: T.textPrimary,
                        borderColor: T.accent,
                      }}
                    />
                  ) : (
                    <p
                      className="text-[14px] font-bold truncate cursor-pointer hover:opacity-70"
                      style={{ color: T.textPrimary }}
                      onClick={() => {
                        setNameDraft(selectedName)
                        setEditingName(true)
                      }}
                      title="Clique para renomear este contato"
                    >
                      {selectedName}
                    </p>
                  )}
                  <p className="text-[10px]" style={{ color: T.textDim }}>
                    {(() => {
                      if (selectedId.endsWith('@g.us')) {
                        return 'Grupo' + (!editingName ? ' · clique no nome pra renomear' : '')
                      }
                      // Não-grupo: tenta usar presence
                      const p = presence
                      if (p) {
                        const ageS = Date.now() / 1000 - p.ts
                        if (p.state === 'composing')
                          return <span style={{ color: T.accent, fontWeight: 600 }}>digitando…</span>
                        if (p.state === 'recording')
                          return <span style={{ color: T.accent, fontWeight: 600 }}>gravando áudio…</span>
                        if (p.state === 'available')
                          return <span style={{ color: '#22C55E', fontWeight: 600 }}>online</span>
                        if (p.state === 'unavailable' && ageS < 24 * 3600) {
                          const minutes = Math.round(ageS / 60)
                          if (minutes < 1) return 'visto agora'
                          if (minutes < 60) return `visto há ${minutes} min`
                          const hours = Math.round(minutes / 60)
                          return `visto há ${hours}h`
                        }
                      }
                      return 'Contato' + (!editingName ? ' · clique no nome pra renomear' : '')
                    })()}
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
              <div className="flex-1 min-h-0 relative">
                <div
                  ref={msgScrollRef}
                  onScroll={handleMessagesScroll}
                  className="absolute inset-0 overflow-y-auto px-6 py-5 flex flex-col gap-2"
                >
                  {messages.length === 0 ? (
                    messagesLoading ? (
                      // skeleton enquanto carrega — alterna bolha esq/dir
                      <div className="flex flex-col gap-3 py-4 animate-pulse">
                        {[64, 120, 80, 160, 100, 90].map((w, i) => (
                          <div
                            key={i}
                            className={`flex ${i % 2 ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className="rounded-2xl px-3.5 py-3"
                              style={{
                                background: i % 2 ? 'rgba(13,56,57,0.08)' : '#FFFFFF',
                                width: w,
                                height: 14 + (i % 3) * 4,
                                opacity: 1 - i * 0.1,
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p
                        className="text-[12px] text-center py-8"
                        style={{ color: T.textDim }}
                      >
                        Sem mensagens nesta conversa.
                      </p>
                    )
                  ) : (
                    (() => {
                      let lastDay = ''
                      return messages.map((m) => {
                        const day = dayKey(m.time)
                        const showSep = day !== lastDay
                        lastDay = day
                        return (
                          <div
                            key={m.id}
                            // browser pula paint pra bolhas fora do viewport.
                            // estimativa de altura ~ 60px (linha curta) — pra
                            // mensagens muito longas o browser ajusta sozinho.
                            style={{
                              contentVisibility: 'auto',
                              containIntrinsicSize: '0 60px',
                            }}
                          >
                            {showSep && <DaySeparator timestamp={m.time} />}
                            <Bubble msg={m} chatId={selectedId} />
                          </div>
                        )
                      })
                    })()
                  )}
                  <div ref={msgEndRef} />
                </div>
                {newCount > 0 && (
                  <button
                    onClick={scrollMessagesToBottom}
                    className="absolute bottom-3 right-4 flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full transition-all hover:scale-105 active:scale-95"
                    style={{
                      background: T.accent,
                      color: T.accentBright,
                      boxShadow: '0 6px 20px rgba(13,56,57,0.25)',
                    }}
                    title="Ir para as mensagens novas"
                  >
                    <ArrowDown size={12} />
                    {newCount} {newCount === 1 ? 'nova' : 'novas'}
                  </button>
                )}
              </div>

              {/* composer */}
              <div
                className="px-4 py-3 flex items-center gap-2 flex-shrink-0"
                style={{
                  background: T.card,
                  borderTop: `1px solid ${T.border}`,
                }}
              >
                <textarea
                  ref={composerRef}
                  value={draft}
                  rows={1}
                  onChange={(e) => setDraft(e.target.value)}
                  onInput={(e) => {
                    // auto-grow até maxHeight
                    const el = e.currentTarget
                    el.style.height = 'auto'
                    el.style.height = Math.min(el.scrollHeight, 140) + 'px'
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSend()
                      // reseta altura após envio
                      requestAnimationFrame(() => {
                        e.currentTarget.style.height = 'auto'
                      })
                    }
                    // Shift+Enter cai no comportamento default do textarea: nova linha
                  }}
                  placeholder="Escreva uma mensagem… (Shift+Enter pra quebrar linha)"
                  disabled={conn !== 'open'}
                  className="flex-1 px-4 py-2.5 rounded-xl text-[13px] outline-none resize-none thin-scroll"
                  style={{
                    background: T.bgSubtle,
                    border: `1px solid ${T.border}`,
                    color: T.textPrimary,
                    minHeight: 42,
                    maxHeight: 140,
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

      {/* Modal: + Conversa (adicionar contato manualmente) */}
      {/* Overlay de atalhos (pressione "?" pra abrir) */}
      {shortcutsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShortcutsOpen(false)}
        >
          <div
            className="w-[440px] max-w-[90vw] rounded-2xl p-6"
            onClick={(e) => e.stopPropagation()}
            style={{ background: T.card, border: `1px solid ${T.border}`, boxShadow: '0 24px 60px rgba(0,0,0,0.2)' }}
          >
            <h2 className="text-[16px] font-bold mb-4" style={{ color: T.textPrimary }}>
              Atalhos do teclado
            </h2>
            {[
              ['⌘K', 'Focar busca'],
              ['Esc', 'Limpar busca / fechar'],
              ['J  / ↓', 'Próxima conversa'],
              ['K  / ↑', 'Conversa anterior'],
              ['E', 'Arquivar / desarquivar'],
              ['R', 'Focar composer pra responder'],
              ['Enter', 'Enviar mensagem'],
              ['Shift+Enter', 'Quebrar linha'],
              ['?', 'Abrir/fechar este overlay'],
            ].map(([k, d]) => (
              <div key={k} className="flex items-center justify-between py-2" style={{ borderTop: `1px solid ${T.borderSubtle}` }}>
                <kbd
                  className="text-[11px] font-mono px-2 py-1 rounded"
                  style={{ background: T.bgSubtle, border: `1px solid ${T.border}`, color: T.textPrimary }}
                >
                  {k}
                </kbd>
                <span className="text-[12px]" style={{ color: T.textMuted }}>{d}</span>
              </div>
            ))}
            <p className="text-[11px] mt-4 text-center" style={{ color: T.textDim }}>
              Pressione <kbd className="font-mono">Esc</kbd> ou clique fora pra fechar
            </p>
          </div>
        </div>
      )}

      {showAddChat && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => !addChatBusy && setShowAddChat(false)}
        >
          <div
            className="w-[420px] max-w-[90vw] rounded-2xl p-6"
            onClick={(e) => e.stopPropagation()}
            style={{ background: T.card, border: `1px solid ${T.border}`, boxShadow: '0 24px 60px rgba(0,0,0,0.2)' }}
          >
            <h2 className="text-[16px] font-bold mb-1" style={{ color: T.textPrimary }}>
              Adicionar conversa
            </h2>
            <p className="text-[12px] mb-5" style={{ color: T.textMuted }}>
              Útil pra contatos que não vieram no sync inicial do WhatsApp.
            </p>

            <label className="block text-[10px] font-bold uppercase tracking-[0.12em] mb-1.5" style={{ color: T.textDim }}>
              Número com DDI
            </label>
            <input
              autoFocus
              value={addChatNumber}
              onChange={(e) => setAddChatNumber(e.target.value)}
              placeholder="5511999998888"
              disabled={addChatBusy}
              className="w-full px-3 py-2.5 rounded-lg text-[13px] outline-none mb-4"
              style={{ background: T.bgSubtle, border: `1px solid ${T.border}`, color: T.textPrimary }}
            />

            <label className="block text-[10px] font-bold uppercase tracking-[0.12em] mb-1.5" style={{ color: T.textDim }}>
              Nome (opcional)
            </label>
            <input
              value={addChatName}
              onChange={(e) => setAddChatName(e.target.value)}
              placeholder="Nome do contato"
              disabled={addChatBusy}
              className="w-full px-3 py-2.5 rounded-lg text-[13px] outline-none"
              style={{ background: T.bgSubtle, border: `1px solid ${T.border}`, color: T.textPrimary }}
            />

            {addChatError && (
              <p className="text-[12px] font-semibold mt-3 px-3 py-2 rounded-lg" style={{ background: '#FEF2F2', color: '#B91C1C' }}>
                {addChatError}
              </p>
            )}

            <div className="flex gap-2 justify-end mt-5">
              <button
                onClick={() => setShowAddChat(false)}
                disabled={addChatBusy}
                className="text-[12px] font-semibold px-4 py-2 rounded-lg transition-colors hover:bg-[#F4F3EF] disabled:opacity-50"
                style={{ color: T.textMuted }}
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  const n = addChatNumber.trim()
                  if (!n) {
                    setAddChatError('Digite o número.')
                    return
                  }
                  setAddChatBusy(true)
                  setAddChatError('')
                  const r = await waServer.addChat(n, addChatName.trim())
                  setAddChatBusy(false)
                  if (r.ok && r.jid) {
                    setShowAddChat(false)
                    await reloadChats()
                    setSelectedId(r.jid)
                  } else {
                    setAddChatError(r.error || 'Erro ao adicionar')
                  }
                }}
                disabled={addChatBusy}
                className="text-[12px] font-bold uppercase tracking-wider px-4 py-2 rounded-lg transition-all disabled:opacity-50"
                style={{ background: T.accent, color: T.accentBright }}
              >
                {addChatBusy ? 'Adicionando…' : 'Adicionar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
