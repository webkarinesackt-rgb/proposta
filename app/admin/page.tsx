'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { proposalStore } from '@/lib/proposalStore'
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
} from 'lucide-react'

/* ── tokens ──────────────────────────────────────────── */

const T = {
  textPrimary: '#162322',
  textMuted: '#6B8585',
  textDim: '#8AA09A',
  border: '#E6E6E1',
  borderSubtle: '#F0F0EC',
  card: '#FFFFFF',
  bgSubtle: '#FAFAF8',
  accent: '#0D3839',
  accentBright: '#F4F99D',
}

/* ── status meta ─────────────────────────────────────── */

const STATUS_META: Record<
  ProposalStatus,
  { label: string; color: string; bg: string; icon: React.ReactNode }
> = {
  // Paleta derivada da marca (petróleo → sálvia → lima → oliva). Barro é o
  // único tom "de fora", reservado ao estado negativo. Nada saturado.
  draft:    { label: 'Rascunho',    color: '#7A8985', bg: '#F1F2EE', icon: <FileText size={10} /> },
  sent:     { label: 'Enviada',     color: '#0D3839', bg: '#E7EEEB', icon: <Mail size={10} /> },
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
        background: T.card,
        border: `1px solid ${T.border}`,
      }}
    >
      {/* numeral na serifa do cabeçalho ("Olá, Karine.") — amarra o indicador
          à assinatura da página em vez do sans bold genérico */}
      <p
        className="leading-none"
        style={{
          color: accent ?? T.textPrimary,
          fontFamily: '"ivypresto-display", Georgia, serif',
          fontStyle: 'italic',
          fontWeight: 300,
          fontSize: 'clamp(1.9rem, 3.2vw, 2.4rem)',
          letterSpacing: '-0.01em',
        }}
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
          <div className="mb-4 max-h-[240px] overflow-y-auto rounded-xl" style={{ border: `1px solid ${T.border}` }}>
            {proposals.length === 0 ? (
              <p className="text-[12px] text-center py-8" style={{ color: T.textDim }}>
                Você ainda não tem propostas pra duplicar.
              </p>
            ) : (
              proposals.map((p) => {
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
      className="rounded-2xl p-5 flex flex-col gap-3 transition-all"
      style={{
        background: T.card,
        border: `1px solid ${T.border}`,
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
        {isDraft ? (
          <span
            className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full flex-shrink-0"
            style={{ color: meta.color, background: meta.bg }}
          >
            {meta.icon}
            {meta.label}
          </span>
        ) : (
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setStatusMenuOpen((o) => !o)}
              className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full transition-all hover:opacity-80"
              style={{ color: meta.color, background: meta.bg }}
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

      <div className="flex items-center gap-4">
        <span
          className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded"
          style={{ background: T.bgSubtle, color: T.textMuted }}
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

  useEffect(() => {
    proposalStore.getAll().then(setProposals)
  }, [])

  async function refresh() {
    setProposals(await proposalStore.getAll())
  }

  const q = search.trim().toLowerCase()
  const filtered = proposals.filter((p) => {
    // filtro por status (chips)
    if (filter !== 'all') {
      const okStatus =
        filter === 'expired'
          ? isExpired(p.valid_until) && p.status !== 'accepted'
          : p.status === filter
      if (!okStatus) return false
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

  const stats = {
    total: proposals.length,
    draft: proposals.filter((p) => p.status === 'draft').length,
    sent: proposals.filter(
      (p) => p.status === 'sent' || p.status === 'viewed'
    ).length,
  }

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
          <div>
            <p
              className="text-[10px] font-bold uppercase tracking-[0.2em] mb-3"
              style={{ color: T.textDim }}
            >
              PAINEL · PROPOSTAS
            </p>
            <h1
              className="leading-none tracking-tight"
              style={{
                fontFamily: '"ivypresto-display", Georgia, serif',
                fontStyle: 'italic',
                fontWeight: 300,
                fontSize: 'clamp(2rem, 4.5vw, 2.8rem)',
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
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setQuickOpen(true)}
              className="flex items-center gap-2 px-4 py-3 rounded-xl text-[12px] font-bold uppercase tracking-[0.1em] transition-all active:scale-95"
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
              className="flex items-center gap-2 px-5 py-3 rounded-xl text-[12px] font-bold uppercase tracking-[0.1em] transition-all active:scale-95"
              style={{ background: T.accent, color: T.accentBright }}
            >
              <Plus size={14} />
              Nova
            </button>
          </div>
        </div>

        {/* stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Stat value={stats.total} label="Total" />
          <Stat value={stats.draft} label="Rascunhos" />
          <Stat value={stats.sent} label="Enviadas" accent={T.accent} />
        </div>

        {/* busca */}
        <div
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl mb-4 transition-shadow focus-within:ring-2 focus-within:ring-[#C8D8D4]"
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
