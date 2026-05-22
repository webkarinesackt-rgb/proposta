'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { proposalStore } from '@/lib/proposalStore'
import { Proposal, ProposalStatus } from '@/lib/types'
import { Plus, Eye, Copy, Trash2, FileText, Clock, CheckCircle2, XCircle, Mail, Send, Inbox, BarChart3 } from 'lucide-react'

/* ── helpers ─────────────────────────────────────────── */

const STATUS_META: Record<ProposalStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  draft:    { label: 'Rascunho',   color: '#A8B5B0', bg: 'rgba(168,181,176,0.1)',  icon: <FileText size={10} /> },
  sent:     { label: 'Enviada',    color: '#6BA89E', bg: 'rgba(107,168,158,0.12)', icon: <Mail size={10} /> },
  viewed:   { label: 'Visualizada',color: '#8BB7AF', bg: 'rgba(139,183,175,0.12)', icon: <Eye size={10} /> },
  accepted: { label: 'Aceita',     color: '#4CAF7D', bg: 'rgba(76,175,125,0.12)',  icon: <CheckCircle2 size={10} /> },
  rejected: { label: 'Recusada',   color: '#E57373', bg: 'rgba(229,115,115,0.1)',  icon: <XCircle size={10} /> },
  expired:  { label: 'Expirada',   color: '#8D9E9C', bg: 'rgba(141,158,156,0.08)', icon: <Clock size={10} /> },
}

const TYPE_LABEL: Record<string, string> = {
  landing_page:  'Landing Page',
  site_completo: 'Site Completo',
  mensal:        'Mensal',
  custom:        'Custom',
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function isExpired(iso: string) {
  return new Date(iso) < new Date()
}

/* ── stat card ───────────────────────────────────────── */

function Stat({ value, label, accent }: { value: number; label: string; accent?: string }) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: '#FFFFFF', border: '1px solid #E6E6E1' }}
    >
      <p
        className="text-3xl font-bold tracking-tight"
        style={{ color: accent ?? '#162322', fontFamily: 'var(--font-inter)' }}
      >
        {value}
      </p>
      <p className="text-xs mt-1" style={{ color: '#8AA09A' }}>{label}</p>
    </div>
  )
}

/* ── proposal card ───────────────────────────────────── */

