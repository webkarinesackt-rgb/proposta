'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { proposalStore } from '@/lib/proposalStore'
import { ymKey, currentYm } from '@/lib/dates'
import { Proposal, ProposalStatus, ProjectType } from '@/lib/types'
import { waServer } from '@/lib/waServer'
import { useToast } from '@/lib/useToast'
import { getPlansForScope } from '@/lib/scopeTemplates'
import { mockProposal } from '@/lib/mockData'
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
  ChevronDown,
  Check,
  Search,
  Download,
} from 'lucide-react'

/* ── tokens ──────────────────────────────────────────── */

const T = {
  textPrimary: '#141414',
  textMuted: '#6E6E6E',
  textDim: '#9B9B9B',
  border: '#E6E6E1',
  borderSubtle: '#F0F0EC',
  card: '#FFFFFF',
  bgSubtle: '#FAFAF8',
  accent: '#141414',
  accentBright: '#D6F23C',
}

/* ── status meta ─────────────────────────────────────── */

const STATUS_META: Record<
  ProposalStatus,
  { label: string; color: string; bg: string; icon: React.ReactNode }
> = {
  // Paleta derivada da marca (petróleo → sálvia → lima → oliva). Barro é o
  // único tom "de fora", reservado ao estado negativo. Nada saturado.
  draft:    { label: 'Rascunho',    color: '#7A8985', bg: '#F1F2EE', icon: <FileText size={10} /> },
  sent:     { label: 'Enviada',     color: '#141414', bg: '#E7EEEB', icon: <Mail size={10} /> },
  viewed:   { label: 'Visualizada', color: '#6E7A2E', bg: '#F3F6DF', icon: <Eye size={10} /> },
  accepted: { label: 'Aceita',      color: '#2F6B4F', bg: '#E9F2EC', icon: <CheckCircle2 size={10} /> },
  rejected: { label: 'Recusada',    color: '#9C5A48', bg: '#F7EDE9', icon: <XCircle size={10} /> },
  expired:  { label: 'Expirada',    color: '#9AA8A2', bg: '#F1F2EE', icon: <Clock size={10} /> },
}

