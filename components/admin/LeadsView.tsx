'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Users, ChevronDown, ChevronRight, Tag } from 'lucide-react'
import { waServer, WaChat, LEAD_STATUSES, STATUS_META } from '@/lib/waServer'
import { useToast } from '@/lib/useToast'

/* ── helpers ─────────────────────────────────────────── */

function fmtTime(t: number) {
  if (!t) return ''
  const d = new Date(t * 1000)
  const sameDay = d.toDateString() === new Date().toDateString()
  return sameDay
    ? d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function fmtBRL(v: number) {
  if (!v) return ''
  if (v >= 1000) return 'R$ ' + (v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + 'k'
  return 'R$ ' + v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?'
}

function Avatar({
  chatId,
  name,
  isGroup,
}: {
  chatId: string
  name: string
  isGroup: boolean
}) {
  const [error, setError] = useState(false)
  const [bust, setBust] = useState(0)
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
        width: 36,
        height: 36,
        fontSize: 12,
        background: '#F4F3EF',
        color: '#8AA09A',
        border: '1px solid #E6E6E1',
      }}
    >
      {error ? (
        isGroup ? <Users size={15} /> : <span>{initials(name)}</span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={waServer.photoUrl(chatId, bust || undefined)}
          alt=""
          onError={() => setError(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      )}
    </div>
  )
}

/* ── status badge editável ───────────────────────────── */

function StatusBadge({
  status,
  onChange,
}: {
  status: string
  onChange: (s: string) => void
}) {
  const [open, setOpen] = useState(false)
  const meta = STATUS_META[status] || STATUS_META.LEAD
  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation()
          setOpen((o) => !o)
        }}
        className="text-[10px] font-bold uppercase tracking-[0.06em] px-2.5 py-1 rounded-full transition-all"
        style={{
          background: meta.bg,
          color: meta.color,
          border: `1px solid ${meta.color}30`,
        }}
      >
        {meta.label}
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={(e) => {
              e.stopPropagation()
              setOpen(false)
            }}
          />
          <div
            className="absolute z-40 top-full mt-1.5 left-0 w-56 rounded-xl py-1"
            style={{
              background: '#FFFFFF',
              border: '1px solid #E6E6E1',
              boxShadow: '0 12px 32px rgba(0,0,0,0.12)',
            }}
          >
            {LEAD_STATUSES.map((s) => (
              <button
                key={s.id}
                onClick={(e) => {
                  e.stopPropagation()
                  onChange(s.id)
                  setOpen(false)
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
                {status === s.id && (
                  <span className="ml-auto text-[10px] text-[#8AA09A]">atual</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

/* ── linha de lead ───────────────────────────────────── */

function LeadRow({
  chat,
  onOpen,
  onSetStatus,
  onSetValue,
}: {
  chat: WaChat
  onOpen: () => void
  onSetStatus: (id: string, status: string) => void
  onSetValue: (id: string, value: number) => void
}) {
  const [editingValue, setEditingValue] = useState(false)
  const [valueDraft, setValueDraft] = useState('')
  return (
    <div
      onClick={onOpen}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/wa-chat-id', chat.id)
        e.dataTransfer.effectAllowed = 'move'
        const el = e.currentTarget as HTMLDivElement
        requestAnimationFrame(() => {
          el.style.opacity = '0.4'
        })
      }}
      onDragEnd={(e) => {
        const el = e.currentTarget as HTMLDivElement
        el.style.opacity = '1'
      }}
      className="flex items-center gap-3 px-4 py-2.5 transition-colors cursor-grab active:cursor-grabbing"
      style={{ borderBottom: '1px solid #F0F0EC' }}
      onMouseEnter={(e) => (e.currentTarget.style.background = '#FAFAF8')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <Avatar chatId={chat.id} name={chat.name} isGroup={chat.isGroup} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[13px] font-semibold text-[#162322] truncate">
            {chat.name}
          </span>
          <span className="text-[10px] text-[#A8B5B0] flex-shrink-0">
            {fmtTime(chat.lastTime)}
          </span>
        </div>
        <p className="text-[12px] text-[#8AA09A] truncate mt-0.5">
          {chat.fromMeLast && (
            <span className="text-[#A8B5B0]">Você: </span>
          )}
          {chat.lastText || '—'}
        </p>
      </div>
      <div
        className="flex-shrink-0 flex items-center gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        {editingValue ? (
          <input
            autoFocus
            type="number"
            placeholder="0"
            value={valueDraft}
            onChange={(e) => setValueDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const v = Math.max(0, Math.round(Number(valueDraft) || 0))
                onSetValue(chat.id, v)
                setEditingValue(false)
              } else if (e.key === 'Escape') {
                setEditingValue(false)
              }
            }}
            onBlur={() => {
              const v = Math.max(0, Math.round(Number(valueDraft) || 0))
              onSetValue(chat.id, v)
              setEditingValue(false)
            }}
            className="w-24 text-[11px] font-bold px-2 py-1 rounded outline-none"
            style={{
              background: '#F4F3EF',
              border: '1px solid #C8D8D4',
              color: '#162322',
            }}
          />
        ) : (
          <button
            onClick={() => {
              setValueDraft(chat.value ? String(chat.value) : '')
              setEditingValue(true)
            }}
            title="Clique pra editar o valor (R$)"
            className="text-[10px] font-bold px-2 py-1 rounded transition-all hover:opacity-80"
            style={{
              background: chat.value ? '#0D3839' : 'transparent',
              color: chat.value ? '#F4F99D' : '#A8B5B0',
              border: chat.value ? 'none' : '1px dashed #C8D8D4',
            }}
          >
            {chat.value ? fmtBRL(chat.value) : '+ R$'}
          </button>
        )}
        <StatusBadge
          status={chat.status}
          onChange={(s) => onSetStatus(chat.id, s)}
        />
      </div>
    </div>
  )
}

/* ── grupo de status ─────────────────────────────────── */

function StatusGroup({
  status,
  chats,
  onOpenChat,
  onSetStatus,
  onSetValue,
  initialOpen = true,
}: {
  status: (typeof LEAD_STATUSES)[number]
  chats: WaChat[]
  onOpenChat: (id: string) => void
  onSetStatus: (id: string, status: string) => void
  onSetValue: (id: string, value: number) => void
  initialOpen?: boolean
}) {
  const [open, setOpen] = useState(initialOpen)
  const [dragOver, setDragOver] = useState(false)
  const totalValue = chats.reduce((sum, c) => sum + (Number(c.value) || 0), 0)
  return (
    <div
      onDragOver={(e) => {
        // só aceita se for um chat sendo arrastado E ainda não está nesta etapa
        if (e.dataTransfer.types.includes('text/wa-chat-id')) {
          e.preventDefault()
          e.dataTransfer.dropEffect = 'move'
          if (!dragOver) setDragOver(true)
        }
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragOver(false)
        const id = e.dataTransfer.getData('text/wa-chat-id')
        if (id) onSetStatus(id, status.id)
      }}
      className="rounded-2xl mb-3 overflow-hidden transition-all"
      style={{
        background: '#FFFFFF',
        border: dragOver ? `2px dashed ${status.color}` : '1px solid #E6E6E1',
        transform: dragOver ? 'scale(1.005)' : 'none',
      }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[#FAFAF8]"
      >
        {open ? (
          <ChevronDown size={14} className="text-[#A8B5B0]" />
        ) : (
          <ChevronRight size={14} className="text-[#A8B5B0]" />
        )}
        <span
          className="text-[11px] font-bold uppercase tracking-[0.08em] px-3 py-1 rounded-full"
          style={{
            background: status.bg,
            color: status.color,
            border: `1px solid ${status.color}30`,
          }}
        >
          {status.label}
        </span>
        <span className="text-[12px] text-[#8AA09A] font-semibold">
          {chats.length}
        </span>
        {totalValue > 0 && (
          <span
            className="text-[11px] font-bold ml-auto px-2 py-0.5 rounded"
            style={{ color: status.color, background: status.bg }}
          >
            {fmtBRL(totalValue)}
          </span>
        )}
      </button>
      {open && chats.length > 0 && (
        <div>
          {chats.map((c) => (
            <LeadRow
              key={c.id}
              chat={c}
              onOpen={() => onOpenChat(c.id)}
              onSetStatus={onSetStatus}
              onSetValue={onSetValue}
            />
          ))}
        </div>
      )}
      {open && chats.length === 0 && (
        <p className="text-[12px] text-[#A8B5B0] text-center py-6">
          Nenhuma conversa nesta etapa.
        </p>
      )}
    </div>
  )
}

/* ── kanban column (horizontal layout) ──────────────── */

function KanbanColumn({
  status,
  chats,
  onOpenChat,
  onSetStatus,
  onSetValue,
}: {
  status: (typeof LEAD_STATUSES)[number]
  chats: WaChat[]
  onOpenChat: (id: string) => void
  onSetStatus: (id: string, status: string) => void
  onSetValue: (id: string, value: number) => void
}) {
  const [dragOver, setDragOver] = useState(false)
  const totalValue = chats.reduce((sum, c) => sum + (Number(c.value) || 0), 0)

  return (
    <div
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('text/wa-chat-id')) {
          e.preventDefault()
          e.dataTransfer.dropEffect = 'move'
          if (!dragOver) setDragOver(true)
        }
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragOver(false)
        const id = e.dataTransfer.getData('text/wa-chat-id')
        if (id) onSetStatus(id, status.id)
      }}
      className="flex flex-col rounded-2xl overflow-hidden transition-all"
      style={{
        width: 304,
        minWidth: 304,
        background: dragOver ? status.bg : '#F4F3EF',
        border: dragOver
          ? `2px dashed ${status.color}`
          : '1px solid #E6E6E1',
        maxHeight: 'calc(100vh - 280px)',
      }}
    >
      {/* header sticky */}
      <div
        className="px-4 py-3 flex items-center gap-2 flex-shrink-0"
        style={{ borderBottom: '1px solid #E6E6E1', background: '#F4F3EF' }}
      >
        <span
          className="text-[10px] font-bold uppercase tracking-[0.08em] px-2.5 py-0.5 rounded-full"
          style={{
            background: status.bg,
            color: status.color,
            border: `1px solid ${status.color}30`,
          }}
        >
          {status.label}
        </span>
        <span className="text-[11px] font-bold ml-auto" style={{ color: '#6B8585' }}>
          {chats.length}
        </span>
        {totalValue > 0 && (
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded"
            style={{ background: status.bg, color: status.color }}
          >
            {fmtBRL(totalValue)}
          </span>
        )}
      </div>

      {/* lista scrollable */}
      <div className="flex-1 min-h-0 overflow-y-auto thin-scroll p-2 flex flex-col gap-2">
        {chats.length === 0 ? (
          <p
            className="text-[11px] text-center py-6 px-2 italic"
            style={{ color: '#A8B5B0' }}
          >
            arraste leads pra cá
          </p>
        ) : (
          chats.map((c) => (
            <KanbanCard
              key={c.id}
              chat={c}
              onOpen={() => onOpenChat(c.id)}
              onSetValue={onSetValue}
            />
          ))
        )}
      </div>
    </div>
  )
}

function inactivityBadge(lastTime: number) {
  if (!lastTime) return null
  const days = Math.floor((Date.now() / 1000 - lastTime) / 86400)
  if (days < 3) return null
  let bg = '#F4F3EF', color = '#8AA09A', label = `${days}d sem mexer`
  if (days >= 14) { bg = '#FEF2F2'; color = '#B91C1C' }
  else if (days >= 7) { bg = '#FFF7ED'; color = '#C2410C' }
  return { bg, color, label }
}

function nextActionBadge(action: string, ts: number) {
  if (!action) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const todayS = today.getTime() / 1000
  let bg = '#EFF6FF', color = '#1D4ED8', prefix = ''
  if (ts) {
    if (ts < todayS) { bg = '#FEF2F2'; color = '#B91C1C'; prefix = '⚠ ' }
    else if (ts < todayS + 86400) { bg = '#FEFCE8'; color = '#A16207'; prefix = 'Hoje · ' }
    else {
      const dd = new Date(ts * 1000)
      prefix = dd.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' · '
    }
  }
  return { bg, color, label: prefix + action }
}

function KanbanCard({
  chat,
  onOpen,
  onSetValue,
}: {
  chat: WaChat
  onOpen: () => void
  onSetValue: (id: string, value: number) => void
}) {
  const [editingValue, setEditingValue] = useState(false)
  const [valueDraft, setValueDraft] = useState('')
  const inactivity = inactivityBadge(chat.lastTime)
  const nextAction = nextActionBadge(chat.nextAction || '', chat.nextActionDate || 0)
  return (
    <div
      onClick={onOpen}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/wa-chat-id', chat.id)
        e.dataTransfer.effectAllowed = 'move'
        const el = e.currentTarget as HTMLDivElement
        requestAnimationFrame(() => { el.style.opacity = '0.4' })
      }}
      onDragEnd={(e) => {
        ;(e.currentTarget as HTMLDivElement).style.opacity = '1'
      }}
      className="rounded-xl p-3 cursor-grab active:cursor-grabbing transition-all hover:-translate-y-0.5"
      style={{
        background: '#FFFFFF',
        border: '1px solid #E6E6E1',
        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
      }}
    >
      <div className="flex items-start gap-2 mb-2">
        <Avatar chatId={chat.id} name={chat.name} isGroup={chat.isGroup} />
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-bold truncate" style={{ color: '#162322' }}>
            {chat.name}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <p className="text-[10px]" style={{ color: '#A8B5B0' }}>
              {fmtTime(chat.lastTime)}
            </p>
            {inactivity && (
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                style={{ background: inactivity.bg, color: inactivity.color }}
              >
                {inactivity.label}
              </span>
            )}
          </div>
        </div>
      </div>
      {nextAction && (
        <div
          className="text-[10px] font-semibold mb-2 px-2 py-1 rounded flex items-center gap-1"
          style={{ background: nextAction.bg, color: nextAction.color }}
          title="Próxima ação programada"
        >
          📌 {nextAction.label}
        </div>
      )}
      {chat.lastText && (
        <p className="text-[11px] line-clamp-2 mb-2" style={{ color: '#6B8585' }}>
          {chat.fromMeLast && (
            <span style={{ color: '#A8B5B0' }}>Você: </span>
          )}
          {chat.lastText}
        </p>
      )}
      <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-1.5 flex-wrap">
        {editingValue ? (
          <input
            autoFocus
            type="number"
            placeholder="0"
            value={valueDraft}
            onChange={(e) => setValueDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onSetValue(chat.id, Math.max(0, Math.round(Number(valueDraft) || 0)))
                setEditingValue(false)
              } else if (e.key === 'Escape') {
                setEditingValue(false)
              }
            }}
            onBlur={() => {
              onSetValue(chat.id, Math.max(0, Math.round(Number(valueDraft) || 0)))
              setEditingValue(false)
            }}
            className="w-20 text-[10px] font-bold px-2 py-0.5 rounded outline-none"
            style={{ background: '#F4F3EF', border: '1px solid #C8D8D4', color: '#162322' }}
          />
        ) : (
          <button
            onClick={() => {
              setValueDraft(chat.value ? String(chat.value) : '')
              setEditingValue(true)
            }}
            className="text-[10px] font-bold px-2 py-0.5 rounded transition-all"
            style={{
              background: chat.value ? '#0D3839' : 'transparent',
              color: chat.value ? '#F4F99D' : '#A8B5B0',
              border: chat.value ? 'none' : '1px dashed #C8D8D4',
            }}
          >
            {chat.value ? fmtBRL(chat.value) : '+ R$'}
          </button>
        )}
        {(chat.tags || []).slice(0, 2).map((t) => (
          <span
            key={t}
            className="text-[9px] px-1.5 py-0.5 rounded"
            style={{ background: '#F4F3EF', color: '#6B8585' }}
          >
            {t}
          </span>
        ))}
        {(chat.tags || []).length > 2 && (
          <span className="text-[9px]" style={{ color: '#A8B5B0' }}>
            +{(chat.tags || []).length - 2}
          </span>
        )}
      </div>
    </div>
  )
}

