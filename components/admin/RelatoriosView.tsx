'use client'

import { useEffect, useMemo, useState } from 'react'
import { Activity, Send, Filter, Compass } from 'lucide-react'
import { proposalStore } from '@/lib/proposalStore'
import { Proposal, ProjectType, ProposalStatus } from '@/lib/types'
import { waServer, WaChat, LEAD_STATUSES } from '@/lib/waServer'
import { closedProjectsStore, ClosedProject } from '@/lib/closedProjectsStore'

/* ── tokens ──────────────────────────────────────────── */

const T = {
  textPrimary: '#162322',
  textMuted: '#6B8585',
  textDim: '#8AA09A',
  border: '#E6E6E1',
  card: '#FFFFFF',
  bgSubtle: '#FAFAF8',
  accent: '#173B32',
  accentBright: '#EFE3C2',
}

/* ── helpers / mapas ─────────────────────────────────── */

// Rampa categórica da marca: distinguível no gráfico, sem tom saturado.
const TYPE_META: Record<ProjectType, { label: string; color: string }> = {
  landing_page:   { label: 'Landing Page',          color: '#173B32' },
  site_completo:  { label: 'Site Completo',         color: '#6E7A2E' },
  mensal:         { label: 'Mensal',                color: '#B08A3E' },
  posicionamento: { label: 'Posicionamento online', color: '#4E7F7A' },
  custom:         { label: 'Custom',                color: '#9AA8A2' },
}

// Mesma paleta de status da tela de Propostas (derivada da marca).
const STATUS_META_PROP: Record<ProposalStatus, { label: string; color: string }> = {
  draft:    { label: 'Rascunho',     color: '#7A8985' },
  sent:     { label: 'Enviadas',     color: '#173B32' },
  viewed:   { label: 'Visualizadas', color: '#6E7A2E' },
  accepted: { label: 'Aceitas',      color: '#2F6B4F' },
  rejected: { label: 'Rejeitadas',   color: '#9C5A48' },
  expired:  { label: 'Expiradas',    color: '#9AA8A2' },
}

function fmtBRL(v: number) {
  if (v >= 1000) return 'R$ ' + (v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + 'k'
  return 'R$ ' + v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
}

/* ── PieChart (SVG puro) ─────────────────────────────── */

interface Slice { label: string; value: number; color: string }

function PieChart({ slices, size = 180 }: { slices: Slice[]; size?: number }) {
  const total = slices.reduce((s, x) => s + x.value, 0)
  if (total === 0) {
    return (
      <div
        className="rounded-full flex items-center justify-center"
        style={{
          width: size, height: size,
          border: `2px dashed ${T.border}`,
          color: T.textDim, fontSize: 11,
        }}
      >
        sem dados
      </div>
    )
  }
  const r = size / 2
  const ri = r * 0.55
  const cx = r, cy = r
  let start = -Math.PI / 2
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {slices.map((s) => {
        if (s.value === 0) return null
        const angle = (s.value / total) * Math.PI * 2
        const end = start + angle
        const large = angle > Math.PI ? 1 : 0
        const x1 = cx + r * Math.cos(start)
        const y1 = cy + r * Math.sin(start)
        const x2 = cx + r * Math.cos(end)
        const y2 = cy + r * Math.sin(end)
        const x3 = cx + ri * Math.cos(end)
        const y3 = cy + ri * Math.sin(end)
        const x4 = cx + ri * Math.cos(start)
        const y4 = cy + ri * Math.sin(start)
        const d = [
          `M ${x1.toFixed(2)} ${y1.toFixed(2)}`,
          `A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`,
          `L ${x3.toFixed(2)} ${y3.toFixed(2)}`,
          `A ${ri} ${ri} 0 ${large} 0 ${x4.toFixed(2)} ${y4.toFixed(2)}`,
          'Z',
        ].join(' ')
        const path = (
          <path
            key={s.label}
            d={d}
            fill={s.color}
            stroke="#FFFFFF"
            strokeWidth={1.5}
          >
            <title>{`${s.label}: ${s.value} (${Math.round((s.value / total) * 100)}%)`}</title>
          </path>
        )
        start = end
        return path
      })}
      <text
        x={cx} y={cy - 4}
        textAnchor="middle"
        fontSize={28}
        fontWeight={700}
        fill="#162322"
      >
        {total}
      </text>
      <text
        x={cx} y={cy + 18}
        textAnchor="middle"
        fontSize={10}
        fontWeight={600}
        fill="#8AA09A"
        style={{ letterSpacing: '0.08em', textTransform: 'uppercase' }}
      >
        total
      </text>
    </svg>
  )
}

