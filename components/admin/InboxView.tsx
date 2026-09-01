'use client'

import { useCallback, useEffect, useMemo, useRef, useState, memo } from 'react'
import { createPortal } from 'react-dom'
import { waServer, WaChat, WaMessage, WaSnippet, STATUS_META } from '@/lib/waServer'
import { Search, Send, Users, Zap, FileText, PanelLeftClose, PanelLeftOpen, Info, Archive, ArchiveRestore, Tag, X, ChevronDown, ArrowDown, Copy, Check, Paperclip, CornerUpLeft } from 'lucide-react'
import { LEAD_STATUSES } from '@/lib/waServer'
import { useSearchParams } from 'next/navigation'
import ModelsPanel from './ModelsPanel'
import ProposalPicker from './ProposalPicker'
import LeadDetailsPanel from './LeadDetailsPanel'

/* ── tokens ──────────────────────────────────────────── */

const T = {
  textPrimary: '#141414',
  textMuted: '#6E6E6E',
  textDim: '#9B9B9B',
  border: '#E6E6E1',
  borderSubtle: '#F0F0EC',
  card: '#FFFFFF',
  bgSubtle: '#FAFAF8',
  // WhatsApp Web exato — fundo beige da área de mensagens
  conversationBg: '#EFEAE2',
  accent: '#141414',
  accentBright: '#D6F23C',
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
          color: '#6E6E6E',
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

/* ── responsável (multi-atendimento) ─────────────────── */
// Quem é responsável pela conversa é guardado como uma etiqueta especial
// "resp:<nome>" — assim sincroniza entre a Karine e a Tainá sem precisar
// mexer no servidor. Essas etiquetas ficam ESCONDIDAS da lista de etiquetas
// normais (são tratadas só como "responsável").
const RESP_PREFIX = 'resp:'
const RESPONSAVEIS = ['Karine', 'Tainá']
const RESP_COLORS: Record<string, { bg: string; color: string }> = {
  Karine: { bg: '#E7EEF9', color: '#2456A6' },
  Tainá: { bg: '#F3E7F7', color: '#7A2FA0' },
}
function respMeta(nome: string) {
  return RESP_COLORS[nome] || { bg: '#EEF3E0', color: '#4A5A2A' }
}
function isRespTag(t: string) {
  return t.startsWith(RESP_PREFIX)
}
/** Nome do responsável de uma conversa (ou null se ninguém). */
function getResponsavel(chat: WaChat): string | null {
  const t = (chat.tags || []).find(isRespTag)
  return t ? t.slice(RESP_PREFIX.length) : null
}
/** Reconstrói o array de tags trocando/removendo o responsável. */
function tagsWithResponsavel(
  tags: string[] | undefined,
  nome: string | null,
): string[] {
  const base = (tags || []).filter((t) => !isRespTag(t))
  return nome ? [...base, RESP_PREFIX + nome] : base
}

/* ── segmentos (separar conversas) ───────────────────── */
// Além do funil (LEAD → FECHADO), a Karine separa as conversas em grupos:
// cliente ativo, alunos/curso e pessoal. Como o servidor só aceita as 8
// etapas fixas, isso é feito por etiqueta (uma só por conversa — mutuamente
// exclusivas entre si, sem mexer nas outras etiquetas).
const SEGMENTS = [
  { tag: 'cliente', label: 'Cliente ativo', short: 'Cliente', bg: '#DDF3E6', color: '#1B7A46' },
  { tag: 'alunos', label: 'Alunos / Curso', short: 'Curso', bg: '#FDECD3', color: '#B45309' },
  { tag: 'pessoal', label: 'Pessoal', short: 'Pessoal', bg: '#F1E6F8', color: '#7A2FA0' },
] as const
const SEGMENT_TAGS = SEGMENTS.map((s) => s.tag) as string[]
/** Categoria da conversa (ou null). */
function getSegment(chat: WaChat): (typeof SEGMENTS)[number] | null {
  const t = (chat.tags || []).find((x) => SEGMENT_TAGS.includes(x))
  return t ? SEGMENTS.find((s) => s.tag === t) || null : null
}
/** Troca/remove o segmento preservando as demais etiquetas. */
function tagsWithSegment(tags: string[] | undefined, tag: string | null): string[] {
  const base = (tags || []).filter((t) => !SEGMENT_TAGS.includes(t))
  return tag ? [...base, tag] : base
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
  const triesRef = useRef(0)
  // Se a foto falhou, tenta de novo algumas vezes (pode ter chegado depois),
  // MAS com limite. Antes tentava a cada 60s pra sempre — com milhares de
  // avatares isso virava um loop de requisições que estourava o limite do
  // servidor (erro 429) e derrubava as fotos de todo mundo. Agora para
  // depois de 3 tentativas.
  useEffect(() => {
    if (!error || triesRef.current >= 3) return
    const t = setTimeout(() => {
      triesRef.current += 1
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

/** Detecta texto que é, na verdade, base64 cru de uma mídia (bug legado da
 *  extensão wppconnect). Evita renderizar um wall of text de 50KB no chat. */
function looksLikeBase64(text: string): boolean {
  if (!text || text.length < 500) return false
  const head = text.slice(0, 200)
  if (head.startsWith('/9j/') || head.startsWith('iVBOR') || head.startsWith('JVBER') || head.startsWith('UklGR')) {
    return true
  }
  // Heurística genérica: tudo é a-z/A-Z/0-9/+/= e sem espaços nos primeiros 200 chars
  return /^[A-Za-z0-9+/=]+$/.test(head)
}

// Mensagens de "protocolo" do WhatsApp (messageContextInfo, template,
// senderKeyDistribution, etc.) chegam sem conteúdo pra mostrar e viravam
// balões vazios no meio da conversa. Detecta pra esconder.
// Regra: sem mídia E (texto vazio OU um placeholder "[algumTipo]").
function isNoiseMessage(msg: { text?: string; type?: string; hasMedia?: boolean }): boolean {
  if (msg.hasMedia) return false
  const t = (msg.text || '').trim()
  if (!t) return true
  if (msg.type === 'outro') return true
  // placeholder gerado pelo servidor: "[messageContextInfo]", "[template]"…
  if (/^\[[A-Za-z]+\]$/.test(t)) return true
  return false
}

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
  onSetSegment,
  matchSnippet,
}: {
  chat: WaChat
  active: boolean
  onClick: () => void
  onSetStatus: (status: string) => void
  onArchive: () => void
  onIgnore: () => void
  onSetSegment: (tag: string | null) => void
  matchSnippet?: string
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const statusBtnRef = useRef<HTMLButtonElement>(null)
  const [menuPos, setMenuPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null)
  const statusMeta = STATUS_META[chat.status] || STATUS_META.LEAD
  const resp = getResponsavel(chat)
  const segment = getSegment(chat)
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
            className="text-[13px] font-bold truncate flex items-center gap-1"
            style={{ color: T.textPrimary }}
          >
            {chat.pinned && (
              <span title="Fixada" style={{ fontSize: 10, opacity: 0.7 }}>📌</span>
            )}
            {resp && (
              <span
                title={`Responsável: ${resp}`}
                className="flex-shrink-0 text-[8px] font-bold rounded-full flex items-center justify-center"
                style={{
                  width: 15,
                  height: 15,
                  background: respMeta(resp).bg,
                  color: respMeta(resp).color,
                }}
              >
                {resp[0]?.toUpperCase()}
              </span>
            )}
            {segment && (
              <span
                title={segment.label}
                className="flex-shrink-0 text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full leading-none"
                style={{ background: segment.bg, color: segment.color }}
              >
                {segment.short}
              </span>
            )}
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
                {looksLikeBase64(chat.lastText)
                  ? '🖼️ Imagem'
                  : /^\[[A-Za-z]+\]$/.test((chat.lastText || '').trim())
                    ? '💬 Mensagem'
                    : (chat.lastText || '—')}
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
                ref={statusBtnRef}
                onClick={(e) => {
                  e.stopPropagation()
                  if (menuOpen) {
                    setMenuOpen(false)
                    return
                  }
                  const r = statusBtnRef.current?.getBoundingClientRect()
                  const menuH = 340
                  const up = !!r && r.bottom + menuH > window.innerHeight && r.top > menuH
                  setMenuPos({
                    top: up ? undefined : r ? r.bottom + 6 : 120,
                    bottom: up && r ? window.innerHeight - r.top + 6 : undefined,
                    right: r ? window.innerWidth - r.right : 16,
                  })
                  setMenuOpen(true)
                }}
                title="Ações da conversa"
                className="rounded p-0.5 transition-colors hover:bg-black/5"
                style={{ color: T.textDim }}
              >
                <ChevronDown size={14} />
              </button>
            ) : (
              <button
                ref={statusBtnRef}
                onClick={(e) => {
                  e.stopPropagation()
                  if (menuOpen) {
                    setMenuOpen(false)
                    return
                  }
                  // posição fixa ancorada no botão — o menu escapa da lista que
                  // rola (antes ficava cortado/por trás). Vira pra cima se não couber.
                  const r = statusBtnRef.current?.getBoundingClientRect()
                  const menuH = 340
                  const up = !!r && r.bottom + menuH > window.innerHeight && r.top > menuH
                  setMenuPos({
                    top: up ? undefined : r ? r.bottom + 6 : 120,
                    bottom: up && r ? window.innerHeight - r.top + 6 : undefined,
                    right: r ? window.innerWidth - r.right : 16,
                  })
                  setMenuOpen(true)
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
              {menuOpen && menuPos && createPortal(
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={(e) => {
                      e.stopPropagation()
                      setMenuOpen(false)
                    }}
                  />
                  <div
                    className="fixed z-50 w-56 max-h-[70vh] overflow-y-auto rounded-xl py-1"
                    style={{
                      top: menuPos.top,
                      bottom: menuPos.bottom,
                      right: menuPos.right,
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
                          <span className="ml-auto text-[10px] text-[#9B9B9B]">
                            atual
                          </span>
                        )}
                      </button>
                    ))}
                    <div
                      className="my-1"
                      style={{ borderTop: `1px solid ${T.borderSubtle}` }}
                    />
                    <p className="px-3 pt-1 pb-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: T.textDim }}>
                      Separar em
                    </p>
                    {SEGMENTS.map((s) => {
                      const on = (chat.tags || []).includes(s.tag)
                      return (
                        <button
                          key={s.tag}
                          onClick={(e) => {
                            e.stopPropagation()
                            // clicar no atual desmarca; senão troca pra ele
                            onSetSegment(on ? null : s.tag)
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
                          {on && (
                            <Check size={13} className="ml-auto" style={{ color: s.color }} />
                          )}
                        </button>
                      )
                    })}
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
                      className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-[#FAFAF8] transition-colors text-[12px] text-[#6E6E6E]"
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
                      className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-[#FAFAF8] transition-colors text-[12px] text-[#6E6E6E]"
                    >
                      <Archive size={11} />
                      {chat.archived ? 'Desarquivar' : 'Arquivar conversa'}
                    </button>
                  </div>
                </>,
                document.body,
              )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── bolha de mensagem ───────────────────────────────── */

const Bubble = memo(_Bubble)
function _Bubble({ msg, chatId, onReply }: { msg: WaMessage; chatId: string; onReply: (m: WaMessage) => void }) {
  const mine = msg.fromMe
  const isAudio = msg.type === 'audio' && msg.hasMedia
  const isImage = msg.type === 'imagem' && msg.hasMedia
  const isVideo = msg.type === 'video' && msg.hasMedia
  const isDocument = msg.type === 'documento' && msg.hasMedia
  const isMedia = isAudio || isImage || isVideo || isDocument
  const caption = msg.meta?.caption || ''
  const [copied, setCopied] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)
  const [mediaError, setMediaError] = useState(false)
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
        {/* botões no canto: responder + copiar */}
        <div className="absolute top-1 right-1 z-10 flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onReply(msg)}
            title="Responder"
            className="rounded-full p-1"
            style={{
              background: '#FFFFFF',
              border: `1px solid ${T.border}`,
              color: T.textDim,
              boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
            }}
          >
            <CornerUpLeft size={11} />
          </button>
          {canCopy && (
            <button
              onClick={copyText}
              title={copied ? 'Copiado!' : 'Copiar texto'}
              className="rounded-full p-1"
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
        </div>

        {/* Mensagem citada (quoted/reply) */}
        {msg.quoted && (
          <div
            className="m-2 mb-0 px-2.5 py-1.5 rounded-lg text-[11px] border-l-2"
            style={{
              background: mine ? 'rgba(255,255,255,0.08)' : '#FAFAF8',
              borderColor: mine ? '#D6F23C' : T.accent,
              color: mine ? 'rgba(255,255,255,0.85)' : T.textMuted,
            }}
          >
            <span
              className="font-semibold block leading-tight"
              style={{ color: mine ? '#D6F23C' : T.accent, fontSize: 10 }}
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
            {mediaError ? (
              <div
                className="flex items-center gap-2 px-3 py-3 text-[12px]"
                style={{
                  minWidth: 200,
                  color: mine ? 'rgba(255,255,255,0.8)' : T.textMuted,
                }}
              >
                <span className="text-[16px]">🖼️</span>
                <span>Imagem indisponível</span>
              </div>
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={waServer.mediaUrl(chatId, msg.id)}
                alt={caption || 'imagem'}
                loading="lazy"
                decoding="async"
                onLoad={() => setImgLoaded(true)}
                onError={() => setMediaError(true)}
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
            )}
            {caption && (
              <p className="px-3 pt-2 text-[13px] leading-snug whitespace-pre-wrap break-words">
                {renderText(caption, mine)}
              </p>
            )}
          </div>
        ) : isVideo ? (
          <div>
            {mediaError ? (
              <div
                className="flex items-center gap-2 px-3 py-3 text-[12px]"
                style={{
                  minWidth: 200,
                  color: mine ? 'rgba(255,255,255,0.8)' : T.textMuted,
                }}
              >
                <span className="text-[16px]">🎬</span>
                <span>Vídeo indisponível</span>
              </div>
            ) : (
              <video
                controls
                preload="metadata"
                src={waServer.mediaUrl(chatId, msg.id)}
                onError={() => setMediaError(true)}
                className="block w-full max-w-[320px]"
                style={{ maxHeight: 320, background: '#000' }}
              />
            )}
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
            {looksLikeBase64(msg.text) ? (
              <span className="italic opacity-60">📎 Mídia não pôde ser exibida</span>
            ) : (
              renderText(msg.text, mine)
            )}
          </p>
        )}
        {/* reações: chip discreto embaixo da bolha (estilo WhatsApp) */}
        {msg.reactions && msg.reactions.length > 0 && (
          <div className="px-2 -mb-1.5 -mt-1 flex justify-end">
            <span
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[11px]"
              style={{
                background: mine ? 'rgba(255,255,255,0.18)' : '#FFFFFF',
                border: `1px solid ${mine ? 'rgba(255,255,255,0.25)' : T.border}`,
                boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
              }}
              title={msg.reactions.map((r) => r.emoji).join('')}
            >
              {[...new Set(msg.reactions.map((r) => r.emoji))].slice(0, 3).join('')}
              {msg.reactions.length > 1 && (
                <span style={{ color: mine ? 'rgba(255,255,255,0.8)' : T.textMuted, fontSize: 10, marginLeft: 2 }}>
                  {msg.reactions.length}
                </span>
              )}
            </span>
          </div>
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
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [mediaPreview, setMediaPreview] = useState<string>('')
  const [mediaCaption, setMediaCaption] = useState('')
  const [mediaSending, setMediaSending] = useState(false)
  const [mediaAsDoc, setMediaAsDoc] = useState(false)
  const [replyTo, setReplyTo] = useState<WaMessage | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [search, setSearch] = useState('')
  const [showModels, setShowModels] = useState(false)
  const [showProposals, setShowProposals] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [chatFilter, setChatFilter] = useState<'all' | 'unanswered' | 'archived' | 'groups'>('all')
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [tagMenuOpen, setTagMenuOpen] = useState(false)
  // Multi-atendimento: filtro por responsável na lista + menu no cabeçalho.
  const [respFilter, setRespFilter] = useState<string | null>(null)
  const [respMenuOpen, setRespMenuOpen] = useState(false)
  const [respFilterMenuOpen, setRespFilterMenuOpen] = useState(false)
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
      // ? abre overlay de atalhos — SÓ quando não está digitando (senão engolia
      // a interrogação no campo de mensagem, impedindo mandar "?" pro cliente)
      if (e.key === '?' && !meta && !isTyping) {
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

  const scrollRafRef = useRef<number | null>(null)
  function handleMessagesScroll() {
    // scroll dispara dezenas de vezes por segundo; setState a cada pixel
    // força re-render da lista inteira. rAF coalesce pro próximo paint.
    if (scrollRafRef.current != null) return
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null
      const el = msgScrollRef.current
      if (!el) return
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80
      setIsAtBottom((prev) => (prev === nearBottom ? prev : nearBottom))
      if (nearBottom) setNewCount((c) => (c === 0 ? c : 0))
    })
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
    // Não marca "servidor offline" no primeiro tropeço. Um 429 (limite de
    // requisições) ou uma lentidão momentânea fazia o banner vermelho piscar
    // mesmo com o servidor no ar. Agora só mostra offline após 3 falhas
    // seguidas, e zera a contagem a cada sucesso.
    let failStreak = 0
    async function loadAll() {
      try {
        const [st, cs] = await Promise.all([waServer.status(), waServer.chats()])
        if (!alive) return
        failStreak = 0
        setConn(st.state)
        setIngest(st.ingest ? { ageS: st.ingest.ageS } : null)
        setChats(cs)
        setServerOff(false)
      } catch {
        failStreak++
        if (alive && failStreak >= 3) setServerOff(true)
      }
    }
    async function loadChats() {
      try {
        const cs = await waServer.chats()
        if (alive) {
          failStreak = 0
          setChats(cs)
          setServerOff(false)
        }
      } catch {
        failStreak++
        if (alive && failStreak >= 3) setServerOff(true)
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
    // Rola pro fim VÁRIAS vezes: o layout ainda cresce enquanto imagens/áudios
    // carregam, então um scroll único caía no meio. Reforça até assentar.
    const jump = () =>
      msgEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' })
    requestAnimationFrame(jump)
    const timers = [120, 350, 700, 1200].map((ms) => setTimeout(jump, ms))
    return () => timers.forEach(clearTimeout)
  }, [selectedId, messages.length])

  // Esconde duplicadas: extensão + Baileys gravam a mesma msg com ids
  // diferentes. Dedup por id e, pra texto, por (fromMe + hora + texto).
  // Mídia não entra na dedup "suave" (2 fotos no mesmo segundo são legítimas).
  const dedupedMessages = useMemo(() => {
    const seenId = new Set<string>()
    const seenSoft = new Set<string>()
    const out: WaMessage[] = []
    for (const m of messages) {
      // esconde mensagens de protocolo/vazias (viravam balões em branco)
      if (isNoiseMessage(m)) continue
      if (m.id) {
        if (seenId.has(m.id)) continue
        seenId.add(m.id)
      }
      const txt = (m.text || '').trim()
      const isMedia = ['imagem', 'video', 'audio', 'documento'].includes(m.type)
      if (txt && !isMedia) {
        const soft = `${m.fromMe ? 1 : 0}|${m.time}|${txt}`
        if (seenSoft.has(soft)) continue
        seenSoft.add(soft)
      }
      out.push(m)
    }
    return out
  }, [messages])

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

  // Multi-atendimento: define/troca quem é responsável pela conversa.
  // Guarda como etiqueta "resp:<nome>" (null = ninguém), preservando as
  // outras etiquetas.
  async function handleSetResponsavel(id: string, nome: string | null) {
    const chat = chats.find((c) => c.id === id)
    const nextTags = tagsWithResponsavel(chat?.tags, nome)
    setChats((cs) => cs.map((c) => (c.id === id ? { ...c, tags: nextTags } : c)))
    try {
      await waServer.updateChat(id, { tags: nextTags })
    } catch {}
    reloadChats()
  }

  // Separa a conversa num segmento (cliente/alunos/pessoal). Clicar no
  // segmento atual remove (null). Guarda como etiqueta, uma por vez.
  async function handleSetSegment(id: string, tag: string | null) {
    const chat = chats.find((c) => c.id === id)
    const nextTags = tagsWithSegment(chat?.tags, tag)
    setChats((cs) => cs.map((c) => (c.id === id ? { ...c, tags: nextTags } : c)))
    try {
      await waServer.updateChat(id, { tags: nextTags })
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

  function pickMedia(file: File) {
    if (mediaPreview) URL.revokeObjectURL(mediaPreview)
    setMediaFile(file)
    setMediaCaption('')
    setMediaAsDoc(false)
    // só faz preview pra imagem/vídeo (documentos ficam só com nome)
    if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
      setMediaPreview(URL.createObjectURL(file))
    } else {
      setMediaPreview('')
    }
  }

  function clearMedia() {
    if (mediaPreview) URL.revokeObjectURL(mediaPreview)
    setMediaFile(null)
    setMediaPreview('')
    setMediaCaption('')
    setMediaAsDoc(false)
  }

  // useCallback pra não invalidar o memo do Bubble — onReply é uma prop
  // estável agora; antes uma função inline quebraria memoização da lista.
  const handleReply = useCallback((m: WaMessage) => {
    setReplyTo(m)
    // foca o composer pra digitar a resposta direto
    composerRef.current?.focus()
  }, [])

  async function handleSendMedia() {
    if (!mediaFile || !selectedId || mediaSending) return
    setMediaSending(true)
    try {
      const r = await waServer.sendMedia(selectedId, mediaFile, mediaCaption.trim(), mediaAsDoc, replyTo?.id)
      if (!r.ok) {
        alert('Erro ao enviar: ' + (r.error || 'desconhecido'))
        setMediaSending(false)
        return
      }
      // optimistic: marca conversa como respondida
      setChats((cs) =>
        cs.map((c) =>
          c.id === selectedId
            ? {
                ...c,
                fromMeLast: true,
                lastText: mediaCaption.trim() ||
                  (mediaFile.type.startsWith('image/') ? '🖼️ Imagem' :
                   mediaFile.type.startsWith('video/') ? '🎬 Vídeo' :
                   '📎 ' + mediaFile.name),
                lastTime: Math.floor(Date.now() / 1000),
              }
            : c
        )
      )
      clearMedia()
      setReplyTo(null)
      const m = await waServer.messages(selectedId)
      setMessages(m.messages || [])
      reloadChats()
    } catch {
      alert('Não foi possível enviar a mídia.')
    } finally {
      setMediaSending(false)
    }
  }

  // modelos pro menu "/" no campo de digitação
  const [snippets, setSnippets] = useState<WaSnippet[]>([])
  useEffect(() => {
    waServer
      .library()
      .then((lib) => setSnippets(lib.snippets || []))
      .catch(() => {})
  }, [])

  // "/" abre os modelos (filtra pelo texto após a barra)
  const slashSnippets = useMemo(() => {
    if (!draft.startsWith('/')) return []
    const q = draft.slice(1).toLowerCase().trim()
    return snippets.filter(
      (s) =>
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.content.toLowerCase().includes(q)
    )
  }, [draft, snippets])

  function fillVars(text: string): string {
    const nome = currentChat?.name || ''
    const primeiro = nome.split(' ')[0] || nome
    return text
      .replace(/\{\{\s*primeiro[_ ]?nome\s*\}\}/gi, primeiro)
      .replace(/\{\{\s*nome\s*\}\}/gi, nome)
  }

  function insertIntoDraft(text: string) {
    const filled = fillVars(text)
    // joga o texto no campo pra editar e enviar
    setDraft((d) => (d.trim() ? d.replace(/\s+$/, '') + '\n' + filled : filled))
    setShowModels(false)
    setShowProposals(false)
    requestAnimationFrame(() => composerRef.current?.focus())
  }

  // seleciona um modelo pelo menu "/": troca o "/..." pelo conteúdo preenchido
  function pickSlashSnippet(s: WaSnippet) {
    setDraft(fillVars(s.content))
    requestAnimationFrame(() => composerRef.current?.focus())
  }

  async function handleSend() {
    const text = draft.trim()
    if (!text || !selectedId || sending) return
    setSending(true)
    setDraft('')
    const quoted = replyTo
    try {
      const r = await waServer.sendText(selectedId, text, quoted?.id)
      if (!r.ok) {
        setDraft(text)
        alert('Erro ao enviar: ' + (r.error || 'desconhecido'))
      } else {
        setReplyTo(null)
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

  // Uma única passada calcula contadores + tags. Antes: 4 filter() + IIFE,
  // todos rodando em cada render (qualquer keystroke).
  const { unansweredCount, archivedCount, groupsCount, allTags } = useMemo(() => {
    let unanswered = 0, archived = 0, groups = 0
    const tagCount = new Map<string, number>()
    for (const c of chats) {
      if (c.archived) {
        archived++
        continue
      }
      if (c.isGroup) groups++
      else if (!c.fromMeLast && !c.ignored && !(c.tags || []).includes('pessoal'))
        unanswered++
      // "resp:*" é responsável e "followup" é coluna do Kanban — nenhum é
      // etiqueta comum, então não entram na lista de etiquetas.
      for (const t of c.tags || [])
        if (!isRespTag(t) && t !== 'followup') tagCount.set(t, (tagCount.get(t) || 0) + 1)
    }
    return {
      unansweredCount: unanswered,
      archivedCount: archived,
      groupsCount: groups,
      allTags: [...tagCount.entries()].sort((a, b) => b[1] - a[1]) as [string, number][],
    }
  }, [chats])

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
      // oculta contatos pessoais da lista (só aparecem ao filtrar por "pessoal")
      if (tagFilter !== 'pessoal' && (c.tags || []).includes('pessoal')) return false
      if (respFilter) {
        const r = getResponsavel(c)
        if (respFilter === '__none__' ? r !== null : r !== respFilter) return false
      }
      if (chatFilter === 'archived') return !!c.archived
      if (c.archived) return false
      if (chatFilter === 'groups') return c.isGroup
      if (chatFilter === 'unanswered' && (c.isGroup || c.fromMeLast || c.ignored || (c.tags || []).includes('pessoal'))) return false
      return true
    })
  }, [chats, search, searchHits, tagFilter, chatFilter, respFilter])

  // paginação da lista: renderiza aos poucos. Sem isso, 5000+ conversas viram
  // 5000+ componentes React e trocar de aba/conversa engasga. Carrega mais ao
  // rolar; volta ao topo quando muda a busca/filtro.
  const [visibleCount, setVisibleCount] = useState(80)
  useEffect(() => {
    setVisibleCount(80)
  }, [search, tagFilter, chatFilter, respFilter])

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
        conn === 'qr' ? (
          <a
            href={waServer.qrUrl()}
            target="_blank"
            rel="noopener"
            className="px-6 py-2 text-[12px] font-semibold flex-shrink-0 flex items-center justify-between gap-3 transition-colors hover:bg-[#FDF3C2]"
            style={{
              background: '#FEF9E7',
              borderBottom: '1px solid #FDE68A',
              color: '#92400E',
            }}
          >
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#F4D55D' }} />
              WhatsApp aguardando QR — <u>clique aqui pra escanear</u>
            </span>
            <span
              className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider"
              style={{ background: '#92400E', color: '#FEF9E7' }}
            >
              📷 Abrir QR
            </span>
          </a>
        ) : (
          <div
            className="px-6 py-2 text-[12px] font-semibold flex-shrink-0"
            style={{
              background: '#FEF9E7',
              borderBottom: '1px solid #FDE68A',
              color: '#92400E',
            }}
          >
            WhatsApp: reconectando…
          </div>
        )
      )}

      <div className="flex-1 min-h-0 flex">
        {/* ── lista de conversas ──
            Desktop: sidebar 340px sempre visível (toggle via listOpen).
            Mobile: ocupa a tela TODA, escondida quando uma conversa abre. */}
        {(listOpen || !selectedId) && (
        <div
          className={`flex flex-col flex-shrink-0 w-full md:w-[340px] ${
            selectedId ? 'hidden md:flex' : 'flex'
          }`}
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

              {/* Atalho: filtrar Alunos */}
              <button
                onClick={() => setTagFilter(tagFilter === 'alunos' ? null : 'alunos')}
                className="py-1.5 px-3 rounded-full text-[11px] font-bold transition-colors flex items-center gap-1"
                style={{
                  background: tagFilter === 'alunos' ? T.accent : T.bgSubtle,
                  color: tagFilter === 'alunos' ? T.accentBright : T.textMuted,
                  border: `1px solid ${tagFilter === 'alunos' ? T.accent : T.border}`,
                }}
              >
                🎓 Alunos
              </button>

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

              {/* Dropdown de Responsável (multi-atendimento) */}
              <div className="relative">
                <button
                  onClick={() => setRespFilterMenuOpen((o) => !o)}
                  className="py-1.5 px-3 rounded-full text-[11px] font-bold transition-colors flex items-center gap-1"
                  style={{
                    background: respFilter ? T.accent : T.bgSubtle,
                    color: respFilter ? T.accentBright : T.textMuted,
                    border: `1px solid ${respFilter ? T.accent : T.border}`,
                  }}
                >
                  <Users size={10} />
                  {respFilter === '__none__'
                    ? 'Sem responsável'
                    : respFilter || 'Responsável'}
                </button>
                {respFilterMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      onClick={() => setRespFilterMenuOpen(false)}
                    />
                    <div
                      className="absolute z-40 top-full mt-1.5 left-0 w-52 rounded-xl py-1"
                      style={{
                        background: '#FFFFFF',
                        border: `1px solid ${T.border}`,
                        boxShadow: '0 12px 32px rgba(0,0,0,0.12)',
                      }}
                    >
                      {respFilter && (
                        <button
                          onClick={() => {
                            setRespFilter(null)
                            setRespFilterMenuOpen(false)
                          }}
                          className="w-full text-left px-3 py-2 text-[11px] font-bold flex items-center gap-2"
                          style={{
                            color: T.accent,
                            borderBottom: `1px solid ${T.borderSubtle}`,
                          }}
                        >
                          <X size={11} />
                          Todas as conversas
                        </button>
                      )}
                      {RESPONSAVEIS.map((nome) => (
                        <button
                          key={nome}
                          onClick={() => {
                            setRespFilter(nome)
                            setRespFilterMenuOpen(false)
                          }}
                          className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-[#FAFAF8] transition-colors"
                          style={{
                            background: respFilter === nome ? '#FAFAF8' : 'transparent',
                          }}
                        >
                          <span
                            className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold"
                            style={{
                              background: respMeta(nome).bg,
                              color: respMeta(nome).color,
                            }}
                          >
                            {nome[0]}
                          </span>
                          <span className="text-[12px]" style={{ color: T.textPrimary }}>
                            {nome}
                          </span>
                        </button>
                      ))}
                      <button
                        onClick={() => {
                          setRespFilter('__none__')
                          setRespFilterMenuOpen(false)
                        }}
                        className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-[#FAFAF8] transition-colors text-[12px]"
                        style={{
                          color: T.textMuted,
                          borderTop: `1px solid ${T.borderSubtle}`,
                        }}
                      >
                        Sem responsável
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div
            className="flex-1 min-h-0 overflow-y-auto thin-scroll"
            onScroll={(e) => {
              const el = e.currentTarget
              if (el.scrollHeight - el.scrollTop - el.clientHeight < 500) {
                setVisibleCount((c) => (c < filtered.length ? c + 80 : c))
              }
            }}
          >
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
              filtered.slice(0, visibleCount).map((c) => {
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
                      onSetSegment={(t) => handleSetSegment(c.id, t)}
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

        {/* ── conversa ──
            No mobile: ocupa tela toda quando uma conversa está aberta.
            Quando nenhuma está aberta, fica escondida e só a lista aparece. */}
        <div
          className={`flex-1 min-w-0 flex flex-col relative ${
            selectedId ? 'flex' : 'hidden md:flex'
          }`}
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
                    'radial-gradient(circle at 30% 25%, #D6F23C 0%, #C8E6E0 60%, #6BA89E 100%)',
                  boxShadow: '0 8px 32px rgba(13,56,57,0.15)',
                }}
              >
                <span
                  style={{
                    fontFamily: '"ivypresto-display", Georgia, serif',
                    fontStyle: 'italic',
                    fontWeight: 700,
                    fontSize: 52,
                    color: '#141414',
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
                    fontFamily: 'var(--font-inter), Inter, sans-serif',
                    fontStyle: 'normal',
                    fontWeight: 800,
                    letterSpacing: '-0.02em',
                    fontSize: '1.6rem',
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
                {/* Voltar (mobile only) — fecha a conversa e volta pra lista */}
                <button
                  onClick={() => setSelectedId(null)}
                  title="Voltar pra lista"
                  className="md:hidden w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors hover:bg-[#F4F3EF]"
                  style={{ color: T.textMuted }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                  </svg>
                </button>
                {/* Toggle do painel lateral (só desktop) */}
                <button
                  onClick={() => setListOpen((o) => !o)}
                  title={listOpen ? 'Ocultar conversas' : 'Mostrar conversas'}
                  className="hidden md:flex w-8 h-8 rounded-lg items-center justify-center flex-shrink-0 transition-colors hover:bg-[#F4F3EF]"
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
                  {currentChat && (() => {
                    const currentResp = getResponsavel(currentChat)
                    return (
                      <div className="relative">
                        <button
                          onClick={() => setRespMenuOpen((v) => !v)}
                          title="Responsável pela conversa"
                          className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1.5 rounded-lg transition-colors"
                          style={{
                            background: currentResp ? respMeta(currentResp).bg : T.bgSubtle,
                            color: currentResp ? respMeta(currentResp).color : T.textMuted,
                            border: `1px solid ${currentResp ? respMeta(currentResp).color + '40' : T.border}`,
                          }}
                        >
                          <Users size={12} />
                          <span className="hidden sm:inline">
                            {currentResp || 'Responsável'}
                          </span>
                          <ChevronDown size={11} />
                        </button>
                        {respMenuOpen && (
                          <>
                            <div
                              className="fixed inset-0 z-40"
                              onClick={() => setRespMenuOpen(false)}
                            />
                            <div
                              className="absolute z-50 right-0 top-full mt-1 w-44 rounded-xl py-1"
                              style={{
                                background: '#FFFFFF',
                                border: `1px solid ${T.border}`,
                                boxShadow: '0 12px 32px rgba(0,0,0,0.12)',
                              }}
                            >
                              <p className="px-3 pt-1 pb-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: T.textDim }}>
                                Atender esta conversa
                              </p>
                              {RESPONSAVEIS.map((nome) => (
                                <button
                                  key={nome}
                                  onClick={() => {
                                    handleSetResponsavel(selectedId, nome)
                                    setRespMenuOpen(false)
                                  }}
                                  className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-[#FAFAF8] transition-colors"
                                >
                                  <span
                                    className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold"
                                    style={{
                                      background: respMeta(nome).bg,
                                      color: respMeta(nome).color,
                                    }}
                                  >
                                    {nome[0]}
                                  </span>
                                  <span className="text-[12px]" style={{ color: T.textPrimary }}>
                                    {nome}
                                  </span>
                                  {currentResp === nome && (
                                    <span className="ml-auto text-[10px] text-[#9B9B9B]">atual</span>
                                  )}
                                </button>
                              ))}
                              <div className="my-1" style={{ borderTop: `1px solid ${T.borderSubtle}` }} />
                              <button
                                onClick={() => {
                                  handleSetResponsavel(selectedId, null)
                                  setRespMenuOpen(false)
                                }}
                                className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-[#FAFAF8] transition-colors text-[12px]"
                                style={{ color: T.textMuted }}
                              >
                                Ninguém
                                {!currentResp && (
                                  <span className="ml-auto text-[10px] text-[#9B9B9B]">atual</span>
                                )}
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )
                  })()}
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
                    <span className="hidden sm:inline">Proposta</span>
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
                    <span className="hidden sm:inline">Modelos</span>
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
                    <span className="hidden sm:inline">Detalhes</span>
                  </button>
                </div>
              </div>

              {/* mensagens */}
              <div
                className="flex-1 min-h-0 relative"
                onDragOver={(e) => {
                  // Arrastar arquivo do Finder/Explorer pra cima do chat → preview.
                  if (e.dataTransfer.types.includes('Files')) {
                    e.preventDefault()
                    e.dataTransfer.dropEffect = 'copy'
                  }
                }}
                onDrop={(e) => {
                  const f = e.dataTransfer.files?.[0]
                  if (!f) return
                  e.preventDefault()
                  if (f.size > 16 * 1024 * 1024) {
                    alert('Arquivo grande demais (máx 16MB).')
                    return
                  }
                  pickMedia(f)
                }}
              >
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
                      return dedupedMessages.map((m) => {
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
                            <Bubble msg={m} chatId={selectedId} onReply={handleReply} />
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

              {/* preview de mídia anexada (acima do composer) */}
              {mediaFile && (
                <div
                  className="px-4 py-3 flex items-start gap-3 flex-shrink-0"
                  style={{ background: T.bgSubtle, borderTop: `1px solid ${T.border}` }}
                >
                  {mediaPreview && mediaFile.type.startsWith('image/') ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={mediaPreview}
                      alt=""
                      style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8 }}
                    />
                  ) : mediaPreview && mediaFile.type.startsWith('video/') ? (
                    <video
                      src={mediaPreview}
                      style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8 }}
                    />
                  ) : (
                    <div
                      className="flex items-center justify-center rounded-lg"
                      style={{ width: 64, height: 64, background: T.card, border: `1px solid ${T.border}` }}
                    >
                      <FileText size={22} style={{ color: T.textDim }} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold truncate" style={{ color: T.textPrimary }}>
                      {mediaFile.name}
                    </p>
                    <p className="text-[10px] mb-2" style={{ color: T.textDim }}>
                      {(mediaFile.size / 1024).toFixed(0)} KB · {mediaFile.type || 'arquivo'}
                    </p>

                    {/* toggle Foto/Vídeo × Arquivo (sem compressão) — só pra imagem/vídeo */}
                    {(mediaFile.type.startsWith('image/') || mediaFile.type.startsWith('video/')) && (
                      <div className="flex gap-1 mb-2 p-0.5 rounded-md" style={{ background: T.card, border: `1px solid ${T.border}`, width: 'fit-content' }}>
                        <button
                          onClick={() => setMediaAsDoc(false)}
                          disabled={mediaSending}
                          className="px-2.5 py-1 rounded text-[10px] font-semibold transition-all"
                          style={{
                            background: !mediaAsDoc ? T.accent : 'transparent',
                            color: !mediaAsDoc ? T.accentBright : T.textMuted,
                          }}
                        >
                          {mediaFile.type.startsWith('video/') ? '🎬 Vídeo' : '🖼️ Foto'}
                        </button>
                        <button
                          onClick={() => setMediaAsDoc(true)}
                          disabled={mediaSending}
                          title="Envia o arquivo original, sem compressão do WhatsApp"
                          className="px-2.5 py-1 rounded text-[10px] font-semibold transition-all"
                          style={{
                            background: mediaAsDoc ? T.accent : 'transparent',
                            color: mediaAsDoc ? T.accentBright : T.textMuted,
                          }}
                        >
                          📎 Arquivo (sem compressão)
                        </button>
                      </div>
                    )}

                    <input
                      autoFocus
                      type="text"
                      value={mediaCaption}
                      onChange={(e) => setMediaCaption(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !mediaSending) handleSendMedia()
                        if (e.key === 'Escape') clearMedia()
                      }}
                      placeholder={mediaAsDoc ? 'Legenda (opcional, o nome do arquivo é mantido)…' : 'Legenda (opcional)…'}
                      disabled={mediaSending}
                      className="w-full px-2.5 py-1.5 rounded-md text-[12px] outline-none"
                      style={{
                        background: T.card,
                        border: `1px solid ${T.border}`,
                        color: T.textPrimary,
                      }}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <button
                      onClick={handleSendMedia}
                      disabled={mediaSending}
                      className="px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                      style={{ background: T.accent, color: T.accentBright }}
                    >
                      {mediaSending ? 'Enviando…' : 'Enviar'}
                    </button>
                    <button
                      onClick={clearMedia}
                      disabled={mediaSending}
                      className="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors hover:bg-[#F4F3EF]"
                      style={{ color: T.textMuted }}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {/* preview da mensagem sendo respondida (acima do composer) */}
              {replyTo && !mediaFile && (
                <div
                  className="px-4 py-2 flex items-center gap-3 flex-shrink-0"
                  style={{ background: T.bgSubtle, borderTop: `1px solid ${T.border}` }}
                >
                  <CornerUpLeft size={14} style={{ color: T.accent, flexShrink: 0 }} />
                  <div
                    className="flex-1 min-w-0 border-l-2 pl-2.5 py-0.5"
                    style={{ borderColor: T.accent }}
                  >
                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: T.accent }}>
                      Respondendo a {replyTo.fromMe ? 'você mesma' : (replyTo.pushName || 'mensagem')}
                    </p>
                    <p className="text-[12px] truncate" style={{ color: T.textMuted }}>
                      {replyTo.type === 'imagem' ? '🖼️ ' + (replyTo.meta?.caption || 'Imagem')
                       : replyTo.type === 'video' ? '🎬 ' + (replyTo.meta?.caption || 'Vídeo')
                       : replyTo.type === 'audio' ? '🎙️ Áudio'
                       : replyTo.type === 'documento' ? '📎 ' + (replyTo.meta?.fileName || 'Documento')
                       : replyTo.text || '[mensagem]'}
                    </p>
                  </div>
                  <button
                    onClick={() => setReplyTo(null)}
                    title="Cancelar resposta (Esc)"
                    className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-[#F4F3EF] transition-colors"
                    style={{ color: T.textMuted }}
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* composer */}
              <div
                className="relative px-4 py-3 flex items-center gap-2 flex-shrink-0"
                style={{
                  background: T.card,
                  borderTop: `1px solid ${T.border}`,
                }}
              >
                {/* menu "/" — modelos rápidos (digite / no campo) */}
                {slashSnippets.length > 0 && (
                  <div
                    className="absolute left-4 right-4 bottom-full mb-2 max-h-64 overflow-y-auto rounded-xl py-1 z-30"
                    style={{
                      background: T.card,
                      border: `1px solid ${T.border}`,
                      boxShadow: '0 12px 32px rgba(0,0,0,0.14)',
                    }}
                  >
                    <p
                      className="text-[10px] font-bold uppercase tracking-wider px-3 py-1"
                      style={{ color: T.textDim }}
                    >
                      Modelos — Enter no 1º ou clique
                    </p>
                    {slashSnippets.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => pickSlashSnippet(s)}
                        className="w-full text-left px-3 py-2 hover:bg-[#FAFAF8] transition-colors"
                      >
                        <p
                          className="text-[12px] font-bold truncate"
                          style={{ color: T.textPrimary }}
                        >
                          {s.name}
                        </p>
                        <p className="text-[11px] truncate" style={{ color: T.textDim }}>
                          {s.content}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
                {/* botão anexar + input file escondido */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/zip,application/octet-stream,text/*"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) {
                      if (f.size > 16 * 1024 * 1024) {
                        alert('Arquivo grande demais (máx 16MB).')
                        return
                      }
                      pickMedia(f)
                    }
                    e.target.value = '' // permite re-anexar o mesmo arquivo
                  }}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={conn !== 'open' || !!mediaFile}
                  title="Anexar imagem, vídeo ou documento"
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors hover:bg-[#F4F3EF] disabled:opacity-30"
                  style={{ color: T.textMuted }}
                >
                  <Paperclip size={18} />
                </button>
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
                  onPaste={(e) => {
                    // Cmd+V / Ctrl+V de imagem (print do macOS, screenshot,
                    // copy-image do navegador). Captura o blob e abre o preview.
                    const items = e.clipboardData?.items
                    if (!items) return
                    for (const item of items) {
                      if (item.kind === 'file' && item.type.startsWith('image/')) {
                        const file = item.getAsFile()
                        if (!file) continue
                        e.preventDefault()
                        if (file.size > 16 * 1024 * 1024) {
                          alert('Imagem grande demais (máx 16MB).')
                          return
                        }
                        // print do macOS vem como "image.png" — dá um nome
                        // mais útil pra mostrar no preview/no destinatário.
                        const ext = file.type.split('/')[1] || 'png'
                        const renamed = new File(
                          [file],
                          `print-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.${ext}`,
                          { type: file.type }
                        )
                        pickMedia(renamed)
                        return
                      }
                    }
                    // sem imagem no clipboard → comportamento default (cola texto)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      // menu "/" aberto: Enter escolhe o 1º modelo em vez de enviar
                      if (slashSnippets.length > 0) {
                        pickSlashSnippet(slashSnippets[0])
                        return
                      }
                      handleSend()
                      // reseta altura após envio
                      requestAnimationFrame(() => {
                        e.currentTarget.style.height = 'auto'
                      })
                    }
                    if (e.key === 'Escape') {
                      if (draft.startsWith('/')) setDraft('')
                      else if (replyTo) setReplyTo(null)
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
                  clientName={currentChat?.name}
                  onClose={() => setShowProposals(false)}
                  onInsert={insertIntoDraft}
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
            onInsert={insertIntoDraft}
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