function ProposalCard({
  proposal,
  onDelete,
  onCopy,
  onPublish,
}: {
  proposal: Proposal
  onDelete: (id: string) => void
  onCopy: (p: Proposal) => void
  onPublish: (id: string) => void
}) {
  const router = useRouter()
  const meta = STATUS_META[proposal.status] ?? STATUS_META.draft
  const expired = isExpired(proposal.valid_until)
  const isDraft = proposal.status === 'draft'

  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-3 transition-all"
      style={{
        background: '#FFFFFF',
        border: '1px solid #E6E6E1',
      }}
    >
      {/* top row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-bold text-[#162322] truncate leading-tight">
            {proposal.client_name}
          </p>
          {proposal.client_company && (
            <p className="text-[12px] text-[#8AA09A] truncate mt-0.5">{proposal.client_company}</p>
          )}
        </div>
        {/* status badge */}
        <span
          className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full flex-shrink-0"
          style={{ color: meta.color, background: meta.bg }}
        >
          {meta.icon}
          {expired && proposal.status !== 'accepted' ? 'Expirada' : meta.label}
        </span>
      </div>

      {/* info row */}
      <div className="flex items-center gap-4">
        <span
          className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded"
          style={{ background: '#F4F3EF', color: '#8AA09A' }}
        >
          {TYPE_LABEL[proposal.project_type] ?? proposal.project_type}
        </span>
        <span className="text-[11px] text-[#A8B5B0]">
          Válida até {fmt(proposal.valid_until)}
        </span>
      </div>

      {/* plans summary */}
      <div className="flex flex-wrap gap-1.5">
        {proposal.selected_plans.map(p => (
          <span
            key={p.id}
            className="text-[10px] px-2 py-0.5 rounded-full"
            style={{
              background: p.is_recommended ? '#F4F99D' : '#F4F3EF',
              color: p.is_recommended ? '#162322' : '#8AA09A',
              fontWeight: p.is_recommended ? 700 : 500,
            }}
          >
            {p.name}
          </span>
        ))}
      </div>

      {/* actions */}
      <div className="flex items-center gap-2 pt-1 border-t border-[#F0F0EC]">
        <button
          onClick={() => router.push(`/admin/edit/${proposal.id}`)}
          className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-colors hover:bg-[#F4F3EF]"
          style={{ color: '#162322' }}
        >
          Editar
        </button>
        <button
          onClick={() => {
            localStorage.setItem('fysi_draft', JSON.stringify(proposal))
            window.open('/p/preview', '_blank')
          }}
          className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-colors hover:bg-[#F4F3EF]"
          style={{ color: '#6BA89E' }}
        >
          <Eye size={11} />
          Prévia
        </button>
        {!isDraft && (
          <button
            onClick={() => onCopy(proposal)}
            className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-colors hover:bg-[#F4F3EF]"
            style={{ color: '#6BA89E' }}
          >
            <Copy size={11} />
            Link
          </button>
        )}
        {isDraft && (
          <button
            onClick={() => onPublish(proposal.id)}
            className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all hover:opacity-90"
            style={{ background: '#0D3839', color: '#F4F99D' }}
          >
            <Send size={11} />
            Publicar
          </button>
        )}
        <button
          onClick={() => onDelete(proposal.id)}
          className="ml-auto flex items-center gap-1 text-[11px] px-2 py-1.5 rounded-lg transition-colors hover:bg-[#FFF0F0]"
          style={{ color: '#E57373' }}
        >
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  )
}

/* ── main ────────────────────────────────────────────── */

export default function AdminDashboard() {
  const router = useRouter()
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [filter, setFilter] = useState<ProposalStatus | 'all'>('all')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    proposalStore.getAll().then(setProposals)
  }, [])

  async function refresh() {
    setProposals(await proposalStore.getAll())
  }

  const filtered =
    filter === 'all'
      ? proposals
      : proposals.filter(p =>
          filter === 'expired'
            ? isExpired(p.valid_until) && p.status !== 'accepted'
            : p.status === filter
        )

  const stats = {
    total:    proposals.length,
    draft:    proposals.filter(p => p.status === 'draft').length,
    sent:     proposals.filter(p => p.status === 'sent' || p.status === 'viewed').length,
    accepted: proposals.filter(p => p.status === 'accepted').length,
  }

  async function handleDelete(id: string) {
    if (!confirm('Deletar esta proposta?')) return
    await proposalStore.remove(id)
    await refresh()
  }

  async function handleCopy(p: Proposal) {
    const url = `${window.location.origin}/p/${p.slug}`
    await navigator.clipboard.writeText(url)
    setCopiedId(p.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  async function handlePublish(id: string) {
    await proposalStore.updateStatus(id, 'sent')
    await refresh()
  }

  const FILTERS: { value: ProposalStatus | 'all'; label: string }[] = [
    { value: 'all',      label: 'Todas' },
    { value: 'draft',    label: 'Rascunho' },
    { value: 'sent',     label: 'Enviadas' },
    { value: 'accepted', label: 'Aceitas' },
    { value: 'expired',  label: 'Expiradas' },
  ]

  return (
    <div className="min-h-screen" style={{ background: '#ECEAE3', fontFamily: 'var(--font-inter)' }}>
      {/* top bar */}
      <div style={{ borderBottom: '1px solid #DFE0DB', background: '#ECEAE3' }}>
        <div className="max-w-5xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full" style={{ background: '#0D3839' }} />
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8AA09A]">
              Fysi Lab Digital
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => router.push('/admin/inbox')}
              className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg text-[#8AA09A] hover:bg-[#F4F3EF] hover:text-[#0D3839] transition-colors"
            >
              <Inbox size={13} />
              Inbox
            </button>
            <button
              onClick={() => router.push('/admin/dashboard')}
              className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg text-[#8AA09A] hover:bg-[#F4F3EF] hover:text-[#0D3839] transition-colors"
            >
              <BarChart3 size={13} />
              Dashboard
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 pt-10 pb-20">
        {/* header */}
        <div className="flex items-end justify-between gap-4 mb-8 flex-wrap">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#A8B5B0] mb-2">
              PAINEL · PROPOSTAS
            </p>
            <h1 className="text-[2rem] font-bold text-[#162322] tracking-tight leading-tight"
              style={{ fontFamily: 'var(--font-inter)' }}
            >
              Olá, Karine.
            </h1>
            <p className="text-sm text-[#6B8585] mt-1">
              Gerencie suas propostas e crie novas em segundos.
            </p>
          </div>
          <button
            onClick={() => router.push('/admin/new')}
            className="flex items-center gap-2 px-5 py-3 rounded-xl text-[12px] font-bold uppercase tracking-wider transition-all hover:opacity-90 active:scale-95"
            style={{ background: '#0D3839', color: '#F4F99D' }}
          >
            <Plus size={14} />
            Nova proposta
          </button>
        </div>

        {/* stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <Stat value={stats.total}    label="Total" />
          <Stat value={stats.draft}    label="Rascunhos" />
          <Stat value={stats.sent}     label="Enviadas" accent="#6BA89E" />
          <Stat value={stats.accepted} label="Aceitas"  accent="#4CAF7D" />
        </div>

        {/* filters */}
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          {FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className="text-[11px] font-semibold px-3.5 py-1.5 rounded-full transition-all"
              style={{
                background: filter === f.value ? '#0D3839' : '#FFFFFF',
                color: filter === f.value ? '#F4F99D' : '#8AA09A',
                border: `1px solid ${filter === f.value ? '#0D3839' : '#E6E6E1'}`,
              }}
            >
              {f.label}
            </button>
          ))}
          <span className="ml-auto text-[11px] text-[#A8B5B0]">
            {filtered.length} proposta{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* list */}
        {filtered.length === 0 ? (
          <div
            className="rounded-2xl p-12 text-center"
            style={{ background: '#FFFFFF', border: '1px solid #E6E6E1' }}
          >
            <p className="text-[13px] text-[#8AA09A] mb-4">
              {proposals.length === 0
                ? 'Nenhuma proposta ainda.'
                : 'Nenhuma proposta neste filtro.'}
            </p>
            {proposals.length === 0 && (
              <button
                onClick={() => router.push('/admin/new')}
                className="text-[12px] font-bold uppercase tracking-wider px-5 py-2.5 rounded-xl"
                style={{ background: '#0D3839', color: '#F4F99D' }}
              >
                Criar primeira proposta
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filtered.map(p => (
              <ProposalCard
                key={p.id}
                proposal={p}
                onDelete={handleDelete}
                onCopy={handleCopy}
                onPublish={handlePublish}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
