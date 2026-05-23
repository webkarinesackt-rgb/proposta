'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { proposalStore } from '@/lib/proposalStore'
import { Proposal, ProposalStatus } from '@/lib/types'
import {
  Plus,
  Eye,
  Copy,
  Trash2,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Mail,
  Send,
} from 'lucide-react'

/* ── tokens ──────────────────────────────────────────── */

const T = {
  textPrimary: '#E6F1EE',
  textMuted: 'rgba(139,183,175,0.7)',
  textDim: 'rgba(139,183,175,0.45)',
  border: 'rgba(139,183,175,0.12)',
  cardBg:
    'linear-gradient(165deg, rgba(15,57,58,0.6) 0%, rgba(7,31,32,0.85) 100%)',
  accent: '#F4F99D',
  accentDark: '#0D3839',
}

/* ── status badges ───────────────────────────────────── */

const STATUS_META: Record<
  ProposalStatus,
  { label: string; color: string; bg: string; icon: React.ReactNode }
> = {
  draft:    { label: 'Rascunho',    color: '#A8B5B0', bg: 'rgba(168,181,176,0.10)', icon: <FileText size={10} /> },
  sent:     { label: 'Enviada',     color: '#9DE9A8', bg: 'rgba(157,233,168,0.12)', icon: <Mail size={10} /> },
  viewed:   { label: 'Visualizada', color: '#8BB7AF', bg: 'rgba(139,183,175,0.12)', icon: <Eye size={10} /> },
  accepted: { label: 'Aceita',      color: '#F4F99D', bg: 'rgba(244,249,157,0.15)', icon: <CheckCircle2 size={10} /> },
  rejected: { label: 'Recusada',    color: '#E57373', bg: 'rgba(229,115,115,0.12)', icon: <XCircle size={10} /> },
  expired:  { label: 'Expirada',    color: '#8D9E9C', bg: 'rgba(141,158,156,0.10)', icon: <Clock size={10} /> },
}