const TYPE_LABEL: Record<string, string> = {
  landing_page:   'Landing Page',
  site_completo:  'Site Completo',
  mensal:         'Mensal',
  posicionamento: 'Posicionamento online',
  custom:         'Custom',
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

/** Card de estatística leve — 3 lado a lado, no lugar do antigo painel
 *  preto sólido (pesado demais). Mesma linguagem dos cards da Visão geral:
 *  badge de ícone, seta no canto, número sans-bold tabular. */
function Stat({
  icon,
  value,
  label,
  highlight,
  onClick,
  tone,
}: {
  icon: React.ReactNode
  value: number
  label: string
  highlight?: boolean
  onClick?: () => void
  /** cor de destaque leve (ícone + número), sem preencher o card inteiro */
  tone?: string
}) {
  const ink = highlight ? '#141414' : tone ?? '#141414'
  return (
    <div
      onClick={onClick}
      className="rounded-2xl p-5 transition-all"
      style={{
        background: highlight ? T.accentBright : T.card,
        boxShadow: '0 4px 16px rgba(20,20,20,0.06), 0 1px 3px rgba(20,20,20,0.04)',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <span
        className="w-8 h-8 rounded-full flex items-center justify-center mb-3"
        style={{ background: highlight ? 'rgba(20,20,20,0.1)' : tone ? tone + '1C' : T.bgSubtle, color: ink }}
      >
        {icon}
      </span>
      <p
        className="leading-none font-bold tabular-nums"
        style={{
          letterSpacing: '-0.03em',
          fontSize: 'clamp(1.9rem, 3.6vw, 2.6rem)',
          color: ink,
        }}
      >
        {value}
      </p>
      <p
        className="text-[10px] font-bold uppercase tracking-wider mt-2"
        style={{ color: highlight ? 'rgba(20,20,20,0.7)' : T.textDim }}
      >
        {label}
      </p>
    </div>
  )
}

/* ── proposta rápida modal ───────────────────────────── */

const QUICK_TEMPLATES: { type: ProjectType; label: string; desc: string }[] = [
  { type: 'landing_page',   label: 'Landing Page',          desc: 'Página focada em conversão' },
  { type: 'site_completo',  label: 'Site Completo',         desc: 'Múltiplas páginas e seções' },
  { type: 'mensal',         label: 'Mensal',                desc: 'Gestão recorrente' },
  { type: 'posicionamento', label: 'Posicionamento online', desc: 'Identidade + estratégia + conteúdo' },
]

function QuickProposalModal({
  proposals,
  onClose,
  onPickTemplate,
  onDuplicate,
}: {
  proposals: Proposal[]
  onClose: () => void
  onPickTemplate: (type: ProjectType, clientName: string) => void
  onDuplicate: (sourceId: string, clientName: string) => void
}) {
  const [tab, setTab] = useState<'template' | 'duplicate'>('template')
  const [clientName, setClientName] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectType>('landing_page')
  const [selectedSource, setSelectedSource] = useState<string>('')
  const [dupSearch, setDupSearch] = useState('')

  // lista filtrada de propostas pra duplicar (busca por cliente/tipo)
  const dupFiltered = proposals.filter((p) => {
    const q = dupSearch.trim().toLowerCase()
    if (!q) return true
    return (
      p.client_name.toLowerCase().includes(q) ||
      (TYPE_LABEL[p.project_type] || '').toLowerCase().includes(q)
    )
  })

  function submit() {
    const name = clientName.trim()
    if (!name) return
    if (tab === 'template') onPickTemplate(selectedTemplate, name)
    else if (selectedSource) onDuplicate(selectedSource, name)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[560px] max-h-[90vh] overflow-y-auto rounded-2xl p-5 sm:p-6"
        onClick={(e) => e.stopPropagation()}
        style={{ background: T.card, border: `1px solid ${T.border}`, boxShadow: '0 24px 60px rgba(0,0,0,0.2)' }}
      >
        <h2 className="text-[16px] sm:text-[18px] font-bold mb-1" style={{ color: T.textPrimary }}>
          ⚡ Proposta rápida
        </h2>
        <p className="text-[12px] mb-4" style={{ color: T.textMuted }}>
          Escolha um pacote padrão OU duplique de outro cliente. Você revisa e publica em 30s.
        </p>

        {/* tab switcher */}
        <div className="flex gap-1 mb-4 p-1 rounded-xl" style={{ background: T.bgSubtle }}>
          <button
            onClick={() => setTab('template')}
            className="flex-1 text-[12px] font-bold py-2 rounded-lg transition-all"
            style={{
              background: tab === 'template' ? T.card : 'transparent',
              color: tab === 'template' ? T.textPrimary : T.textMuted,
              boxShadow: tab === 'template' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
            }}
          >
            Pacote padrão
          </button>
          <button
            onClick={() => setTab('duplicate')}
            className="flex-1 text-[12px] font-bold py-2 rounded-lg transition-all"
            style={{
              background: tab === 'duplicate' ? T.card : 'transparent',
              color: tab === 'duplicate' ? T.textPrimary : T.textMuted,
              boxShadow: tab === 'duplicate' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
            }}
          >
            Duplicar cliente
          </button>
        </div>

        {tab === 'template' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
            {QUICK_TEMPLATES.map((t) => {
              const active = selectedTemplate === t.type
              return (
                <button
                  key={t.type}
                  onClick={() => setSelectedTemplate(t.type)}
                  className="text-left rounded-xl px-3 py-3 transition-all"
                  style={{
                    background: active ? T.accent : T.card,
                    border: `1px solid ${active ? T.accent : T.border}`,
                    color: active ? '#FFFFFF' : T.textPrimary,
                  }}
                >
                  <p className="text-[13px] font-bold">{t.label}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: active ? '#8BB7AF' : T.textMuted }}>
                    {t.desc}
                  </p>
                </button>
              )
            })}
          </div>
        ) : (
          <div className="mb-4">
            <div className="relative mb-2">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: T.textDim }}
              />
              <input
                value={dupSearch}
                onChange={(e) => setDupSearch(e.target.value)}
                placeholder="Buscar cliente…"
                className="w-full pl-9 pr-3 py-2 rounded-lg text-[13px] outline-none"
                style={{ background: T.bgSubtle, border: `1px solid ${T.border}`, color: T.textPrimary }}
              />
            </div>
            <div className="max-h-[240px] overflow-y-auto rounded-xl" style={{ border: `1px solid ${T.border}` }}>
            {proposals.length === 0 ? (
              <p className="text-[12px] text-center py-8" style={{ color: T.textDim }}>
                Você ainda não tem propostas pra duplicar.
              </p>
            ) : dupFiltered.length === 0 ? (
              <p className="text-[12px] text-center py-8" style={{ color: T.textDim }}>
                Nenhum cliente encontrado.
              </p>
            ) : (
              dupFiltered.map((p) => {
                const active = selectedSource === p.id
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedSource(p.id)}
                    className="w-full text-left px-3 py-2.5 transition-colors flex items-center justify-between"
                    style={{
                      background: active ? T.bgSubtle : 'transparent',
                      borderBottom: `1px solid ${T.borderSubtle}`,
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold truncate" style={{ color: T.textPrimary }}>
                        {p.client_name}
                      </p>
                      <p className="text-[11px] truncate" style={{ color: T.textMuted }}>
                        {TYPE_LABEL[p.project_type]} · {p.selected_plans.length} plano(s)
                      </p>
                    </div>
                    {active && <Check size={14} style={{ color: T.accent }} />}
                  </button>
                )
              })
            )}
            </div>
          </div>
        )}

        <label className="block text-[10px] font-bold uppercase tracking-[0.12em] mb-1.5" style={{ color: T.textDim }}>
          Nome do cliente
        </label>
        <input
          autoFocus
          type="text"
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
          placeholder="Ex: Dra. Carla Oliveira"
          className="w-full px-3 py-2.5 rounded-lg text-[14px] outline-none"
          style={{ background: T.bgSubtle, border: `1px solid ${T.border}`, color: T.textPrimary }}
        />

        <div className="flex gap-2 justify-end mt-5">
          <button
            onClick={onClose}
            className="text-[12px] font-semibold px-4 py-2 rounded-lg transition-colors hover:bg-[#F4F3EF]"
            style={{ color: T.textMuted }}
          >
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={!clientName.trim() || (tab === 'duplicate' && !selectedSource)}
            className="text-[12px] font-bold uppercase tracking-wider px-4 py-2 rounded-lg transition-all disabled:opacity-40"
            style={{ background: T.accent, color: T.accentBright }}
          >
            Criar
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── proposal card ───────────────────────────────────── */

