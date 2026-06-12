'use client'

import { useEffect, useState } from 'react'
import { X, Archive, ArchiveRestore, Users, Crown, ChevronDown } from 'lucide-react'
import { proposalStore } from '@/lib/proposalStore'
import { Proposal } from '@/lib/types'
import {
  waServer,
  WaChat,
  WaChatPatch,
  LEAD_STATUSES,
  LEAD_SOURCES,
} from '@/lib/waServer'

function fmtBRL(v: number) {
  if (!v) return ''
  return v.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  })
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8AA09A] mb-1.5">
        {label}
      </p>
      {children}
    </div>
  )
}

const INPUT =
  'w-full px-3 py-2 rounded-lg text-[13px] outline-none transition-colors'
const INPUT_STYLE = {
  background: '#F4F3EF',
  border: '1px solid #E6E6E1',
  color: '#162322',
}

/* Detalhes de grupo: subject, descrição, lista de participantes com admin badge.
   Lazy-load no mount; só pra chats @g.us. */
function GroupInfo({ chatId }: { chatId: string }) {
  const [data, setData] = useState<Awaited<ReturnType<typeof waServer.groupInfo>> | null>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    waServer
      .groupInfo(chatId)
      .then((r) => {
        if (alive) {
          setData(r)
          setLoading(false)
        }
      })
      .catch(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [chatId])

  if (loading) {
    return (
      <p className="text-[12px] text-[#8AA09A] italic">Carregando dados do grupo…</p>
    )
  }
  if (!data?.ok) {
    return (
      <p className="text-[12px] text-[#EF4444]">
        {data?.error || 'Não foi possível carregar.'}
      </p>
    )
  }

  const sorted = [...(data.participants || [])].sort((a, b) => {
    if (a.isAdmin !== b.isAdmin) return a.isAdmin ? -1 : 1
    return (a.name || a.number).localeCompare(b.name || b.number, 'pt-BR')
  })

  return (
    <div className="flex flex-col gap-2">
      {data.description && (
        <p
          className="text-[12px] text-[#162322] whitespace-pre-wrap rounded-lg px-3 py-2"
          style={{ background: '#F4F3EF', border: '1px solid #E6E6E1' }}
        >
          {data.description}
        </p>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between gap-2 w-full px-3 py-2 rounded-lg text-[12px] font-semibold transition-colors hover:bg-[#F4F3EF]"
        style={{ background: '#FAFAF8', border: '1px solid #E6E6E1', color: '#162322' }}
      >
        <span className="flex items-center gap-2">
          <Users size={13} />
          {data.participantCount} participante{(data.participantCount || 0) > 1 ? 's' : ''}
        </span>
        <ChevronDown
          size={14}
          style={{
            transition: 'transform 0.15s',
            transform: open ? 'rotate(180deg)' : 'none',
          }}
        />
      </button>
      {open && (
        <div
          className="flex flex-col rounded-lg overflow-hidden"
          style={{ border: '1px solid #E6E6E1', maxHeight: 280, overflowY: 'auto' }}
        >
          {sorted.map((p, i) => (
            <div
              key={p.jid}
              className="flex items-center justify-between px-3 py-2 text-[12px]"
              style={{
                borderTop: i > 0 ? '1px solid #F0EFEA' : 'none',
                background: '#FFFFFF',
              }}
            >
              <span className="truncate flex items-center gap-1.5 min-w-0">
                {p.isOwner && (
                  <Crown size={11} style={{ color: '#EAB308', flexShrink: 0 }} />
                )}
                <span className="truncate" style={{ color: '#162322' }}>
                  {p.name || '+' + p.number}
                </span>
              </span>
              {p.isAdmin && (
                <span
                  className="text-[9px] font-bold uppercase tracking-wider flex-shrink-0 px-1.5 py-0.5 rounded"
                  style={{ background: '#FEF3C7', color: '#92400E' }}
                >
                  Admin
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function LeadDetailsPanel({
  chat,
  onClose,
  onUpdated,
}: {
  chat: WaChat
  onClose: () => void
  onUpdated: () => void
}) {
  const [tags, setTags] = useState<string[]>(chat.tags || [])
  const [value, setValue] = useState<string>(chat.value ? String(chat.value) : '')
  const [source, setSource] = useState(chat.source || '')
  const [email, setEmail] = useState(chat.email || '')
  const [notes, setNotes] = useState(chat.notes || '')
  const [nextAction, setNextAction] = useState(chat.nextAction || '')
  const [nextActionDate, setNextActionDate] = useState(
    chat.nextActionDate
      ? new Date(chat.nextActionDate * 1000).toISOString().slice(0, 10)
      : ''
  )
  const [linkedProposalId, setLinkedProposalId] = useState(
    chat.linkedProposalId || ''
  )
  const [newTag, setNewTag] = useState('')
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [savedFlash, setSavedFlash] = useState('')

  // resync quando muda o chat selecionado
  useEffect(() => {
    setTags(chat.tags || [])
    setValue(chat.value ? String(chat.value) : '')
    setSource(chat.source || '')
    setEmail(chat.email || '')
    setNotes(chat.notes || '')
    setNextAction(chat.nextAction || '')
    setNextActionDate(
      chat.nextActionDate
        ? new Date(chat.nextActionDate * 1000).toISOString().slice(0, 10)
        : ''
    )
    setLinkedProposalId(chat.linkedProposalId || '')
  }, [chat.id, chat.tags, chat.value, chat.source, chat.email, chat.notes, chat.linkedProposalId, chat.nextAction, chat.nextActionDate])

  useEffect(() => {
    proposalStore.getAll().then(setProposals).catch(() => {})
  }, [])

  async function patch(p: WaChatPatch) {
    const r = await waServer.updateChat(chat.id, p)
    if (r.ok) {
      setSavedFlash('✓ salvo')
      setTimeout(() => setSavedFlash(''), 1500)
      onUpdated()
    }
  }

  function addTag(t: string) {
    const t2 = t.trim()
    if (!t2 || tags.includes(t2)) return
    const next = [...tags, t2]
    setTags(next)
    patch({ tags: next })
    setNewTag('')
  }

  function removeTag(t: string) {
    const next = tags.filter((x) => x !== t)
    setTags(next)
    patch({ tags: next })
  }

  async function toggleArchive() {
    await patch({ archived: !chat.archived })
  }

  const phone = chat.id.split('@')[0]

  return (
    <div
      className="w-[330px] flex-shrink-0 flex flex-col"
      style={{ background: '#FFFFFF', borderLeft: '1px solid #E6E6E1' }}
    >
      {/* header */}
      <div
        className="px-4 py-3 flex items-center justify-between flex-shrink-0"
        style={{ borderBottom: '1px solid #E6E6E1' }}
      >
        <span className="text-[13px] font-bold text-[#162322]">
          Detalhes do lead
        </span>
        <div className="flex items-center gap-2">
          {savedFlash && (
            <span className="text-[11px] font-semibold text-[#0D7A4A]">
              {savedFlash}
            </span>
          )}
          <button
            onClick={onClose}
            className="text-[#A8B5B0] hover:text-[#162322]"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* body */}
      <div className="flex-1 min-h-0 overflow-y-auto thin-scroll p-4 flex flex-col gap-4">
        {/* contato */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8AA09A] mb-1">
            {chat.isGroup ? 'Grupo' : 'Contato'}
          </p>
          <p className="text-[14px] font-bold text-[#162322] truncate">
            {chat.name}
          </p>
          {!chat.isGroup && (
            <p className="text-[12px] text-[#6B8585]">+{phone}</p>
          )}
        </div>

        {/* info do grupo: descrição + lista de participantes */}
        {chat.isGroup && (
          <Field label="Membros e descrição">
            <GroupInfo chatId={chat.id} />
          </Field>
        )}

        {/* status */}
        <Field label="Etapa do funil">
          <div className="flex flex-wrap gap-1">
            {LEAD_STATUSES.map((s) => {
              const active = chat.status === s.id
              return (
                <button
                  key={s.id}
                  onClick={() => patch({ status: s.id })}
                  className="text-[10px] font-bold uppercase tracking-[0.05em] px-2 py-1 rounded-full transition-all"
                  style={{
                    background: active ? s.bg : '#FAFAF8',
                    color: active ? s.color : '#A8B5B0',
                    border: `1px solid ${active ? s.color + '40' : '#E6E6E1'}`,
                  }}
                >
                  {s.label}
                </button>
              )
            })}
          </div>
        </Field>

        {/* de onde veio */}
        <Field label="De onde veio">
          <input
            list="source-list"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            onBlur={() => source !== chat.source && patch({ source })}
            placeholder="Ex.: Instagram"
            className={INPUT}
            style={INPUT_STYLE}
          />
          <datalist id="source-list">
            {LEAD_SOURCES.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </Field>

        {/* valor */}
        <Field label="Valor estimado (R$)">
          <input
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={() => {
              const v = Number(value) || 0
              if (v !== chat.value) patch({ value: v })
            }}
            placeholder="0"
            className={INPUT}
            style={INPUT_STYLE}
          />
          {!!value && Number(value) > 0 && (
            <p className="text-[11px] text-[#0D7A4A] font-semibold mt-1">
              {fmtBRL(Number(value))}
            </p>
          )}
        </Field>

        {/* proposta vinculada */}
        <Field label="Proposta vinculada">
          <select
            value={linkedProposalId}
            onChange={(e) => {
              setLinkedProposalId(e.target.value)
              patch({ linkedProposalId: e.target.value })
            }}
            className={INPUT}
            style={INPUT_STYLE}
          >
            <option value="">— nenhuma —</option>
            {proposals.map((p) => (
              <option key={p.id} value={p.id}>
                {p.client_name} · {p.status}
              </option>
            ))}
          </select>
          {linkedProposalId &&
            (() => {
              const p = proposals.find((x) => x.id === linkedProposalId)
              if (!p) return null
              return (
                <a
                  href={`/p/${p.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-[#0D3839] underline mt-1 inline-block"
                >
                  abrir proposta →
                </a>
              )
            })()}
        </Field>

        {/* tags */}
        <Field label="Tags">
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-1.5">
              {tags.map((t) => (
                <span
                  key={t}
                  className="text-[10px] font-bold uppercase tracking-[0.05em] px-2 py-0.5 rounded-full flex items-center gap-1"
                  style={{
                    background: '#EFF6FF',
                    color: '#1E40AF',
                    border: '1px solid #BFDBFE',
                  }}
                >
                  {t}
                  <button
                    onClick={() => removeTag(t)}
                    className="hover:text-[#DC2626] flex"
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          )}
          <input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault()
                addTag(newTag)
              }
            }}
            placeholder="+ adicionar tag (Enter)"
            className="w-full px-3 py-1.5 rounded-lg text-[12px] outline-none"
            style={INPUT_STYLE}
          />
        </Field>

        {/* email */}
        <Field label="Email">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => email !== chat.email && patch({ email })}
            placeholder="cliente@email.com"
            className={INPUT}
            style={INPUT_STYLE}
          />
        </Field>

        {/* próxima ação */}
        <Field label="📌 Próxima ação">
          <input
            type="text"
            value={nextAction}
            onChange={(e) => setNextAction(e.target.value)}
            onBlur={() => nextAction !== (chat.nextAction || '') && patch({ nextAction })}
            placeholder='Ex: "Ligar pra confirmar"'
            className={INPUT}
            style={INPUT_STYLE}
          />
          <input
            type="date"
            value={nextActionDate}
            onChange={(e) => {
              setNextActionDate(e.target.value)
              const ts = e.target.value ? Math.floor(new Date(e.target.value).getTime() / 1000) : 0
              if (ts !== (chat.nextActionDate || 0)) patch({ nextActionDate: ts })
            }}
            className={INPUT}
            style={{ ...INPUT_STYLE, marginTop: 6 }}
          />
        </Field>

        {/* notas */}
        <Field label="Notas">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => notes !== chat.notes && patch({ notes })}
            placeholder="Anotações do contato…"
            rows={4}
            className="w-full px-3 py-2 rounded-lg text-[13px] outline-none resize-none"
            style={INPUT_STYLE}
          />
        </Field>

        {/* arquivar */}
        <div className="pt-2" style={{ borderTop: '1px solid #F0F0EC' }}>
          <button
            onClick={toggleArchive}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-[12px] font-bold transition-all"
            style={{
              background: chat.archived ? '#F0FDF4' : '#FAFAF8',
              color: chat.archived ? '#0D7A4A' : '#6B8585',
              border: `1px solid ${chat.archived ? '#86EFAC' : '#E6E6E1'}`,
            }}
          >
            {chat.archived ? (
              <>
                <ArchiveRestore size={13} /> Desarquivar
              </>
            ) : (
              <>
                <Archive size={13} /> Arquivar conversa
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