const TYPE_LABEL: Record<string, string> = {
  landing_page:  'Landing Page',
  site_completo: 'Site Completo',
  mensal:        'Mensal',
  custom:        'Custom',
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function isExpired(iso: string) {
  return new Date(iso) < new Date()
}

/* ── stat card ───────────────────────────────────────── */

function Stat({
  value,
  label,
  accent,
}: {
  value: number
  label: string
  accent?: string
}) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: T.cardBg,
        border: `1px solid ${T.border}`,
        boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
      }}
    >
      <p
        className="text-3xl font-bold tracking-tight leading-none"
        style={{ color: accent ?? T.textPrimary }}
      >
        {value}
      </p>
      <p
        className="text-[10px] mt-2 font-bold uppercase tracking-[0.14em]"
        style={{ color: T.textDim }}
      >
        {label}
      </p>
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
        background: T.cardBg,
        border: `1px solid ${T.border}`,
        boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p
            className="text-[14px] font-bold truncate leading-tight"
            style={{ color: T.textPrimary }}
          >
            {proposal.client_name}
          </p>
          {proposal.client_company && (
            <p
              className="text-[12px] truncate mt-0.5"
              style={{ color: T.textMuted }}
            >
              {proposal.client_company}
            </p>
          )}
        </div>
        <span
          className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full flex-shrink-0"
          style={{ color: meta.color, background: meta.bg, border: `1px solid ${meta.color}30` }}
        >
          {meta.icon}
          {expired && proposal.status !== 'accepted' ? 'Expirada' : meta.label}
        </span>
      </div>

      <div className="flex items-center gap-4">
        <span
          className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded"
          style={{ background: 'rgba(139,183,175,0.08)', color: T.textMuted }}
        >
          {TYPE_LABEL[proposal.project_type] ?? proposal.project_type}
        </span>
        <span className="text-[11px]" style={{ color: T.textDim }}>
          Válida até {fmt(proposal.valid_until)}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {proposal.selected_plans.map((p) => (
          <span
            key={p.id}
            className="text-[10px] px-2 py-0.5 rounded-full"
            style={{
              background: p.is_recommended
                ? T.accent
                : 'rgba(139,183,175,0.08)',
              color: p.is_recommended ? T.accentDark : T.textMuted,
              fontWeight: p.is_recommended ? 700 : 500,
            }}
          >
            {p.name}
          </span>
        ))}
      </div>

      <div
        className="flex items-center gap-2 pt-2"
        style={{ borderTop: `1px solid ${T.border}` }}
      >
        <button
          onClick={() => router.push(`/admin/edit/${proposal.id}`)}
          className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-colors"
          style={{ color: T.textPrimary }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = 'rgba(139,183,175,0.08)')
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = 'transparent')
          }
        >
          Editar
        </button>
        <button
          onClick={() => {
            localStorage.setItem('fysi_draft', JSON.stringify(proposal))
            window.open('/p/preview', '_blank')
          }}
          className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-colors"
          style={{ color: '#9DE9A8' }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = 'rgba(157,233,168,0.08)')
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = 'transparent')
          }
        >
          <Eye size={11} />
          Prévia
        </button>
        {!isDraft && (
          <button
            onClick={() => onCopy(proposal)}
            className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-colors"
            style={{ color: '#9DE9A8' }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = 'rgba(157,233,168,0.08)')
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = 'transparent')
            }
          >
            <Copy size={11} />
            Link
          </button>
        )}
        {isDraft && (
          <button
            onClick={() => onPublish(proposal.id)}
            className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all"
            style={{ background: T.accent, color: T.accentDark }}
          >
            <Send size={11} />
            Publicar
          </button>
        )}
        <button
          onClick={() => onDelete(proposal.id)}
          className="ml-auto flex items-center gap-1 text-[11px] px-2 py-1.5 rounded-lg transition-colors"
          style={{ color: '#E57373' }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = 'rgba(229,115,115,0.10)')
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = 'transparent')
          }
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

  useEffect(() => {
    proposalStore.getAll().then(setProposals)
  }, [])

  async function refresh() {
    setProposals(await proposalStore.getAll())
  }

  const filtered =
    filter === 'all'
      ? proposals
      : proposals.filter((p) =>
          filter === 'expired'
            ? isExpired(p.valid_until) && p.status !== 'accepted'
            : p.status === filter
        )

  const stats = {
    total: proposals.length,
    draft: proposals.filter((p) => p.status === 'draft').length,
    sent: proposals.filter(
      (p) => p.status === 'sent' || p.status === 'viewed'
    ).length,
    accepted: proposals.filter((p) => p.status === 'accepted').length,
  }

  async function handleDelete(id: string) {
    if (!confirm('Deletar esta proposta?')) return
    await proposalStore.remove(id)
    await refresh()
  }

  async function handleCopy(p: Proposal) {
    const url = `${window.location.origin}/p/${p.slug}`
    await navigator.clipboard.writeText(url)
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
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="max-w-6xl mx-auto px-6 pt-12 pb-20">
        {/* hero */}
        <div className="flex items-end justify-between gap-4 mb-10 flex-wrap">
          <div>
            <p
              className="text-[10px] font-bold uppercase tracking-[0.2em] mb-3"
              style={{ color: '#6BA89E' }}
            >
              PAINEL · PROPOSTAS
            </p>
            <h1
              className="leading-none tracking-tight"
              style={{
                fontFamily: '"ivypresto-display", Georgia, serif',
                fontStyle: 'italic',
                fontWeight: 300,
                fontSize: 'clamp(2.2rem, 4.5vw, 3rem)',
                color: T.textPrimary,
              }}
            >
              Olá, Karine.
            </h1>
            <p
              className="text-[13px] mt-2"
              style={{ color: T.textMuted }}
            >
              Gerencie suas propostas e crie novas em segundos.
            </p>
          </div>
          <button
            onClick={() => router.push('/admin/new')}
            className="flex items-center gap-2 px-5 py-3 rounded-xl text-[12px] font-bold uppercase tracking-[0.1em] transition-all active:scale-95"
            style={{
              background: T.accent,
              color: T.accentDark,
              boxShadow: '0 6px 24px rgba(244,249,157,0.25)',
            }}
          >
            <Plus size={14} />
            Nova proposta
          </button>
        </div>

        {/* stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <Stat value={stats.total} label="Total" />
          <Stat value={stats.draft} label="Rascunhos" />
          <Stat value={stats.sent} label="Enviadas" accent="#9DE9A8" />
          <Stat value={stats.accepted} label="Aceitas" accent={T.accent} />
        </div>

        {/* filters */}
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          {FILTERS.map((f) => {
            const active = filter === f.value
            return (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className="text-[11px] font-bold px-4 py-1.5 rounded-full transition-all"
                style={{
                  background: active ? T.accent : 'rgba(139,183,175,0.06)',
                  color: active ? T.accentDark : T.textMuted,
                  border: `1px solid ${active ? T.accent : T.border}`,
                  letterSpacing: '0.03em',
                }}
              >
                {f.label}
              </button>
            )
          })}
          <span
            className="ml-auto text-[11px]"
            style={{ color: T.textDim }}
          >
            {filtered.length} proposta{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* list */}
        {filtered.length === 0 ? (
          <div
            className="rounded-2xl p-12 text-center"
            style={{
              background: T.cardBg,
              border: `1px solid ${T.border}`,
            }}
          >
            <p
              className="text-[13px] mb-4"
              style={{ color: T.textMuted }}
            >
              {proposals.length === 0
                ? 'Nenhuma proposta ainda.'
                : 'Nenhuma proposta neste filtro.'}
            </p>
            {proposals.length === 0 && (
              <button
                onClick={() => router.push('/admin/new')}
                className="text-[12px] font-bold uppercase tracking-wider px-5 py-2.5 rounded-xl"
                style={{ background: T.accent, color: T.accentDark }}
              >
                Criar primeira proposta
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filtered.map((p) => (
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
