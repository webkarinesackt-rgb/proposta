'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Users, ChevronDown, ChevronRight, Tag } from 'lucide-react'
import { waServer, WaChat, LEAD_STATUSES, LEAD_SOURCES, STATUS_META } from '@/lib/waServer'
import { proposalStore } from '@/lib/proposalStore'
import { Proposal } from '@/lib/types'

// últimos 8 dígitos do telefone — casa número ignorando +55/DDD/formatação
function phoneKey(s: string): string {
  const d = (s || '').replace(/\D/g, '')
  return d.length >= 8 ? d.slice(-8) : ''
}
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

// "resp:<nome>" é o responsável (multi-atendimento), não uma etiqueta comum —
// tem selo próprio e não deve aparecer entre as etiquetas da lista/kanban.
const RESP_COLORS: Record<string, { bg: string; color: string }> = {
  Karine: { bg: '#E7EEF9', color: '#2456A6' },
  Tainá: { bg: '#F3E7F7', color: '#7A2FA0' },
}
function respMeta(nome: string) {
  return RESP_COLORS[nome] || { bg: '#EEF3E0', color: '#4A5A2A' }
}
function getResponsavel(chat: WaChat): string | null {
  const t = (chat.tags || []).find((x) => x.startsWith('resp:'))
  return t ? t.slice('resp:'.length) : null
}
// Colunas do Kanban feitas por etiqueta (sem depender do servidor). Um card
// com a etiqueta aparece na coluna correspondente, saindo da coluna de etapa.
const VIRTUAL_COLS = [
  { id: '__followup', tag: 'followup', label: 'Follow-up', color: '#7A2FA0', bg: '#F1E6F8', after: 'PROPOSTA' },
  { id: '__alunos', tag: 'alunos', label: 'Alunos', color: '#B45309', bg: '#FDECD3', after: '__end' },
] as const
const VIRTUAL_TAGS = VIRTUAL_COLS.map((v) => v.tag) as string[]