function PieLegend({ slices }: { slices: Slice[] }) {
  const total = slices.reduce((s, x) => s + x.value, 0)
  return (
    <div className="flex flex-col gap-2">
      {slices.map((s) => (
        <div key={s.label} className="flex items-center gap-2 text-[11px]">
          <span
            className="inline-block rounded"
            style={{ width: 10, height: 10, background: s.color }}
          />
          <span style={{ color: T.textPrimary }} className="font-semibold">{s.label}</span>
          <span className="ml-auto tabular-nums" style={{ color: T.textMuted }}>
            {s.value}
            {total > 0 && (
              <span style={{ color: T.textDim }}>
                {' '}({Math.round((s.value / total) * 100)}%)
              </span>
            )}
          </span>
        </div>
      ))}
    </div>
  )
}

/* ── MetricCard local ─────────────────────────────────── */

function MetricCard({
  label,
  value,
  icon,
  sub,
  accent,
}: {
  label: string
  value: string
  icon: React.ReactNode
  sub?: string
  accent?: string
}) {
  const tone = accent ?? T.textPrimary
  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: T.card, border: `1px solid ${T.border}` }}
    >
      <div className="flex items-center justify-between mb-4">
        <span
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: tone + '1C', color: tone }}
        >
          {icon}
        </span>
        <span
          className="text-[10px] font-bold uppercase tracking-wider text-right"
          style={{ color: T.textDim }}
        >
          {label}
        </span>
      </div>
      <p
        className="font-bold leading-none tabular-nums"
        style={{
          color: tone,
          letterSpacing: '-0.02em',
          fontSize: 'clamp(1.875rem, 3.4vw, 2.5rem)',
        }}
      >
        {value}
      </p>
      {sub && (
        <p className="text-[11px] mt-2" style={{ color: T.textDim }}>
          {sub}
        </p>
      )}
    </div>
  )
}

/* ── gauge circular (taxa de conversão) ──────────────────── */

function ConversionCard({
  value,
  sub,
  color,
}: {
  value: number | null
  sub: string
  color: string
}) {
  const size = 96
  const r = 37
  const c = 2 * Math.PI * r
  const pct = value ?? 0
  const offset = c * (1 - Math.min(100, Math.max(0, pct)) / 100)
  return (
    <div className="rounded-2xl p-5" style={{ background: T.card, border: `1px solid ${T.border}` }}>
      <div className="flex items-center justify-between mb-4">
        <span
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: color + '1C', color }}
        >
          <Activity size={15} />
        </span>
        <span
          className="text-[10px] font-bold uppercase tracking-wider text-right"
          style={{ color: T.textDim }}
        >
          Taxa de conversão
        </span>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={T.bgSubtle} strokeWidth={7} />
            {value != null && (
              <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={color}
                strokeWidth={7}
                strokeLinecap="round"
                strokeDasharray={c}
                strokeDashoffset={offset}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                style={{ transition: 'stroke-dashoffset 0.4s ease' }}
              />
            )}
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className="font-bold tabular-nums"
              style={{ color: value != null ? color : T.textDim, fontSize: 26, letterSpacing: '-0.02em' }}
            >
              {value != null ? `${value}%` : '—'}
            </span>
          </div>
        </div>
        <p className="text-[11px] leading-relaxed" style={{ color: T.textDim }}>
          {sub}
        </p>
      </div>
    </div>
  )
}

/* ── main ────────────────────────────────────────────── */