/* ── main ────────────────────────────────────────────── */

export default function LeadsView() {
  const router = useRouter()
  const [chats, setChats] = useState<WaChat[]>([])
  const [serverOff, setServerOff] = useState(false)
  const [includeGroups, setIncludeGroups] = useState(false)
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'recent' | 'value' | 'name'>('recent')
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>(
    () => (typeof window !== 'undefined' && (localStorage.getItem('fysi.leads.view') as 'kanban' | 'list')) || 'kanban'
  )
  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem('fysi.leads.view', viewMode)
  }, [viewMode])
  const { show: showToast, Toast } = useToast()

  async function load() {
    try {
      const cs = await waServer.chats()
      setChats(cs)
      setServerOff(false)
    } catch {
      setServerOff(true)
    }
  }

  useEffect(() => {
    load()
    const iv = setInterval(load, 6000)
    return () => clearInterval(iv)
  }, [])

  async function handleSetStatus(id: string, status: string) {
    const prev = chats.find((c) => c.id === id)
    if (prev?.status === status) return
    const meta = STATUS_META[status]
    // otimista
    setChats((cs) => cs.map((c) => (c.id === id ? { ...c, status } : c)))
    if (prev && meta) {
      showToast(`${prev.name} → ${meta.label}`)
    }
    try {
      await waServer.setStatus(id, status)
    } catch {
      load()
      showToast('Erro ao mudar etapa — desfazendo', { kind: 'error' })
    }
  }

  async function handleSetValue(id: string, value: number) {
    const prev = chats.find((c) => c.id === id)
    if (!prev || prev.value === value) return
    setChats((cs) => cs.map((c) => (c.id === id ? { ...c, value } : c)))
    try {
      await waServer.updateChat(id, { value })
      showToast(
        value > 0
          ? `Valor: ${value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
          : 'Valor removido'
      )
    } catch {
      load()
      showToast('Erro ao salvar valor', { kind: 'error' })
    }
  }

  function openChat(id: string) {
    router.push(`/admin/inbox?chat=${encodeURIComponent(id)}`)
  }

  const q = search.trim().toLowerCase()
  const filteredChats = (includeGroups ? chats : chats.filter((c) => !c.isGroup))
    .filter((c) => !c.archived)
    .filter((c) => !tagFilter || (c.tags || []).includes(tagFilter))
    .filter((c) => !q || c.name.toLowerCase().includes(q) || (c.notes || '').toLowerCase().includes(q))
    .sort((a, b) => {
      if (sortBy === 'value') return (b.value || 0) - (a.value || 0)
      if (sortBy === 'name') return a.name.localeCompare(b.name, 'pt-BR')
      return (b.lastTime || 0) - (a.lastTime || 0) // recent (default)
    })

  // todas as etiquetas em uso, com contagem
  const allTags: [string, number][] = (() => {
    const m = new Map<string, number>()
    for (const c of chats) {
      if (c.archived) continue
      if (!includeGroups && c.isGroup) continue
      for (const t of c.tags || []) m.set(t, (m.get(t) || 0) + 1)
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  })()

  const byStatus: Record<string, WaChat[]> = {}
  for (const s of LEAD_STATUSES) byStatus[s.id] = []
  for (const c of filteredChats) {
    const key = byStatus[c.status] ? c.status : 'LEAD'
    byStatus[key].push(c)
  }

  // total geral: soma de todos os leads, excluindo PERDIDA
  const totalPipeline = filteredChats
    .filter((c) => c.status !== 'PERDIDA')
    .reduce((sum, c) => sum + (Number(c.value) || 0), 0)
  const totalClosed = (byStatus.FECHADO || []).reduce(
    (sum, c) => sum + (Number(c.value) || 0),
    0
  )

  return (
    <div className="flex-1 min-h-0 flex flex-col relative" style={{ background: '#FAFAF8' }}>
      <Toast />
      {/* hero compacto e fixo no topo (pra dar espaço pro kanban) */}
      <div className="px-8 pt-8 pb-4 flex-shrink-0">
        {/* hero */}
        <div className="flex items-end justify-between gap-4 mb-8 flex-wrap">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8AA09A] mb-3">
              PIPELINE · LEADS
            </p>
            <h1
              className="leading-none tracking-tight"
              style={{
                fontFamily: '"ivypresto-display", Georgia, serif',
                fontStyle: 'italic',
                fontWeight: 300,
                fontSize: 'clamp(2.2rem, 4.5vw, 3rem)',
                color: '#162322',
              }}
            >
              Leads
            </h1>
            <p className="text-[13px] text-[#6B8585] mt-2">
              Suas conversas organizadas por etapa do funil.
            </p>
            {totalPipeline > 0 && (
              <div className="flex items-center gap-5 mt-4 text-[11px]">
                <div>
                  <p
                    className="font-bold uppercase tracking-[0.14em] text-[10px]"
                    style={{ color: '#8AA09A' }}
                  >
                    Pipeline ativo
                  </p>
                  <p
                    className="font-bold mt-0.5"
                    style={{ color: '#0D3839', fontSize: 18 }}
                  >
                    {fmtBRL(totalPipeline)}
                  </p>
                </div>
                {totalClosed > 0 && (
                  <div>
                    <p
                      className="font-bold uppercase tracking-[0.14em] text-[10px]"
                      style={{ color: '#8AA09A' }}
                    >
                      Fechado
                    </p>
                    <p
                      className="font-bold mt-0.5"
                      style={{ color: '#22C55E', fontSize: 18 }}
                    >
                      {fmtBRL(totalClosed)}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
          <label
            className="flex items-center gap-2 text-[11px] font-semibold text-[#6B8585] cursor-pointer select-none"
            style={{
              background: '#FFFFFF',
              border: '1px solid #E6E6E1',
              padding: '8px 14px',
              borderRadius: 999,
            }}
          >
            <input
              type="checkbox"
              checked={includeGroups}
              onChange={(e) => setIncludeGroups(e.target.checked)}
              className="accent-[#0D3839]"
            />
            Incluir grupos
          </label>
        </div>

        {/* filtro por etiqueta — só aparece se existirem tags em uso */}
        {allTags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap mb-6">
            <span className="text-[10px] uppercase tracking-[0.12em] font-bold text-[#A8B5B0] mr-1">
              Etiquetas:
            </span>
            <button
              onClick={() => setTagFilter(null)}
              className="text-[11px] font-semibold px-3 py-1 rounded-full transition-all"
              style={{
                background: tagFilter === null ? '#0D3839' : '#FFFFFF',
                color: tagFilter === null ? '#F4F99D' : '#6B8585',
                border: '1px solid ' + (tagFilter === null ? '#0D3839' : '#E6E6E1'),
              }}
            >
              Todas
            </button>
            {allTags.slice(0, 10).map(([t, n]) => (
              <button
                key={t}
                onClick={() => setTagFilter(t === tagFilter ? null : t)}
                className="text-[11px] font-semibold px-3 py-1 rounded-full transition-all flex items-center gap-1"
                style={{
                  background: t === tagFilter ? '#0D3839' : '#FFFFFF',
                  color: t === tagFilter ? '#F4F99D' : '#6B8585',
                  border:
                    '1px solid ' + (t === tagFilter ? '#0D3839' : '#E6E6E1'),
                }}
              >
                <Tag size={10} />
                {t}
                <span
                  className="text-[10px] opacity-70"
                  style={{ color: t === tagFilter ? '#F4F99D' : '#A8B5B0' }}
                >
                  {n}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* nova linha: busca + sort */}
        <div className="flex items-center gap-2 mt-4 flex-wrap">
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 min-w-[220px]"
            style={{ background: '#FFFFFF', border: '1px solid #E6E6E1' }}
          >
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar lead por nome ou nota…"
              className="flex-1 bg-transparent text-[13px] outline-none"
              style={{ color: '#162322' }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="text-[10px] opacity-60 hover:opacity-100"
              >
                ✕
              </button>
            )}
          </div>
          <div
            className="flex items-center gap-1 px-2 py-1.5 rounded-xl"
            style={{ background: '#FFFFFF', border: '1px solid #E6E6E1' }}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#A8B5B0] px-1">Ordenar:</span>
            {(['recent', 'value', 'name'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSortBy(s)}
                className="text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors"
                style={{
                  background: sortBy === s ? '#0D3839' : 'transparent',
                  color: sortBy === s ? '#F4F99D' : '#6B8585',
                }}
              >
                {s === 'recent' ? 'Recente' : s === 'value' ? 'Valor' : 'Nome'}
              </button>
            ))}
          </div>
          {/* toggle de layout (kanban × lista) */}
          <div
            className="flex items-center gap-1 px-2 py-1.5 rounded-xl"
            style={{ background: '#FFFFFF', border: '1px solid #E6E6E1' }}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#A8B5B0] px-1">Vista:</span>
            <button
              onClick={() => setViewMode('kanban')}
              className="text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
              style={{
                background: viewMode === 'kanban' ? '#0D3839' : 'transparent',
                color: viewMode === 'kanban' ? '#F4F99D' : '#6B8585',
              }}
              title="Quadro horizontal estilo Trello"
            >
              ◫ Kanban
            </button>
            <button
              onClick={() => setViewMode('list')}
              className="text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
              style={{
                background: viewMode === 'list' ? '#0D3839' : 'transparent',
                color: viewMode === 'list' ? '#F4F99D' : '#6B8585',
              }}
              title="Lista vertical compacta com grupos colapsáveis"
            >
              ☰ Lista
            </button>
          </div>
        </div>
      </div>

      {/* kanban horizontal */}
      {serverOff ? (
        <div className="px-8 pb-8">
          <div
            className="rounded-2xl p-6 text-[13px] font-semibold"
            style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#B91C1C' }}
          >
            Servidor do WhatsApp offline. Verifique o container <code>wa-server</code> na VPS.
          </div>
        </div>
      ) : viewMode === 'kanban' ? (
        <div
          className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden thin-scroll"
          style={{ paddingBottom: 16 }}
        >
          <div className="flex gap-3 h-full px-8 pb-2" style={{ minWidth: 'fit-content' }}>
            {LEAD_STATUSES.map((s) => (
              <KanbanColumn
                key={s.id}
                status={s}
                chats={byStatus[s.id] || []}
                onOpenChat={openChat}
                onSetStatus={handleSetStatus}
                onSetValue={handleSetValue}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto thin-scroll px-8 pb-8">
          <div className="max-w-5xl mx-auto">
            {LEAD_STATUSES.map((s) => (
              <StatusGroup
                key={s.id}
                status={s}
                chats={byStatus[s.id] || []}
                onOpenChat={openChat}
                onSetStatus={handleSetStatus}
                onSetValue={handleSetValue}
                initialOpen={
                  ['LEAD', 'AGUARDANDO', 'PROPOSTA'].includes(s.id) ||
                  (byStatus[s.id] || []).length > 0
                }
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