function ProposalCard({
  proposal,
  onDelete,
  onCopy,
  onPublish,
  onSetStatus,
}: {
  proposal: Proposal
  onDelete: (id: string) => void
  onCopy: (p: Proposal) => void
  onPublish: (id: string) => void
  onSetStatus: (id: string, status: ProposalStatus) => void
}) {
  const router = useRouter()
  const [statusMenuOpen, setStatusMenuOpen] = useState(false)
  const meta = STATUS_META[proposal.status] ?? STATUS_META.draft
  const expired = isExpired(proposal.valid_until)
  const isDraft = proposal.status === 'draft'

  return (
    <div
      className="rounded-[22px] p-5 flex flex-col gap-3.5 transition-all"
      style={{
        background: T.card,
        border: '1px solid #EDEDE8',
        boxShadow:
          '0 1px 2px rgba(20,20,20,0.04), 0 10px 28px -16px rgba(20,20,20,0.16)',
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p
            className="truncate leading-tight"
            style={{
              fontFamily: 'var(--font-inter), Inter, sans-serif',
              fontStyle: 'normal',
              fontWeight: 700,
              letterSpacing: '-0.01em',
              fontSize: '1.05rem',
              color: T.textPrimary,
            }}
          >
            {proposal.client_name}
          </p>
          <p className="text-[12px] mt-1" style={{ color: T.textMuted }}>
            {proposal.client_company ? proposal.client_company + ' · ' : ''}
            {TYPE_LABEL[proposal.project_type] ?? proposal.project_type} · válida
            até {fmt(proposal.valid_until)}
          </p>
        </div>
        {isDraft ? (
          <span
            className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full flex-shrink-0"
            style={{
              color: meta.color,
              background: meta.bg,
              border: `1px solid ${meta.color}22`,
            }}
          >
            {meta.icon}
            {meta.label}
          </span>
        ) : (
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setStatusMenuOpen((o) => !o)}
              className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full transition-all hover:opacity-80"
              style={{
              color: meta.color,
              background: meta.bg,
              border: `1px solid ${meta.color}22`,
            }}
              title="Clique pra mudar o status"
            >
              {meta.icon}
              {expired && proposal.status !== 'accepted' ? 'Expirada' : meta.label}
              <ChevronDown size={9} />
            </button>
            {statusMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setStatusMenuOpen(false)}
                />
                <div
                  className="absolute z-40 right-0 top-full mt-1.5 w-44 rounded-xl py-1"
                  style={{
                    background: '#FFFFFF',
                    border: `1px solid ${T.border}`,
                    boxShadow: '0 12px 32px rgba(0,0,0,0.12)',
                  }}
                >
                  {(['sent', 'viewed', 'accepted', 'rejected', 'expired'] as ProposalStatus[]).map(
                    (s) => {
                      const sm = STATUS_META[s]
                      return (
                        <button
                          key={s}
                          onClick={() => {
                            onSetStatus(proposal.id, s)
                            setStatusMenuOpen(false)
                          }}
                          className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-[#FAFAF8] transition-colors"
                        >
                          <span
                            className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                            style={{ color: sm.color, background: sm.bg }}
                          >
                            {sm.icon}
                            {sm.label}
                          </span>
                          {proposal.status === s && (
                            <span className="ml-auto text-[10px]" style={{ color: T.textDim }}>atual</span>
                          )}
                        </button>
                      )
                    }
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {proposal.selected_plans.map((p) => (
          <span
            key={p.id}
            className="text-[10px] px-2 py-0.5 rounded-full"
            style={{
              background: p.is_recommended ? T.accentBright : T.bgSubtle,
              color: p.is_recommended ? T.accent : T.textMuted,
              fontWeight: p.is_recommended ? 700 : 500,
            }}
          >
            {p.name}
          </span>
        ))}
      </div>

      <div
        className="flex items-center gap-2 pt-2"
        style={{ borderTop: `1px solid ${T.borderSubtle}` }}
      >
        <button
          onClick={() => router.push(`/admin/edit/${proposal.id}`)}
          className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-colors hover:bg-[#F4F3EF]"
          style={{ color: T.textPrimary }}
        >
          Editar
        </button>
        <button
          onClick={() => {
            localStorage.setItem('fysi_draft', JSON.stringify(proposal))
            window.open('/p/preview', '_blank')
          }}
          className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-colors hover:bg-[#F4F3EF]"
          style={{ color: T.textMuted }}
        >
          <Eye size={11} />
          Prévia
        </button>
        {!isDraft && (
          <button
            onClick={() => onCopy(proposal)}
            className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-colors hover:bg-[#F4F3EF]"
            style={{ color: T.textMuted }}
          >
            <Copy size={11} />
            Link
          </button>
        )}
        {isDraft && (
          <button
            onClick={() => onPublish(proposal.id)}
            className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all"
            style={{ background: T.accent, color: T.accentBright }}
          >
            <Send size={11} />
            Publicar
          </button>
        )}
        <button
          onClick={() => onDelete(proposal.id)}
          className="ml-auto flex items-center gap-1 text-[11px] px-2 py-1.5 rounded-lg transition-colors hover:bg-[#F7EDE9]"
          style={{ color: '#9C5A48' }}
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
  const [quickOpen, setQuickOpen] = useState(false)
  const { show: showToast, Toast } = useToast()
  const [filter, setFilter] = useState<ProposalStatus | 'all'>('all')
  const [search, setSearch] = useState('')
  // filtro por período (created_at) + mês específico 'YYYY-MM'
  const [period, setPeriod] = useState<
    'all' | 'week' | 'last_week' | 'month' | 'last_month'
  >('all')
  const [specificMonth, setSpecificMonth] = useState('')

  useEffect(() => {
    proposalStore.getAll().then(setProposals)
  }, [])

  // abre a "Proposta rápida" quando vem do Dashboard (/admin?rapida=1)
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (new URLSearchParams(window.location.search).get('rapida') === '1') {
      setQuickOpen(true)
      window.history.replaceState({}, '', '/admin')
    }
  }, [])

  async function refresh() {
    setProposals(await proposalStore.getAll())
  }

  const q = search.trim().toLowerCase()
  // limites de período (semana começa na segunda)
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime()
  const startOfWeek = (() => {
    const d = new Date(now)
    const day = (d.getDay() + 6) % 7 // 0 = segunda
    d.setDate(d.getDate() - day)
    d.setHours(0, 0, 0, 0)
    return d.getTime()
  })()
  const startOfLastWeek = startOfWeek - 7 * 86400 * 1000
  const filtered = proposals.filter((p) => {
    // filtro por status (chips)
    if (filter !== 'all') {
      const okStatus =
        filter === 'expired'
          ? isExpired(p.valid_until) && p.status !== 'accepted'
          : p.status === filter
      if (!okStatus) return false
    }
    // filtro por período (data de criação)
    if (specificMonth || period !== 'all') {
      const created = p.created_at ? new Date(p.created_at) : null
      if (!created || isNaN(created.getTime())) return false
      const t = created.getTime()
      if (specificMonth) {
        if (ymKey(created) !== specificMonth) return false
      } else if (period === 'week' && t < startOfWeek) {
        return false
      } else if (period === 'last_week' && (t < startOfLastWeek || t >= startOfWeek)) {
        return false
      } else if (period === 'month' && t < startOfMonth) {
        return false
      } else if (period === 'last_month' && (t < startOfLastMonth || t >= startOfMonth)) {
        return false
      }
    }
    // busca livre: cliente, empresa, email, telefone, link e tipo
    if (!q) return true
    const hay = [
      p.client_name,
      p.client_company || '',
      p.client_email || '',
      p.client_whatsapp || '',
      p.slug || '',
      TYPE_LABEL[p.project_type] || p.project_type,
    ]
      .join(' ')
      .toLowerCase()
    return hay.includes(q)
  })

  // memoizado: antes recalculava em toda renderização (inclusive a cada
  // tecla digitada na busca), recriando Date()/strings à toa pra cada
  // proposta em 2 filtros separados.
  const stats = useMemo(() => {
    const thisYm = currentYm()
    return {
      // "Enviadas este mês" (mesma definição da Visão geral) em vez do
      // total histórico — mais útil no dia a dia que um número que só cresce.
      sentThisMonth: proposals.filter(
        (p) => p.status !== 'draft' && (p.created_at || '').slice(0, 7) === thisYm,
      ).length,
      // aceitas ESTE MÊS (pela data em que virou aceita, updated_at) — faz
      // par com "Enviadas este mês" (funil: quanto entrou x quanto fechou).
      acceptedThisMonth: proposals.filter(
        (p) => p.status === 'accepted' && (p.updated_at || p.created_at || '').slice(0, 7) === thisYm,
      ).length,
      // card de destaque: quem já ABRIU a proposta mas ainda não decidiu —
      // é quem mais vale a pena chamar agora (mais acionável que só contar
      // quantas foram enviadas).
      viewed: proposals.filter((p) => p.status === 'viewed').length,
    }
  }, [proposals])

  async function handleDelete(id: string) {
    if (!confirm('Deletar esta proposta?')) return
    await proposalStore.remove(id)
    await refresh()
    showToast('Proposta deletada')
  }

  async function handleCopy(p: Proposal) {
    const url = `${window.location.origin}/p/${p.slug}`
    await navigator.clipboard.writeText(url)
    showToast('Link da proposta copiado')
  }

  // Gera um relatório (CSV/Excel) das propostas atualmente filtradas.
  function generateReport() {
    const STATUS_PT: Record<string, string> = {
      draft: 'Rascunho',
      sent: 'Enviada',
      viewed: 'Visualizada',
      accepted: 'Aceita',
      rejected: 'Recusada',
      expired: 'Expirada',
    }
    const headers = [
      'Cliente', 'Empresa', 'Email', 'WhatsApp', 'Tipo', 'Status',
      'Válida até', 'Criada em', 'Planos', 'Valor recomendado (à vista)',
    ]
    const rows = filtered.map((p) => {
      const rec = p.selected_plans.find((pl) => pl.is_recommended) || p.selected_plans[0]
      const dateBR = (d?: string) =>
        d ? new Date(d).toLocaleDateString('pt-BR') : ''
      return [
        p.client_name,
        p.client_company || '',
        p.client_email || '',
        p.client_whatsapp || '',
        TYPE_LABEL[p.project_type] || p.project_type,
        STATUS_PT[p.status] || p.status,
        dateBR(p.valid_until),
        dateBR(p.created_at),
        p.selected_plans.map((pl) => pl.name).join(' / '),
        rec ? String(rec.price_cash) : '',
      ]
    })
    const esc = (v: unknown) => {
      const s = String(v ?? '')
      return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }
    const csv = [headers, ...rows].map((r) => r.map(esc).join(';')).join('\r\n')
    // BOM p/ Excel abrir com acentos corretos
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `propostas-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    showToast(`Relatório gerado (${rows.length} proposta${rows.length !== 1 ? 's' : ''})`)
  }

  async function handlePublish(id: string) {
    await proposalStore.updateStatus(id, 'sent')
    await refresh()
    showToast('Proposta publicada')
    syncLinkedChat(id, 'sent')
  }

  /** Cria nova proposta a partir de um template de escopo + nome do cliente. */
  async function quickFromTemplate(type: ProjectType, clientName: string) {
    const plans = getPlansForScope(type)
    const proposal: Proposal = {
      ...mockProposal,
      id: '',
      slug: '',
      client_name: clientName,
      client_email: '',
      client_company: '',
      client_whatsapp: '',
      project_type: type,
      hero_title: `Proposta ${type === 'landing_page' ? 'Landing Page' : type === 'site_completo' ? 'Site Completo' : type === 'mensal' ? 'Gestão Mensal' : type === 'posicionamento' ? 'Posicionamento online' : 'Personalizada'}`,
      selected_plans: plans,
      valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'draft',
    }
    const saved = await proposalStore.save(proposal)
    showToast('Proposta criada — abre pra revisar', { kind: 'info' })
    router.push(`/admin/edit/${saved.id}`)
  }

  /** Duplica proposta existente — só troca o nome do cliente. */
  async function quickDuplicate(sourceId: string, clientName: string) {
    const source = proposals.find((p) => p.id === sourceId)
    if (!source) return
    const copy: Proposal = {
      ...source,
      id: '',
      slug: '',
      client_name: clientName,
      client_email: '',
      client_company: '',
      client_whatsapp: '',
      valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'draft',
    }
    const saved = await proposalStore.save(copy)
    showToast(`Duplicada de "${source.client_name}"`, { kind: 'info' })
    router.push(`/admin/edit/${saved.id}`)
  }

  async function handleSetStatus(id: string, status: ProposalStatus) {
    setProposals((ps) => ps.map((p) => (p.id === id ? { ...p, status } : p)))
    await proposalStore.updateStatus(id, status)
    refresh()
    syncLinkedChat(id, status)
  }

  /** Quando o status de uma proposta muda, sincroniza o status do lead
   *  vinculado (chat.linkedProposalId === proposal.id) no Pipeline.
   *  Loop CRM ↔ Propostas que faltava: agora não precisa lembrar de
   *  arrastar o card todo vez que a proposta avança. */
  async function syncLinkedChat(proposalId: string, proposalStatus: ProposalStatus) {
    const mapping: Record<string, string> = {
      sent: 'PROPOSTA',
      viewed: 'AGUARDANDO',
      accepted: 'ACEITA',
      rejected: 'PERDIDA',
      expired: 'PERDIDA',
    }
    const targetStatus = mapping[proposalStatus]
    if (!targetStatus) return
    try {
      const allChats = await waServer.chats()
      const linked = allChats.find((c) => c.linkedProposalId === proposalId)
      if (!linked) return
      if (linked.status === targetStatus) return // já está lá
      await waServer.updateChat(linked.id, { status: targetStatus })
      showToast(`Lead "${linked.name}" → ${targetStatus}`, { kind: 'info' })
    } catch {
      // wa-server offline ou sem permissão — não bloqueia o flow de proposta
    }
  }

  const FILTERS: { value: ProposalStatus | 'all'; label: string }[] = [
    { value: 'all',      label: 'Todas' },
    { value: 'draft',    label: 'Rascunho' },
    { value: 'sent',     label: 'Enviadas' },
    { value: 'viewed',   label: 'Vistas' },
    { value: 'accepted', label: 'Aceitas' },
    { value: 'expired',  label: 'Expiradas' },
  ]

  return (
    <div className="flex-1 min-h-0 overflow-y-auto thin-scroll">
      <Toast />
      {quickOpen && (
        <QuickProposalModal
          proposals={proposals}
          onClose={() => setQuickOpen(false)}
          onPickTemplate={async (type, clientName) => {
            setQuickOpen(false)
            await quickFromTemplate(type, clientName)
          }}
          onDuplicate={async (sourceId, clientName) => {
            setQuickOpen(false)
            await quickDuplicate(sourceId, clientName)
          }}
        />
      )}
      <div className="max-w-5xl mx-auto px-4 sm:px-8 pt-6 sm:pt-10 pb-20">
        {/* hero */}
        <div className="flex items-end justify-between gap-4 mb-8 flex-wrap">
          <h1
            className="leading-[0.95]"
            style={{
              fontFamily: 'var(--font-inter), Inter, sans-serif',
              fontStyle: 'normal',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              fontSize: 'clamp(1.9rem, 4.4vw, 2.7rem)',
              color: T.textPrimary,
            }}
          >
            Olá, Karine.
          </h1>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setQuickOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full text-[12px] font-semibold transition-all active:scale-95"
              style={{
                background: '#FFFFFF',
                color: T.textPrimary,
                border: `1px solid ${T.border}`,
              }}
              title="Crie uma proposta em 1 clique a partir de um modelo padrão ou de outro cliente"
            >
              ⚡ Rápida
            </button>
            <button
              onClick={() => router.push('/admin/new')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full text-[12px] font-bold transition-all active:scale-95"
              style={{ background: T.accent, color: T.accentBright }}
            >
              <Plus size={14} />
              Nova proposta
            </button>
          </div>
        </div>

        {/* stats */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <Stat icon={<Send size={15} />} value={stats.sentThisMonth} label="Enviadas este mês" />
          <Stat
            icon={<CheckCircle2 size={15} />}
            value={stats.acceptedThisMonth}
            label="Aceitas este mês"
            onClick={() => setFilter('accepted')}
            tone="#16A34A"
          />
          <Stat
            icon={<Eye size={15} />}
            value={stats.viewed}
            label="Vistas · aguardando decisão"
            onClick={() => setFilter('viewed')}
            highlight
          />
        </div>

        {/* busca */}
        <div
          className="flex items-center gap-2.5 px-4 py-2.5 rounded-full mb-4 transition-shadow focus-within:ring-2 focus-within:ring-[#C8D8D4]"
          style={{ background: T.card, border: `1px solid ${T.border}` }}
        >
          <Search size={14} style={{ color: T.textDim }} className="flex-shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por cliente, empresa, email, telefone ou tipo…"
            className="flex-1 min-w-0 bg-transparent text-[13px] outline-none"
            style={{ color: T.textPrimary }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              title="Limpar busca"
              className="text-[11px] opacity-60 hover:opacity-100 flex-shrink-0"
              style={{ color: T.textMuted }}
            >
              ✕
            </button>
          )}
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
                  background: active ? T.accent : T.card,
                  color: active ? T.accentBright : T.textMuted,
                  border: `1px solid ${active ? T.accent : T.border}`,
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

        {/* filtro por período */}
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: T.textDim }}>
            Período:
          </span>
          {([
            { value: 'all', label: 'Todo período' },
            { value: 'week', label: 'Esta semana' },
            { value: 'last_week', label: 'Semana passada' },
            { value: 'month', label: 'Este mês' },
            { value: 'last_month', label: 'Mês passado' },
          ] as const).map((opt) => {
            const active = !specificMonth && period === opt.value
            return (
              <button
                key={opt.value}
                onClick={() => {
                  setPeriod(opt.value)
                  setSpecificMonth('')
                }}
                className="text-[11px] font-bold px-3 py-1.5 rounded-full transition-all"
                style={{
                  background: active ? T.accent : T.card,
                  color: active ? T.accentBright : T.textMuted,
                  border: `1px solid ${active ? T.accent : T.border}`,
                }}
              >
                {opt.label}
              </button>
            )
          })}
          <input
            type="month"
            value={specificMonth}
            onChange={(e) => {
              setSpecificMonth(e.target.value)
              if (e.target.value) setPeriod('all')
            }}
            title="Mês específico"
            className="text-[11px] font-semibold px-3 py-1.5 rounded-full outline-none"
            style={{
              background: specificMonth ? T.accent : T.card,
              color: specificMonth ? T.accentBright : T.textMuted,
              border: `1px solid ${specificMonth ? T.accent : T.border}`,
            }}
          />
          {specificMonth && (
            <button
              onClick={() => setSpecificMonth('')}
              title="Limpar mês"
              className="text-[11px] font-bold px-2 py-1.5 rounded-full"
              style={{ color: T.textMuted }}
            >
              ✕
            </button>
          )}
          <div className="ml-auto flex items-center gap-3">
            <span
              className="text-[12px] font-bold px-3 py-1.5 rounded-full"
              style={{ background: '#EEF3E0', color: '#141414' }}
            >
              {filtered.length} na tela
            </span>
            <button
              onClick={generateReport}
              disabled={filtered.length === 0}
              title="Baixar os dados das propostas filtradas em Excel/CSV"
              className="flex items-center gap-1.5 text-[11px] font-bold px-3.5 py-1.5 rounded-full transition-all disabled:opacity-40"
              style={{ background: T.accent, color: T.accentBright }}
            >
              <Download size={13} />
              Gerar relatório
            </button>
          </div>
        </div>

        {/* list */}
        {filtered.length === 0 ? (
          <div
            className="rounded-2xl p-12 text-center"
            style={{ background: T.card, border: `1px solid ${T.border}` }}
          >
            <p className="text-[13px] mb-4" style={{ color: T.textMuted }}>
              {proposals.length === 0
                ? 'Nenhuma proposta ainda.'
                : q
                ? `Nenhuma proposta encontrada para “${search.trim()}”.`
                : 'Nenhuma proposta neste filtro.'}
            </p>
            {proposals.length === 0 && (
              <button
                onClick={() => router.push('/admin/new')}
                className="text-[12px] font-bold uppercase tracking-wider px-5 py-2.5 rounded-xl"
                style={{ background: T.accent, color: T.accentBright }}
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
                onSetStatus={handleSetStatus}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
