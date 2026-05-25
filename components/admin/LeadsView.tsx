'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Users, ChevronDown, ChevronRight, Tag } from 'lucide-react'
import { waServer, WaChat, LEAD_STATUSES, STATUS_META } from '@/lib/waServer'

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
          src={waServer.photoUrl(chatId)}
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
}: {
  chat: WaChat
  onOpen: () => void
  onSetStatus: (id: string, status: string) => void
}) {
  return (
    <div
      onClick={onOpen}
      className="flex items-center gap-3 px-4 py-2.5 transition-colors cursor-pointer"
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
      <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
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
  initialOpen = true,
}: {
  status: (typeof LEAD_STATUSES)[number]
  chats: WaChat[]
  onOpenChat: (id: string) => void
  onSetStatus: (id: string, status: string) => void
  initialOpen?: boolean
}) {
  const [open, setOpen] = useState(initialOpen)
  return (
    <div
      className="rounded-2xl mb-3 overflow-hidden"
      style={{
        background: '#FFFFFF',
        border: '1px solid #E6E6E1',
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
      </button>
      {open && chats.length > 0 && (
        <div>
          {chats.map((c) => (
            <LeadRow
              key={c.id}
              chat={c}
              onOpen={() => onOpenChat(c.id)}
              onSetStatus={onSetStatus}
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

/* ── main ────────────────────────────────────────────── */

export default function LeadsView() {
  const router = useRouter()
  const [chats, setChats] = useState<WaChat[]>([])
  const [serverOff, setServerOff] = useState(false)
  const [includeGroups, setIncludeGroups] = useState(false)

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
    // otimista
    setChats((cs) => cs.map((c) => (c.id === id ? { ...c, status } : c)))
    try {
      await waServer.setStatus(id, status)
    } catch {
      load()
    }
  }

  function openChat(id: string) {
    router.push(`/admin/inbox?chat=${encodeURIComponent(id)}`)
  }

  const filteredChats = includeGroups
    ? chats
    : chats.filter((c) => !c.isGroup)

  const byStatus: Record<string, WaChat[]> = {}
  for (const s of LEAD_STATUSES) byStatus[s.id] = []
  for (const c of filteredChats) {
    const key = byStatus[c.status] ? c.status : 'LEAD'
    byStatus[key].push(c)
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-8 pt-10 pb-20">
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

        {serverOff && (
          <div
            className="rounded-2xl p-6 mb-4 text-[13px] font-semibold"
            style={{
              background: '#FEF2F2',
              border: '1px solid #FCA5A5',
              color: '#B91C1C',
            }}
          >
            Servidor do WhatsApp offline. Rode <code>npm start</code> em{' '}
            <code>wa-server</code>.
          </div>
        )}

        {chats.length === 0 && !serverOff ? (
          <div
            className="rounded-2xl p-12 text-center flex flex-col items-center gap-3"
            style={{ background: '#FFFFFF', border: '1px solid #E6E6E1' }}
          >
            <Tag size={28} className="text-[#A8B5B0]" />
            <p className="text-[13px] text-[#8AA09A]">
              Sincronizando conversas…
            </p>
          </div>
        ) : (
          LEAD_STATUSES.map((s) => (
            <StatusGroup
              key={s.id}
              status={s}
              chats={byStatus[s.id]}
              onOpenChat={openChat}
              onSetStatus={handleSetStatus}
              initialOpen={
                ['LEAD', 'AGUARDANDO', 'PROPOSTA'].includes(s.id) ||
                byStatus[s.id].length > 0
              }
            />
          ))
        )}
      </div>
    </div>
  )
}