function visibleTags(chat: WaChat): string[] {
  // 'followup' é mecanismo de coluna, não etiqueta pra exibir
  return (chat.tags || []).filter((t) => !t.startsWith('resp:') && t !== 'followup')
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
        color: '#9B9B9B',
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
  const btnRef = useRef<HTMLButtonElement>(null)
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number } | null>(null)
  const meta = STATUS_META[status] || STATUS_META.LEAD
  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={(e) => {
          e.stopPropagation()
          if (open) {
            setOpen(false)
            return
          }
          // menu com position: fixed ancorado ao botão — escapa do overflow da
          // coluna do Kanban (que cortava o menu nos cards de baixo). Abre pra
          // cima se não couber embaixo.
          const r = btnRef.current?.getBoundingClientRect()
          if (r) {
            const menuH = 320
            const menuW = 224
            const up = r.bottom + menuH > window.innerHeight && r.top > menuH
            // left preso ao botão, mas clampado na tela (não sai pela esquerda
            // nos cards da coluna da esquerda, nem pela direita).
            const left = Math.min(Math.max(8, r.left), window.innerWidth - menuW - 8)
            setPos({
              top: up ? undefined : r.bottom + 6,
              bottom: up ? window.innerHeight - r.top + 6 : undefined,
              left,
            })
          }
          setOpen(true)
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
      {open && pos && createPortal(
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={(e) => {
              e.stopPropagation()
              setOpen(false)
            }}
          />
          <div
            className="fixed z-50 w-56 max-h-[70vh] overflow-y-auto rounded-xl py-1"
            style={{
              top: pos.top,
              bottom: pos.bottom,
              left: pos.left,
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
                  <span className="ml-auto text-[10px] text-[#9B9B9B]">atual</span>
                )}
              </button>
            ))}
          </div>
        </>,
        document.body,
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
          <span className="text-[13px] font-semibold text-[#141414] truncate flex items-center gap-1.5">
            {(() => {
              const resp = getResponsavel(chat)
              return resp ? (
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
              ) : null
            })()}
            <span className="truncate">{chat.name}</span>
          </span>
          <span className="text-[10px] text-[#A8B5B0] flex-shrink-0">
            {fmtTime(chat.lastTime)}
          </span>
        </div>
        <p className="text-[12px] text-[#9B9B9B] truncate mt-0.5">
          {chat.fromMeLast && (
            <span className="text-[#A8B5B0]">Você: </span>
          )}
          {chat.lastText || '—'}
        </p>
        {visibleTags(chat).length > 0 && (
          <div className="flex items-center gap-1 mt-1 flex-wrap">
            {visibleTags(chat).slice(0, 3).map((t) => (
              <span
                key={t}
                className="text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none"
                style={{ background: '#EEF3E0', color: '#4A5A2A' }}
              >
                {t}
              </span>
            ))}
            {visibleTags(chat).length > 3 && (
              <span className="text-[9px] font-bold text-[#A8B5B0]">
                +{visibleTags(chat).length - 3}
              </span>
            )}
          </div>
        )}
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
              color: '#141414',
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
              background: chat.value ? '#141414' : 'transparent',
              color: chat.value ? '#D6F23C' : '#A8B5B0',
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
        <span className="text-[12px] text-[#9B9B9B] font-semibold">
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
  col,
  chats,
  onOpenChat,
  onDropChat,
  onSetStatus,
  onSetValue,
}: {
  col: { id: string; label: string; color: string; bg: string }
  chats: WaChat[]
  onOpenChat: (id: string) => void
  onDropChat: (id: string) => void
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
        if (id) onDropChat(id)
      }}
      className="flex flex-col rounded-2xl overflow-hidden transition-all"
      style={{
        width: 304,
        minWidth: 304,
        background: dragOver ? col.bg : '#F4F3EF',
        border: dragOver
          ? `2px dashed ${col.color}`
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
            background: col.bg,
            color: col.color,
            border: `1px solid ${col.color}30`,
          }}
        >
          {col.label}
        </span>
        <span className="text-[11px] font-bold ml-auto" style={{ color: '#6E6E6E' }}>
          {chats.length}
        </span>
        {totalValue > 0 && (
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded"
            style={{ background: col.bg, color: col.color }}
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
              onSetStatus={onSetStatus}
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
  let bg = '#F4F3EF', color = '#9B9B9B', label = `${days}d sem mexer`
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

/** true se o lead tem uma próxima ação marcada pra hoje ou atrasada. */
function isFollowupDue(chat: WaChat) {
  if (!chat.nextAction) return false
  const ts = chat.nextActionDate || 0
  if (!ts) return false
  const endOfToday = new Date()
  endOfToday.setHours(23, 59, 59, 999)
  return ts <= endOfToday.getTime() / 1000
}

function KanbanCard({
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
          <p className="text-[12px] font-bold truncate flex items-center gap-1.5" style={{ color: '#141414' }}>
            {(() => {
              const resp = getResponsavel(chat)
              return resp ? (
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
              ) : null
            })()}
            <span className="truncate">{chat.name}</span>
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
        <p className="text-[11px] line-clamp-2 mb-2" style={{ color: '#6E6E6E' }}>
          {chat.fromMeLast && (
            <span style={{ color: '#A8B5B0' }}>Você: </span>
          )}
          {chat.lastText}
        </p>
      )}
      <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-1.5 flex-wrap">
        {/* toque pra mudar de etapa — no celular não dá pra arrastar */}
        <StatusBadge
          status={chat.status}
          onChange={(s) => onSetStatus(chat.id, s)}
        />
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
            style={{ background: '#F4F3EF', border: '1px solid #C8D8D4', color: '#141414' }}
          />
        ) : (
          <button
            onClick={() => {
              setValueDraft(chat.value ? String(chat.value) : '')
              setEditingValue(true)
            }}
            className="text-[10px] font-bold px-2 py-0.5 rounded transition-all"
            style={{
              background: chat.value ? '#141414' : 'transparent',
              color: chat.value ? '#D6F23C' : '#A8B5B0',
              border: chat.value ? 'none' : '1px dashed #C8D8D4',
            }}
          >
            {chat.value ? fmtBRL(chat.value) : '+ R$'}
          </button>
        )}
        {chat.source && (
          <span
            className="text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5"
            style={{ background: '#EAF1FB', color: '#2456A6' }}
            title={`Origem: ${chat.source}`}
          >
            📍 {chat.source}
          </span>
        )}
        {visibleTags(chat).slice(0, 2).map((t) => (
          <span
            key={t}
            className="text-[9px] px-1.5 py-0.5 rounded"
            style={{ background: '#F4F3EF', color: '#6E6E6E' }}
          >
            {t}
          </span>
        ))}
        {visibleTags(chat).length > 2 && (
          <span className="text-[9px]" style={{ color: '#A8B5B0' }}>
            +{visibleTags(chat).length - 2}
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
  const [includePessoal, setIncludePessoal] = useState(false) // etiqueta "pessoal" oculta por padrão
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [onlyFollowups, setOnlyFollowups] = useState(false)
  const [respFilter, setRespFilter] = useState<string | null>(null) // multi-atendimento
  const [sourceFilter, setSourceFilter] = useState<string | null>(null) // origem do lead
  const [sourceMenuOpen, setSourceMenuOpen] = useState(false)
  const [proposals, setProposals] = useState<Proposal[]>([]) // p/ casar contato↔proposta
  const [proposalFilter, setProposalFilter] = useState<'all' | 'com' | 'sem'>('all')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'recent' | 'value' | 'name'>('recent')
  // janela de atividade: só mostra leads mexidos nos últimos N dias (0 = todos).
  // Evita carregar milhares de cards de uma vez. Fica salvo por navegador.
  const [activityDays, setActivityDays] = useState<number>(() => {
    if (typeof window === 'undefined') return 30
    const v = localStorage.getItem('fysi.leads.activityDays')
    return v === null ? 30 : Number(v)
  })
  useEffect(() => {
    if (typeof window !== 'undefined')
      localStorage.setItem('fysi.leads.activityDays', String(activityDays))
  }, [activityDays])
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>(
    () => (typeof window !== 'undefined' && (localStorage.getItem('fysi.leads.view') as 'kanban' | 'list')) || 'kanban'
  )
  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem('fysi.leads.view', viewMode)
  }, [viewMode])
  const { show: showToast, Toast } = useToast()

  // propostas: casa por telefone (client_whatsapp) OU por linkedProposalId
  useEffect(() => {
    proposalStore.getAll().then(setProposals).catch(() => {})
  }, [])
  const propByPhone = useMemo(() => {
    const m = new Map<string, Proposal>()
    for (const p of proposals) {
      const k = phoneKey(p.client_whatsapp || '')
      if (k && !m.has(k)) m.set(k, p)
    }
    return m
  }, [proposals])
  const propById = useMemo(() => new Map(proposals.map((p) => [p.id, p])), [proposals])
  const matchedProposal = useCallback(
    (c: WaChat): Proposal | null => {
      if (c.linkedProposalId && propById.has(c.linkedProposalId)) return propById.get(c.linkedProposalId)!
      const k = phoneKey(c.id.split('@')[0])
      return (k && propByPhone.get(k)) || null
    },
    [propById, propByPhone]
  )

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
    let iv: ReturnType<typeof setInterval> | null = null
    function start() {
      if (iv != null) return
      load()
      iv = setInterval(load, 10000) // antes 6s; 10s é suficiente pro kanban
    }
    function stop() {
      if (iv == null) return
      clearInterval(iv); iv = null
    }
    function onVis() {
      if (document.hidden) stop()
      else start()
    }
    start()
    document.addEventListener('visibilitychange', onVis)
    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVis)
    }
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

  // arrastar pra uma ETAPA: define status e tira das colunas por etiqueta
  async function handleDropToStatus(id: string, status: string) {
    const prev = chats.find((c) => c.id === id)
    const hadVirtual = (prev?.tags || []).some((t) => VIRTUAL_TAGS.includes(t))
    if (prev?.status === status && !hadVirtual) return
    const nextTags = (prev?.tags || []).filter((t) => !VIRTUAL_TAGS.includes(t))
    setChats((cs) => cs.map((c) => (c.id === id ? { ...c, status, tags: nextTags } : c)))
    try {
      await waServer.updateChat(id, { status, tags: nextTags })
    } catch {
      load()
      showToast('Erro ao mover — desfazendo', { kind: 'error' })
    }
  }

  // arrastar pra uma COLUNA por etiqueta (follow-up/alunos): marca a etiqueta
  async function handleDropToVirtual(id: string, tag: string) {
    const prev = chats.find((c) => c.id === id)
    const cur = prev?.tags || []
    if (cur.includes(tag) && cur.filter((t) => VIRTUAL_TAGS.includes(t)).length === 1) return
    const nextTags = [...cur.filter((t) => !VIRTUAL_TAGS.includes(t)), tag]
    setChats((cs) => cs.map((c) => (c.id === id ? { ...c, tags: nextTags } : c)))
    try {
      await waServer.updateChat(id, { tags: nextTags })
    } catch {
      load()
      showToast('Erro ao mover — desfazendo', { kind: 'error' })
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

  // 1500+ chats: filter→filter→filter→sort em todo render do componente
  // (qualquer keystroke do search, drag, modal abrindo) era visível como jank.
  const filteredChats = useMemo(() => {
    const q = search.trim().toLowerCase()
    const out: WaChat[] = []
    for (const c of chats) {
      if (c.archived) continue
      if (!includePessoal && (c.tags || []).includes('pessoal')) continue
      if (!includeGroups && c.isGroup) continue
      if (tagFilter && !(c.tags || []).includes(tagFilter)) continue
      if (respFilter && getResponsavel(c) !== respFilter) continue
      if (sourceFilter) {
        const src = (c.source || '').trim()
        if (sourceFilter === '__none__' ? src !== '' : src !== sourceFilter) continue
      }
      if (onlyFollowups && !isFollowupDue(c)) continue
      if (proposalFilter !== 'all') {
        const has = !!matchedProposal(c)
        if (proposalFilter === 'com' ? !has : has) continue
      }
      // janela de atividade: no browse padrão mostra só leads recentes (rápido).
      // Busca e filtros explícitos (etiqueta/responsável/follow-up) veem tudo.
      // Exceção: cards em coluna por etiqueta (follow-up/alunos) sempre aparecem,
      // mesmo antigos — senão sumiriam da própria coluna onde você os colocou.
      if (activityDays > 0 && !q && !tagFilter && !respFilter && !sourceFilter && !onlyFollowups) {
        const inVirtualCol = (c.tags || []).some((t) => VIRTUAL_TAGS.includes(t))
        if (!inVirtualCol) {
          const cutoff = Date.now() / 1000 - activityDays * 86400
          if ((c.lastTime || 0) < cutoff) continue
        }
      }
      if (q) {
        const phone = c.id.split('@')[0]
        const hay = [c.name, c.notes || '', c.email || '', phone, (c.tags || []).join(' ')]
          .join(' ')
          .toLowerCase()
        if (!hay.includes(q)) continue
      }
      out.push(c)
    }
    out.sort((a, b) => {
      if (sortBy === 'value') return (b.value || 0) - (a.value || 0)
      if (sortBy === 'name') return a.name.localeCompare(b.name, 'pt-BR')
      return (b.lastTime || 0) - (a.lastTime || 0)
    })
    return out
  }, [chats, includeGroups, includePessoal, tagFilter, respFilter, sourceFilter, proposalFilter, matchedProposal, onlyFollowups, search, sortBy, activityDays])

  // contagem de leads por origem (pra ver de onde vem mais)
  const sourceCounts = useMemo(() => {
    const m = new Map<string, number>()
    for (const c of chats) {
      if (c.archived) continue
      if (!includeGroups && c.isGroup) continue
      if ((c.tags || []).includes('pessoal')) continue
      const src = (c.source || '').trim()
      if (src) m.set(src, (m.get(src) || 0) + 1)
    }
    return m
  }, [chats, includeGroups])

  const followupCount = useMemo(
    () =>
      chats.filter(
        (c) => !c.archived && (includeGroups || !c.isGroup) && isFollowupDue(c)
      ).length,
    [chats, includeGroups]
  )

  const allTags = useMemo<[string, number][]>(() => {
    const m = new Map<string, number>()
    for (const c of chats) {
      if (c.archived) continue
      if (!includeGroups && c.isGroup) continue
      for (const t of visibleTags(c)) m.set(t, (m.get(t) || 0) + 1)
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [chats, includeGroups])

  // bucketing + totais numa única passada (evita 3 loops separados)
  const { byStatus, totalPipeline, totalClosed } = useMemo(() => {
    const buckets: Record<string, WaChat[]> = {}
    for (const s of LEAD_STATUSES) buckets[s.id] = []
    let pipeline = 0
    let closed = 0
    for (const c of filteredChats) {
      const key = buckets[c.status] ? c.status : 'LEAD'
      buckets[key].push(c)
      const v = Number(c.value) || 0
      if (c.status !== 'PERDIDA') pipeline += v
      if (c.status === 'FECHADO') closed += v
    }
    return { byStatus: buckets, totalPipeline: pipeline, totalClosed: closed }
  }, [filteredChats])

  // Kanban: cards com etiqueta de coluna (followup/alunos) saem da etapa e vão
  // pra coluna própria. (A visão em lista continua usando byStatus, por etapa.)
  const kanban = useMemo(() => {
    const status: Record<string, WaChat[]> = {}
    for (const s of LEAD_STATUSES) status[s.id] = []
    const virt: Record<string, WaChat[]> = {}
    for (const v of VIRTUAL_COLS) virt[v.tag] = []
    for (const c of filteredChats) {
      const vt = VIRTUAL_COLS.find((v) => (c.tags || []).includes(v.tag))
      // Se você está FILTRANDO justamente por essa etiqueta (ex: clicou em
      // Alunos), mostra os cards nas colunas do funil (visíveis na tela) em vez
      // de jogá-los na coluna virtual lá no fim.
      if (vt && vt.tag !== tagFilter) {
        virt[vt.tag].push(c)
        continue
      }
      ;(status[c.status] || status.LEAD).push(c)
    }
    return { status, virt }
  }, [filteredChats, tagFilter])

  return (
    <div className="flex-1 min-h-0 flex flex-col relative" style={{ background: '#FAFAF8' }}>
      <Toast />
      {/* hero compacto e fixo no topo (pra dar espaço pro kanban) */}
      <div className="px-4 sm:px-8 pt-6 sm:pt-8 pb-4 flex-shrink-0">
        {/* hero */}
        <div className="flex items-end justify-between gap-4 mb-8 flex-wrap">
          <div>
            <h1
              className="leading-none"
              style={{
                fontFamily: 'var(--font-inter), Inter, sans-serif',
                fontStyle: 'normal',
                fontWeight: 800,
                letterSpacing: '-0.03em',
                fontSize: 'clamp(1.9rem, 4vw, 2.6rem)',
                color: '#141414',
              }}
            >
              Leads
            </h1>
            <p className="text-[13px] text-[#6E6E6E] mt-2">
              Suas conversas organizadas por etapa do funil.
            </p>
            {totalPipeline > 0 && (
              <div className="flex items-center gap-5 mt-4 text-[11px]">
                <div>
                  <p
                    className="font-bold uppercase tracking-[0.14em] text-[10px]"
                    style={{ color: '#9B9B9B' }}
                  >
                    Pipeline ativo
                  </p>
                  <p
                    className="font-bold mt-0.5"
                    style={{ color: '#141414', fontSize: 18 }}
                  >
                    {fmtBRL(totalPipeline)}
                  </p>
                </div>
                {totalClosed > 0 && (
                  <div>
                    <p
                      className="font-bold uppercase tracking-[0.14em] text-[10px]"
                      style={{ color: '#9B9B9B' }}
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
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setOnlyFollowups((v) => !v)}
              title="Mostrar só leads com follow-up pra hoje ou atrasado"
              className="flex items-center gap-2 text-[11px] font-semibold select-none transition-all"
              style={{
                background: onlyFollowups ? '#141414' : '#FFFFFF',
                color: onlyFollowups ? '#D6F23C' : '#6E6E6E',
                border: '1px solid ' + (onlyFollowups ? '#141414' : '#E6E6E1'),
                padding: '8px 14px',
                borderRadius: 999,
              }}
            >
              ⏰ Follow-ups
              {followupCount > 0 && (
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{
                    background: onlyFollowups ? '#D6F23C' : '#FEF2F2',
                    color: onlyFollowups ? '#141414' : '#B91C1C',
                  }}
                >
                  {followupCount}
                </span>
              )}
            </button>
            {(() => {
              const on = tagFilter === 'alunos'
              const n = (allTags.find(([t]) => t === 'alunos') || [, 0])[1] as number
              return (
                <button
                  onClick={() => setTagFilter(on ? null : 'alunos')}
                  title="Mostrar só os leads com etiqueta alunos"
                  className="flex items-center gap-2 text-[11px] font-semibold select-none transition-all"
                  style={{
                    background: on ? '#141414' : '#FFFFFF',
                    color: on ? '#D6F23C' : '#6E6E6E',
                    border: '1px solid ' + (on ? '#141414' : '#E6E6E1'),
                    padding: '8px 14px',
                    borderRadius: 999,
                  }}
                >
                  🎓 Alunos
                  {n > 0 && (
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{
                        background: on ? '#D6F23C' : '#EEF3E0',
                        color: on ? '#141414' : '#4A5A2A',
                      }}
                    >
                      {n}
                    </span>
                  )}
                </button>
              )
            })()}
            {/* janela de atividade — evita carregar todos os leads de uma vez */}
            <div
              className="flex items-center gap-1 p-0.5 rounded-full"
              style={{ background: '#FFFFFF', border: '1px solid #E6E6E1' }}
              title="Mostra só leads mexidos nos últimos X dias (busca e filtros veem tudo)"
            >
              {([
                { d: 7, label: '7d' },
                { d: 30, label: '30d' },
                { d: 90, label: '90d' },
                { d: 0, label: 'Tudo' },
              ] as const).map((o) => {
                const active = activityDays === o.d
                return (
                  <button
                    key={o.d}
                    onClick={() => setActivityDays(o.d)}
                    className="text-[11px] font-bold px-2.5 py-1 rounded-full transition-all"
                    style={{
                      background: active ? '#141414' : 'transparent',
                      color: active ? '#D6F23C' : '#6E6E6E',
                    }}
                  >
                    {o.label}
                  </button>
                )
              })}
            </div>
            <label
              className="flex items-center gap-2 text-[11px] font-semibold text-[#6E6E6E] cursor-pointer select-none"
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
                className="accent-[#141414]"
              />
              Incluir grupos
            </label>
            <label
              className="flex items-center gap-2 text-[11px] font-semibold text-[#6E6E6E] cursor-pointer select-none"
              style={{
                background: '#FFFFFF',
                border: '1px solid #E6E6E1',
                padding: '8px 14px',
                borderRadius: 999,
              }}
              title="Conversas com a etiqueta 'pessoal' ficam ocultas dos Leads. Marque pra vê-las."
            >
              <input
                type="checkbox"
                checked={includePessoal}
                onChange={(e) => setIncludePessoal(e.target.checked)}
                className="accent-[#141414]"
              />
              Incluir pessoais
            </label>

            {/* filtro por responsável (multi-atendimento) */}
            <div
              className="flex items-center gap-1 p-0.5 rounded-full"
              style={{ background: '#FFFFFF', border: '1px solid #E6E6E1' }}
            >
              {(['Karine', 'Tainá'] as const).map((nome) => {
                const active = respFilter === nome
                return (
                  <button
                    key={nome}
                    onClick={() => setRespFilter(active ? null : nome)}
                    title={`Só conversas da ${nome}`}
                    className="text-[11px] font-bold px-2.5 py-1 rounded-full transition-all flex items-center gap-1"
                    style={{
                      background: active ? respMeta(nome).color : 'transparent',
                      color: active ? '#FFFFFF' : '#6E6E6E',
                    }}
                  >
                    <span
                      className="text-[8px] font-bold rounded-full flex items-center justify-center"
                      style={{
                        width: 14,
                        height: 14,
                        background: active ? 'rgba(255,255,255,0.25)' : respMeta(nome).bg,
                        color: active ? '#FFFFFF' : respMeta(nome).color,
                      }}
                    >
                      {nome[0]}
                    </span>
                    {nome}
                  </button>
                )
              })}
            </div>

            {/* filtro por origem do lead */}
            <div className="relative">
              <button
                onClick={() => setSourceMenuOpen((o) => !o)}
                className="flex items-center gap-2 text-[11px] font-semibold select-none transition-all"
                style={{
                  background: sourceFilter ? '#141414' : '#FFFFFF',
                  color: sourceFilter ? '#D6F23C' : '#6E6E6E',
                  border: '1px solid ' + (sourceFilter ? '#141414' : '#E6E6E1'),
                  padding: '8px 14px',
                  borderRadius: 999,
                }}
              >
                📍 {sourceFilter === '__none__' ? 'Sem origem' : sourceFilter || 'Origem'}
              </button>
              {sourceMenuOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setSourceMenuOpen(false)} />
                  <div
                    className="absolute z-40 top-full mt-1.5 left-0 w-56 rounded-xl py-1 max-h-72 overflow-y-auto thin-scroll"
                    style={{ background: '#FFFFFF', border: '1px solid #E6E6E1', boxShadow: '0 12px 32px rgba(0,0,0,0.12)' }}
                  >
                    {sourceFilter && (
                      <button
                        onClick={() => {
                          setSourceFilter(null)
                          setSourceMenuOpen(false)
                        }}
                        className="w-full text-left px-3 py-2 text-[11px] font-bold"
                        style={{ color: '#141414', borderBottom: '1px solid #F0F0EC' }}
                      >
                        Todas as origens
                      </button>
                    )}
                    {LEAD_SOURCES.map((s) => (
                      <button
                        key={s}
                        onClick={() => {
                          setSourceFilter(s)
                          setSourceMenuOpen(false)
                        }}
                        className="w-full text-left px-3 py-2 flex items-center justify-between hover:bg-[#FAFAF8] transition-colors"
                        style={{ background: sourceFilter === s ? '#FAFAF8' : 'transparent' }}
                      >
                        <span className="text-[12px]" style={{ color: '#141414' }}>{s}</span>
                        <span className="text-[10px] font-bold" style={{ color: '#A8B5B0' }}>
                          {sourceCounts.get(s) || 0}
                        </span>
                      </button>
                    ))}
                    <button
                      onClick={() => {
                        setSourceFilter('__none__')
                        setSourceMenuOpen(false)
                      }}
                      className="w-full text-left px-3 py-2 text-[12px] hover:bg-[#FAFAF8] transition-colors"
                      style={{ color: '#6E6E6E', borderTop: '1px solid #F0F0EC' }}
                    >
                      Sem origem definida
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* filtro: já tem proposta? (casa por telefone ou link) */}
            <div
              className="flex items-center gap-1 p-0.5 rounded-full"
              style={{ background: '#FFFFFF', border: '1px solid #E6E6E1' }}
              title="Filtrar leads que já têm (ou não) proposta enviada"
            >
              {([
                { v: 'all', label: 'Todas' },
                { v: 'com', label: 'Com proposta' },
                { v: 'sem', label: 'Sem proposta' },
              ] as const).map((o) => {
                const active = proposalFilter === o.v
                return (
                  <button
                    key={o.v}
                    onClick={() => setProposalFilter(o.v)}
                    className="text-[11px] font-bold px-2.5 py-1 rounded-full transition-all"
                    style={{
                      background: active ? '#0D3839' : 'transparent',
                      color: active ? '#F4F99D' : '#6B8585',
                    }}
                  >
                    {o.label}
                  </button>
                )
              })}
            </div>
          </div>
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
                background: tagFilter === null ? '#141414' : '#FFFFFF',
                color: tagFilter === null ? '#D6F23C' : '#6E6E6E',
                border: '1px solid ' + (tagFilter === null ? '#141414' : '#E6E6E1'),
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
                  background: t === tagFilter ? '#141414' : '#FFFFFF',
                  color: t === tagFilter ? '#D6F23C' : '#6E6E6E',
                  border:
                    '1px solid ' + (t === tagFilter ? '#141414' : '#E6E6E1'),
                }}
              >
                <Tag size={10} />
                {t}
                <span
                  className="text-[10px] opacity-70"
                  style={{ color: t === tagFilter ? '#D6F23C' : '#A8B5B0' }}
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
              placeholder="Buscar por nome, telefone, email, tag ou nota…"
              className="flex-1 bg-transparent text-[13px] outline-none"
              style={{ color: '#141414' }}
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
                  background: sortBy === s ? '#141414' : 'transparent',
                  color: sortBy === s ? '#D6F23C' : '#6E6E6E',
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
                background: viewMode === 'kanban' ? '#141414' : 'transparent',
                color: viewMode === 'kanban' ? '#D6F23C' : '#6E6E6E',
              }}
              title="Quadro horizontal estilo Trello"
            >
              ◫ Kanban
            </button>
            <button
              onClick={() => setViewMode('list')}
              className="text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
              style={{
                background: viewMode === 'list' ? '#141414' : 'transparent',
                color: viewMode === 'list' ? '#D6F23C' : '#6E6E6E',
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
        <div className="px-4 sm:px-8 pb-8">
          <div
            className="rounded-2xl p-6 text-[13px] font-semibold"
            style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#B91C1C' }}
          >
            Servidor do WhatsApp offline. Verifique o container <code>wa-server</code> na VPS.
          </div>
        </div>
      ) : onlyFollowups && filteredChats.length === 0 ? (
        <div className="px-4 sm:px-8 pb-8">
          <div
            className="rounded-2xl p-8 text-center"
            style={{ background: '#FFFFFF', border: '1px dashed #D8D8D0' }}
          >
            <p className="text-[28px] mb-1">⏰</p>
            <p className="text-[15px] font-bold" style={{ color: '#141414' }}>
              Nenhum follow-up marcado ainda
            </p>
            <p className="text-[13px] mt-1.5 max-w-[420px] mx-auto" style={{ color: '#9B9B9B' }}>
              Abra um lead, defina uma <b>próxima ação</b> e uma data — ele aparece
              aqui quando o follow-up estiver pra hoje ou atrasado.
            </p>
            <button
              onClick={() => setOnlyFollowups(false)}
              className="mt-4 text-[12px] font-bold px-4 py-2 rounded-lg"
              style={{ background: '#141414', color: '#D6F23C' }}
            >
              Voltar pro pipeline
            </button>
          </div>
        </div>
      ) : viewMode === 'kanban' ? (
        <div
          className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden thin-scroll"
          style={{ paddingBottom: 16 }}
        >
          <div className="flex gap-3 h-full px-4 sm:px-8 pb-2" style={{ minWidth: 'fit-content' }}>
            {LEAD_STATUSES.flatMap((s) => {
              const cols = [
                <KanbanColumn
                  key={s.id}
                  col={s}
                  chats={kanban.status[s.id] || []}
                  onOpenChat={openChat}
                  onDropChat={(id) => handleDropToStatus(id, s.id)}
                  onSetStatus={handleSetStatus}
                  onSetValue={handleSetValue}
                />,
              ]
              for (const v of VIRTUAL_COLS) {
                if (v.after === s.id) {
                  cols.push(
                    <KanbanColumn
                      key={v.id}
                      col={v}
                      chats={kanban.virt[v.tag] || []}
                      onOpenChat={openChat}
                      onDropChat={(id) => handleDropToVirtual(id, v.tag)}
                      onSetStatus={handleSetStatus}
                      onSetValue={handleSetValue}
                    />,
                  )
                }
              }
              return cols
            })}
            {VIRTUAL_COLS.filter((v) => v.after === '__end').map((v) => (
              <KanbanColumn
                key={v.id}
                col={v}
                chats={kanban.virt[v.tag] || []}
                onOpenChat={openChat}
                onDropChat={(id) => handleDropToVirtual(id, v.tag)}
                onSetStatus={handleSetStatus}
                onSetValue={handleSetValue}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto thin-scroll px-4 sm:px-8 pb-8">
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