export default function RelatoriosView() {
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(true)
  const [chats, setChats] = useState<WaChat[]>([])
  const [closedProjects, setClosedProjects] = useState<ClosedProject[]>([])
  const [chatsError, setChatsError] = useState(false)
  const [funnelDays, setFunnelDays] = useState(30)

  useEffect(() => {
    proposalStore
      .getAll()
      .then((p) => {
        setProposals(p)
        setLoading(false)
      })
      .catch(() => setLoading(false))
    waServer
      .chats()
      .then(setChats)
      .catch(() => setChatsError(true))
    closedProjectsStore
      .getAll()
      .then(setClosedProjects)
      .catch(() => {})
  }, [])

  // Funil (situação atual) + desempenho por origem — derivam dos chats do
  // wa-server (leads reais), não das propostas. Mesmo filtro do LeadsView:
  // fora grupo, arquivada e etiqueta 'pessoal'.
  const chatStats = useMemo(() => {
    const real = chats.filter(
      (c) => !c.archived && !c.isGroup && !(c.tags || []).includes('pessoal'),
    )
    // funil = situação atual das conversas ATIVAS (janela de dias) — sem isso,
    // anos de contatos parados em "Lead" dominam o gráfico e escondem o resto.
    const cutoff = funnelDays > 0 ? Date.now() / 1000 - funnelDays * 86400 : 0
    const activeReal = real.filter((c) => c.lastTime >= cutoff)
    const byStage = new Map<string, number>()
    for (const c of activeReal) byStage.set(c.status, (byStage.get(c.status) || 0) + 1)
    const funnel = LEAD_STATUSES.map((s) => ({
      label: s.label,
      count: byStage.get(s.id) || 0,
      color: s.color,
    }))

    // origem = atribuição de receita por canal, então usa o histórico TODO
    // (uma venda de 6 meses atrás não pode sumir só porque a conversa esfriou).
    const revenueBySource = new Map<string, number>()
    for (const cp of closedProjects) {
      const src = cp.source || 'Não informado'
      revenueBySource.set(src, (revenueBySource.get(src) || 0) + (cp.value || 0))
    }
    const bySource = new Map<string, { leads: number; converted: number }>()
    for (const c of real) {
      const src = c.source || 'Não informado'
      const cur = bySource.get(src) || { leads: 0, converted: 0 }
      cur.leads++
      if (c.status === 'ACEITA' || c.status === 'FECHADO') cur.converted++
      bySource.set(src, cur)
    }
    const sourceRows = Array.from(bySource.entries())
      .map(([source, v]) => ({
        source,
        leads: v.leads,
        converted: v.converted,
        rate: v.leads > 0 ? Math.round((v.converted / v.leads) * 100) : 0,
        revenue: revenueBySource.get(source) || 0,
      }))
      .sort((a, b) => b.leads - a.leads)

    return { funnel, funnelTotal: activeReal.length, sourceRows }
  }, [chats, closedProjects, funnelDays])

  // Tudo deriva de `proposals`. Antes: 4 loops + 2 sort + 2 map em todo
  // render (até em hover de slice de pizza). Agora roda só quando proposals muda.
  const stats = useMemo(() => {
    // Uma proposta pode trazer 2 planos ALTERNATIVOS (o cliente escolhe um,
    // não os dois) — nunca somar. Pra valor "de intenção" (pipeline/perdido),
    // usa o plano marcado como recomendado (mesma convenção do CSV de
    // Propostas); pra valor ACEITO de verdade, prioriza o que está
    // registrado em Fechados (closedProjects), que é o que ela confirma na
    // mão — só cai pro plano recomendado se a proposta aceita não tiver
    // linha em Fechados.
    const closedValueByProposal = new Map<string, number>()
    for (const cp of closedProjects) {
      if (cp.proposal_id && cp.value > 0) closedValueByProposal.set(cp.proposal_id, cp.value)
    }
    const planValue = (p: Proposal) => {
      const rec = p.selected_plans.find((pl) => pl.is_recommended) || p.selected_plans[0]
      return Number(rec?.price_cash) || 0
    }
    const acceptedValue = (p: Proposal) => closedValueByProposal.get(p.id) ?? planValue(p)

    const byType = new Map<ProjectType, number>()
    const byStatus = new Map<ProposalStatus, number>()
    const byMonth = new Map<string, number>()
    const revenueByMonth = new Map<string, number>()
    let totalAccepted = 0, totalSent = 0, totalLost = 0
    let acceptedCount = 0, closedCount = 0

    const dealsWithValue: { p: Proposal; v: number }[] = []
    const now = Date.now()
    const in14d = now + 14 * 86400_000
    const expCandidates: Proposal[] = []

    for (const p of proposals) {
      byType.set(p.project_type, (byType.get(p.project_type) || 0) + 1)
      byStatus.set(p.status, (byStatus.get(p.status) || 0) + 1)
      const isAccepted = p.status === 'accepted'
      const v = isAccepted ? acceptedValue(p) : planValue(p)
      if (v > 0) dealsWithValue.push({ p, v })
      if (isAccepted) { totalAccepted += v; acceptedCount++; closedCount++ }
      else if (p.status === 'sent' || p.status === 'viewed') {
        totalSent += v
        if (p.valid_until) {
          const t = new Date(p.valid_until).getTime()
          if (t >= now && t <= in14d) expCandidates.push(p)
        }
      }
      else if (p.status === 'rejected' || p.status === 'expired') {
        totalLost += v; closedCount++
      }
      if (p.created_at) {
        const d = new Date(p.created_at)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        byMonth.set(key, (byMonth.get(key) || 0) + 1)
      }
      // faturamento por mês = mês em que a proposta virou aceita (updated_at),
      // não o mês em que foi criada.
      if (isAccepted && v > 0) {
        const ad = new Date(p.updated_at || p.created_at || Date.now())
        const akey = `${ad.getFullYear()}-${String(ad.getMonth() + 1).padStart(2, '0')}`
        revenueByMonth.set(akey, (revenueByMonth.get(akey) || 0) + v)
      }
    }

    const topDeals = dealsWithValue.sort((a, b) => b.v - a.v).slice(0, 5)

    const expiringSoon = expCandidates
      .sort((a, b) => new Date(a.valid_until).getTime() - new Date(b.valid_until).getTime())
      .slice(0, 8)

    const months: { key: string; label: string; count: number; revenue: number }[] = []
    const today = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      months.push({
        key,
        label: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
        count: byMonth.get(key) || 0,
        revenue: revenueByMonth.get(key) || 0,
      })
    }
    const maxMonthly = Math.max(1, ...months.map((m) => m.count))
    const maxMonthlyRevenue = Math.max(1, ...months.map((m) => m.revenue))

    const typeSlices: Slice[] = (Object.keys(TYPE_META) as ProjectType[])
      .map((t) => ({ label: TYPE_META[t].label, value: byType.get(t) || 0, color: TYPE_META[t].color }))
      .filter((s) => s.value > 0)
    const statusSlices: Slice[] = (Object.keys(STATUS_META_PROP) as ProposalStatus[])
      .map((s) => ({ label: STATUS_META_PROP[s].label, value: byStatus.get(s) || 0, color: STATUS_META_PROP[s].color }))
      .filter((s) => s.value > 0)

    return {
      totalAccepted, totalSent, totalLost,
      acceptedCount, closedCount,
      conversionRate: closedCount > 0 ? Math.round((acceptedCount / closedCount) * 100) : 0,
      avgTicket: acceptedCount > 0 ? Math.round(totalAccepted / acceptedCount) : 0,
      topDeals, expiringSoon, months, maxMonthly, maxMonthlyRevenue, typeSlices, statusSlices,
    }
  }, [proposals, closedProjects])

  const {
    totalAccepted, totalSent, totalLost,
    acceptedCount, closedCount, conversionRate, avgTicket,
    topDeals, expiringSoon, months, maxMonthly, maxMonthlyRevenue, typeSlices, statusSlices,
  } = stats

  return (
    <div className="flex-1 min-h-0 overflow-y-auto thin-scroll">
      <div className="max-w-6xl mx-auto px-4 sm:px-8 pt-6 sm:pt-10 pb-20">
        <h1
          className="leading-none tracking-tight mb-2"
          style={{
            fontFamily: '"ivypresto-display", Georgia, serif',
            fontStyle: 'italic',
            fontWeight: 300,
            fontSize: 'clamp(2rem, 4.5vw, 2.8rem)',
            color: T.textPrimary,
          }}
        >
          Relatórios
        </h1>
        <p className="text-[13px] mb-8" style={{ color: T.textMuted }}>
          Distribuição das suas propostas e faturamento total.
        </p>

        {loading ? (
          <p className="text-[13px]" style={{ color: T.textMuted }}>
            Carregando…
          </p>
        ) : proposals.length === 0 ? (
          <div
            className="rounded-2xl p-12 text-center"
            style={{ background: T.card, border: `1px solid ${T.border}` }}
          >
            <p className="text-[13px]" style={{ color: T.textMuted }}>
              Você ainda não tem propostas. Crie a primeira em{' '}
              <a
                href="/admin"
                className="font-bold underline"
                style={{ color: T.accent }}
              >
                Propostas
              </a>
              .
            </p>
          </div>
        ) : (
          <>
            <p
              className="text-[11px] font-bold uppercase tracking-[0.14em] mb-3"
              style={{ color: T.textDim }}
            >
              Histórico completo · {proposals.length} proposta
              {proposals.length !== 1 ? 's' : ''}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div
                className="rounded-2xl p-5"
                style={{ background: T.card, border: `1px solid ${T.border}` }}
              >
                <p
                  className="text-[10px] font-bold uppercase tracking-[0.14em] mb-4"
                  style={{ color: T.textDim }}
                >
                  Por tipo de proposta
                </p>
                <div className="flex items-center gap-5 flex-wrap">
                  <PieChart slices={typeSlices} size={170} />
                  <div className="flex-1 min-w-[160px]">
                    <PieLegend slices={typeSlices} />
                  </div>
                </div>
              </div>

              <div
                className="rounded-2xl p-5"
                style={{ background: T.card, border: `1px solid ${T.border}` }}
              >
                <p
                  className="text-[10px] font-bold uppercase tracking-[0.14em] mb-4"
                  style={{ color: T.textDim }}
                >
                  Por status
                </p>
                <div className="flex items-center gap-5 flex-wrap">
                  <PieChart slices={statusSlices} size={170} />
                  <div className="flex-1 min-w-[160px]">
                    <PieLegend slices={statusSlices} />
                  </div>
                </div>
              </div>
            </div>

            {/* ── 5 KPIs de performance ── */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-3">
              <ConversionCard
                value={closedCount > 0 ? conversionRate : null}
                color={conversionRate >= 30 ? '#2F6B4F' : conversionRate >= 15 ? '#B08A3E' : '#9C5A48'}
                sub={closedCount > 0 ? `${acceptedCount} de ${closedCount} fechadas` : 'sem ciclo fechado ainda'}
              />
              <MetricCard
                label="Ticket médio aceito"
                value={acceptedCount > 0 ? fmtBRL(avgTicket) : '—'}
                icon={<Send size={15} />}
                accent="#4E7F7A"
                sub={acceptedCount > 0 ? `${acceptedCount} aceita${acceptedCount > 1 ? 's' : ''}` : 'nenhuma aceita'}
              />
              <MetricCard
                label="Faturamento aceito"
                value={fmtBRL(totalAccepted)}
                icon={<Activity size={15} />}
                accent="#2F6B4F"
                sub="soma das aceitas"
              />
              <MetricCard
                label="Pipeline pendente"
                value={fmtBRL(totalSent)}
                icon={<Send size={15} />}
                accent="#173B32"
                sub="enviadas / visualizadas"
              />
              <MetricCard
                label="Valor perdido"
                value={fmtBRL(totalLost)}
                icon={<Activity size={15} />}
                accent="#9C5A48"
                sub="rejeitadas + expiradas"
              />
            </div>

            {/* ── Bar chart: propostas criadas por mês ── */}
            <div
              className="rounded-2xl p-5 mb-3"
              style={{ background: T.card, border: `1px solid ${T.border}` }}
            >
              <p
                className="text-[10px] font-bold uppercase tracking-[0.14em] mb-4"
                style={{ color: T.textDim }}
              >
                Propostas criadas — últimos 6 meses
              </p>
              <div className="flex items-end gap-3" style={{ height: 100 }}>
                {months.map((m) => (
                  <div key={m.key} className="flex-1 flex flex-col items-center gap-1">
                    <div className="flex-1 w-full flex items-end">
                      <div
                        className="w-full rounded-t transition-all"
                        style={{
                          height: `${(m.count / maxMonthly) * 100}%`,
                          minHeight: m.count > 0 ? 4 : 0,
                          background: m.count > 0 ? T.accent : 'transparent',
                          border: m.count === 0 ? `1px dashed ${T.border}` : 'none',
                        }}
                        title={`${m.label}: ${m.count} proposta${m.count !== 1 ? 's' : ''}`}
                      />
                    </div>
                    <span
                      className="text-[10px] font-semibold tabular-nums"
                      style={{ color: T.textPrimary }}
                    >
                      {m.count}
                    </span>
                    <span className="text-[9px] uppercase" style={{ color: T.textDim }}>
                      {m.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Bar chart: faturamento aceito por mês ── */}
            <div
              className="rounded-2xl p-5 mb-3"
              style={{ background: T.card, border: `1px solid ${T.border}` }}
            >
              <p
                className="text-[10px] font-bold uppercase tracking-[0.14em] mb-4"
                style={{ color: T.textDim }}
              >
                Faturamento aceito — últimos 6 meses
              </p>
              <div className="flex items-end gap-3" style={{ height: 100 }}>
                {months.map((m) => (
                  <div key={m.key} className="flex-1 flex flex-col items-center gap-1">
                    <div className="flex-1 w-full flex items-end">
                      <div
                        className="w-full rounded-t transition-all"
                        style={{
                          height: `${(m.revenue / maxMonthlyRevenue) * 100}%`,
                          minHeight: m.revenue > 0 ? 4 : 0,
                          background: m.revenue > 0 ? '#2F6B4F' : 'transparent',
                          border: m.revenue === 0 ? `1px dashed ${T.border}` : 'none',
                        }}
                        title={`${m.label}: ${fmtBRL(m.revenue)}`}
                      />
                    </div>
                    <span
                      className="text-[10px] font-semibold tabular-nums"
                      style={{ color: T.textPrimary }}
                    >
                      {m.revenue > 0 ? fmtBRL(m.revenue) : '—'}
                    </span>
                    <span className="text-[9px] uppercase" style={{ color: T.textDim }}>
                      {m.label}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] mt-4" style={{ color: T.textDim }}>
                Conta pelo mês em que a proposta virou aceita, não pelo mês de criação.
              </p>
            </div>

            {/* ── Top 5 maiores propostas + Vencendo em breve ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div
                className="rounded-2xl p-5"
                style={{ background: T.card, border: `1px solid ${T.border}` }}
              >
                <p
                  className="text-[10px] font-bold uppercase tracking-[0.14em] mb-3"
                  style={{ color: T.textDim }}
                >
                  Top 5 maiores
                </p>
                {topDeals.length === 0 ? (
                  <p className="text-[12px]" style={{ color: T.textDim }}>
                    Nenhuma proposta com valor definido ainda.
                  </p>
                ) : (
                  <div className="flex flex-col">
                    {topDeals.map(({ p, v }, i) => {
                      const sm = STATUS_META_PROP[p.status]
                      return (
                        <a
                          key={p.id}
                          href={`/admin/edit/${p.id}`}
                          className="flex items-center justify-between gap-3 py-2.5 transition-colors hover:bg-[#FAFAF8] px-2 -mx-2 rounded-lg"
                          style={{ borderTop: i > 0 ? `1px solid ${T.border}` : 'none' }}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold truncate" style={{ color: T.textPrimary }}>
                              {p.client_name}
                            </p>
                            <span
                              className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded mt-0.5 inline-block"
                              style={{ color: sm.color, background: sm.color + '15' }}
                            >
                              {sm.label}
                            </span>
                          </div>
                          <p className="text-[14px] font-bold tabular-nums" style={{ color: T.textPrimary }}>
                            {fmtBRL(v)}
                          </p>
                        </a>
                      )
                    })}
                  </div>
                )}
              </div>

              <div
                className="rounded-2xl p-5"
                style={{ background: T.card, border: `1px solid ${T.border}` }}
              >
                <p
                  className="text-[10px] font-bold uppercase tracking-[0.14em] mb-3"
                  style={{ color: T.textDim }}
                >
                  ⏰ Vencendo em 14 dias
                </p>
                {expiringSoon.length === 0 ? (
                  <p className="text-[12px]" style={{ color: T.textDim }}>
                    Nenhuma proposta vence nos próximos 14 dias.
                  </p>
                ) : (
                  <div className="flex flex-col">
                    {expiringSoon.map((p, i) => {
                      const daysLeft = Math.ceil(
                        (new Date(p.valid_until).getTime() - Date.now()) / 86400_000
                      )
                      const urgent = daysLeft <= 3
                      return (
                        <a
                          key={p.id}
                          href={`/admin/edit/${p.id}`}
                          className="flex items-center justify-between gap-3 py-2.5 transition-colors hover:bg-[#FAFAF8] px-2 -mx-2 rounded-lg"
                          style={{ borderTop: i > 0 ? `1px solid ${T.border}` : 'none' }}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold truncate" style={{ color: T.textPrimary }}>
                              {p.client_name}
                            </p>
                            <p className="text-[10px]" style={{ color: T.textMuted }}>
                              vence {new Date(p.valid_until).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                          <span
                            className="text-[10px] font-bold px-2 py-1 rounded"
                            style={{
                              background: urgent ? '#FEF2F2' : '#FEFCE8',
                              color: urgent ? '#B91C1C' : '#A16207',
                            }}
                          >
                            {daysLeft === 0 ? 'hoje' : `${daysLeft}d`}
                          </span>
                        </a>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* ── Funil (situação atual) — leads reais do WhatsApp por etapa ── */}
            <div
              className="rounded-2xl p-5 mt-3"
              style={{ background: T.card, border: `1px solid ${T.border}` }}
            >
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <p
                  className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em]"
                  style={{ color: T.textDim }}
                >
                  <Filter size={12} />
                  Funil — situação atual dos leads
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-[11px]" style={{ color: T.textMuted }}>
                    {chatStats.funnelTotal} conversas ativas
                  </span>
                  <div
                    className="flex items-center gap-1 p-0.5 rounded-full"
                    style={{ background: T.bgSubtle, border: `1px solid ${T.border}` }}
                    title="Só conversas mexidas nos últimos X dias — evita que contatos parados há anos dominem o gráfico"
                  >
                    {([
                      { d: 7, label: '7d' },
                      { d: 30, label: '30d' },
                      { d: 90, label: '90d' },
                      { d: 0, label: 'Tudo' },
                    ] as const).map((o) => (
                      <button
                        key={o.d}
                        onClick={() => setFunnelDays(o.d)}
                        className="text-[10px] font-bold px-2 py-1 rounded-full transition-all"
                        style={{
                          background: funnelDays === o.d ? T.accent : 'transparent',
                          color: funnelDays === o.d ? T.accentBright : T.textMuted,
                        }}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {chatsError ? (
                <p className="text-[12px]" style={{ color: T.textDim }}>
                  Servidor do WhatsApp offline no momento — sem dados de funil pra mostrar.
                </p>
              ) : chatStats.funnelTotal === 0 ? (
                <p className="text-[12px]" style={{ color: T.textDim }}>
                  Carregando…
                </p>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {chatStats.funnel.map((s) => {
                    const max = Math.max(1, ...chatStats.funnel.map((x) => x.count))
                    const pct = chatStats.funnelTotal > 0
                      ? Math.round((s.count / chatStats.funnelTotal) * 100)
                      : 0
                    return (
                      <div key={s.label} className="flex items-center gap-3">
                        <span
                          className="text-[11px] font-semibold flex-shrink-0"
                          style={{ color: T.textPrimary, width: 132 }}
                        >
                          {s.label}
                        </span>
                        <div
                          className="flex-1 h-5 rounded-md overflow-hidden"
                          style={{ background: T.bgSubtle }}
                        >
                          <div
                            className="h-full rounded-md transition-all"
                            style={{
                              width: `${(s.count / max) * 100}%`,
                              background: s.color,
                              minWidth: s.count > 0 ? 6 : 0,
                            }}
                          />
                        </div>
                        <span
                          className="text-[11px] font-bold tabular-nums flex-shrink-0 text-right"
                          style={{ color: T.textPrimary, width: 78 }}
                        >
                          {s.count}{' '}
                          <span className="font-normal" style={{ color: T.textDim }}>
                            ({pct}%)
                          </span>
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
              <p className="text-[10px] mt-4" style={{ color: T.textDim }}>
                Foto do agora, não histórico — mostra onde as conversas estão hoje,
                não quantas passaram por cada etapa ao longo do tempo.
              </p>
            </div>

            {/* ── Desempenho por origem/canal ── */}
            <div
              className="rounded-2xl p-5 mt-3"
              style={{ background: T.card, border: `1px solid ${T.border}` }}
            >
              <p
                className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] mb-4"
                style={{ color: T.textDim }}
              >
                <Compass size={12} />
                Desempenho por origem
              </p>
              {chatsError ? (
                <p className="text-[12px]" style={{ color: T.textDim }}>
                  Servidor do WhatsApp offline no momento — sem dados de origem pra mostrar.
                </p>
              ) : chatStats.sourceRows.length === 0 ? (
                <p className="text-[12px]" style={{ color: T.textDim }}>
                  Carregando…
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-[12px]" style={{ minWidth: 480 }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                        <th className="text-left font-bold uppercase tracking-wider py-2" style={{ color: T.textDim, fontSize: 10 }}>
                          Origem
                        </th>
                        <th className="text-right font-bold uppercase tracking-wider py-2" style={{ color: T.textDim, fontSize: 10 }}>
                          Leads
                        </th>
                        <th className="text-right font-bold uppercase tracking-wider py-2" style={{ color: T.textDim, fontSize: 10 }}>
                          Convertidos
                        </th>
                        <th className="text-right font-bold uppercase tracking-wider py-2" style={{ color: T.textDim, fontSize: 10 }}>
                          Taxa
                        </th>
                        <th className="text-right font-bold uppercase tracking-wider py-2" style={{ color: T.textDim, fontSize: 10 }}>
                          Receita fechada
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {chatStats.sourceRows.map((r) => (
                        <tr key={r.source} style={{ borderBottom: `1px solid ${T.border}` }}>
                          <td className="py-2.5 font-semibold" style={{ color: T.textPrimary }}>
                            {r.source}
                          </td>
                          <td className="py-2.5 text-right tabular-nums" style={{ color: T.textPrimary }}>
                            {r.leads}
                          </td>
                          <td className="py-2.5 text-right tabular-nums" style={{ color: T.textMuted }}>
                            {r.converted}
                          </td>
                          <td
                            className="py-2.5 text-right tabular-nums font-bold"
                            style={{ color: r.rate >= 15 ? '#2F6B4F' : T.textMuted }}
                          >
                            {r.rate}%
                          </td>
                          <td className="py-2.5 text-right tabular-nums font-bold" style={{ color: T.textPrimary }}>
                            {r.revenue > 0 ? fmtBRL(r.revenue) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="text-[10px] mt-3" style={{ color: T.textDim }}>
                &quot;Convertidos&quot; conta conversas em Proposta aceita/Fechado; receita
                vem do que está registrado em Fechados por origem.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
