'use client'

import { useEffect, useMemo, useState } from 'react'
import { Activity, Send } from 'lucide-react'
import { proposalStore } from '@/lib/proposalStore'
import { Proposal, ProjectType, ProposalStatus } from '@/lib/types'

/* ── tokens ──────────────────────────────────────────── */

const T = {
  textPrimary: '#162322',
  textMuted: '#6B8585',
  textDim: '#8AA09A',
  border: '#E6E6E1',
  card: '#FFFFFF',
  bgSubtle: '#FAFAF8',
  accent: '#0D3839',
  accentBright: '#F4F99D',
}

/* ── helpers / mapas ─────────────────────────────────── */

// Rampa categórica da marca: distinguível no gráfico, sem tom saturado.
const TYPE_META: Record<ProjectType, { label: string; color: string }> = {
  landing_page:   { label: 'Landing Page',          color: '#0D3839' },
  site_completo:  { label: 'Site Completo',         color: '#6E7A2E' },
  mensal:         { label: 'Mensal',                color: '#B08A3E' },
  posicionamento: { label: 'Posicionamento online', color: '#4E7F7A' },
  custom:         { label: 'Custom',                color: '#9AA8A2' },
}

// Mesma paleta de status da tela de Propostas (derivada da marca).
const STATUS_META_PROP: Record<ProposalStatus, { label: string; color: string }> = {
  draft:    { label: 'Rascunho',     color: '#7A8985' },
  sent:     { label: 'Enviadas',     color: '#0D3839' },
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
  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: T.card, border: `1px solid ${T.border}` }}
    >
      <div className="flex items-center justify-between mb-3">
        <span
          className="text-[10px] font-bold uppercase tracking-[0.14em]"
          style={{ color: T.textDim }}
        >
          {label}
        </span>
        <span style={{ color: T.textDim }}>{icon}</span>
      </div>
      <p
        className="font-bold leading-none tracking-tight"
        style={{
          color: accent ?? T.textPrimary,
          fontSize: 'clamp(2rem, 4vw, 2.6rem)',
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

/* ── main ────────────────────────────────────────────── */

export default function RelatoriosView() {
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    proposalStore
      .getAll()
      .then((p) => {
        setProposals(p)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  // Tudo deriva de `proposals`. Antes: 4 loops + 2 sort + 2 map em todo
  // render (até em hover de slice de pizza). Agora roda só quando proposals muda.
  const stats = useMemo(() => {
    const propValue = (p: Proposal) =>
      p.selected_plans.reduce((s, pl) => s + (Number(pl.price_cash) || 0), 0)

    const byType = new Map<ProjectType, number>()
    const byStatus = new Map<ProposalStatus, number>()
    const byMonth = new Map<string, number>()
    let totalAccepted = 0, totalSent = 0, totalLost = 0
    let acceptedCount = 0, closedCount = 0

    const dealsWithValue: { p: Proposal; v: number }[] = []
    const now = Date.now()
    const in14d = now + 14 * 86400_000
    const expCandidates: Proposal[] = []

    for (const p of proposals) {
      byType.set(p.project_type, (byType.get(p.project_type) || 0) + 1)
      byStatus.set(p.status, (byStatus.get(p.status) || 0) + 1)
      const v = propValue(p)
      if (v > 0) dealsWithValue.push({ p, v })
      if (p.status === 'accepted') { totalAccepted += v; acceptedCount++; closedCount++ }
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
    }

    const topDeals = dealsWithValue.sort((a, b) => b.v - a.v).slice(0, 5)

    const expiringSoon = expCandidates
      .sort((a, b) => new Date(a.valid_until).getTime() - new Date(b.valid_until).getTime())
      .slice(0, 8)

    const months: { key: string; label: string; count: number }[] = []
    const today = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      months.push({
        key,
        label: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
        count: byMonth.get(key) || 0,
      })
    }
    const maxMonthly = Math.max(1, ...months.map((m) => m.count))

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
      topDeals, expiringSoon, months, maxMonthly, typeSlices, statusSlices,
    }
  }, [proposals])

  const {
    totalAccepted, totalSent, totalLost,
    acceptedCount, closedCount, conversionRate, avgTicket,
    topDeals, expiringSoon, months, maxMonthly, typeSlices, statusSlices,
  } = stats

  return (
    <div className="flex-1 min-h-0 overflow-y-auto thin-scroll">
      <div className="max-w-6xl mx-auto px-4 sm:px-8 pt-6 sm:pt-10 pb-20">
        <p
          className="text-[10px] font-bold uppercase tracking-[0.2em] mb-3"
          style={{ color: T.textDim }}
        >
          RELATÓRIO · PROPOSTAS
        </p>
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
              <MetricCard
                label="Taxa de conversão"
                value={closedCount > 0 ? `${conversionRate}%` : '—'}
                icon={<Activity size={15} />}
                accent={conversionRate >= 30 ? '#2F6B4F' : conversionRate >= 15 ? '#B08A3E' : '#9C5A48'}
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
                accent="#0D3839"
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
          </>
        )}
      </div>
    </div>
  )
}
