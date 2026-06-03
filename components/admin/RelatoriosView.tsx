'use client'

import { useEffect, useState } from 'react'
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

const TYPE_META: Record<ProjectType, { label: string; color: string }> = {
  landing_page:   { label: 'Landing Page',          color: '#3B82F6' },
  site_completo:  { label: 'Site Completo',         color: '#A855F7' },
  mensal:         { label: 'Mensal',                color: '#EAB308' },
  posicionamento: { label: 'Posicionamento online', color: '#0EA5E9' },
  custom:         { label: 'Custom',                color: '#64748B' },
}

const STATUS_META_PROP: Record<ProposalStatus, { label: string; color: string }> = {
  draft:    { label: 'Rascunho',    color: '#94A3B8' },
  sent:     { label: 'Enviadas',    color: '#3B82F6' },
  viewed:   { label: 'Visualizadas', color: '#A855F7' },
  accepted: { label: 'Aceitas',     color: '#22C55E' },
  rejected: { label: 'Rejeitadas',  color: '#EF4444' },
  expired:  { label: 'Expiradas',   color: '#94A3B8' },
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

  const byType = new Map<ProjectType, number>()
  const byStatus = new Map<ProposalStatus, number>()
  let totalAccepted = 0
  let totalSent = 0
  for (const p of proposals) {
    byType.set(p.project_type, (byType.get(p.project_type) || 0) + 1)
    byStatus.set(p.status, (byStatus.get(p.status) || 0) + 1)
    const planValue = p.selected_plans.reduce(
      (s, pl) => s + (Number(pl.price_cash) || 0),
      0
    )
    if (p.status === 'accepted') totalAccepted += planValue
    if (p.status === 'sent' || p.status === 'viewed') totalSent += planValue
  }
  const typeSlices: Slice[] = (Object.keys(TYPE_META) as ProjectType[])
    .map((t) => ({
      label: TYPE_META[t].label,
      value: byType.get(t) || 0,
      color: TYPE_META[t].color,
    }))
    .filter((s) => s.value > 0)
  const statusSlices: Slice[] = (Object.keys(STATUS_META_PROP) as ProposalStatus[])
    .map((s) => ({
      label: STATUS_META_PROP[s].label,
      value: byStatus.get(s) || 0,
      color: STATUS_META_PROP[s].color,
    }))
    .filter((s) => s.value > 0)

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

            {(totalAccepted > 0 || totalSent > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <MetricCard
                  label="Faturamento aceito"
                  value={fmtBRL(totalAccepted)}
                  icon={<Activity size={15} />}
                  accent="#22C55E"
                  sub="soma das propostas marcadas como aceitas"
                />
                <MetricCard
                  label="Pipeline pendente"
                  value={fmtBRL(totalSent)}
                  icon={<Send size={15} />}
                  accent="#3B82F6"
                  sub="enviadas / visualizadas, ainda em aberto"
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
