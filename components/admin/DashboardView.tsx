'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { waServer, WaDashboard, WaSeriesPoint } from '@/lib/waServer'
import { proposalStore } from '@/lib/proposalStore'
import { Proposal, ProjectType, ProposalStatus } from '@/lib/types'
import {
  Inbox,
  MessageSquare,
  AlertCircle,
  Send,
  Clock,
  Timer,
  Activity,
  ArrowRight,
} from 'lucide-react'

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

const PERIODS = [
  { id: 'today', label: 'Hoje' },
  { id: 'week', label: 'Semana' },
  { id: 'month', label: 'Mês' },
  { id: 'all', label: 'Tudo' },
] as const

/* ── mapas de cor/label pro relatório de propostas ─── */

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

const PERIOD_SUB: Record<string, string> = {
  today: 'hoje',
  week: 'esta semana',
  month: 'este mês',
  all: 'no total',
}

function fmtResponse(min: number) {
  if (!min) return '—'
  if (min < 60) return `${min}min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h}h${m}` : `${h}h`
}

function fmtWait(h: number) {
  if (!h) return '—'
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

/* ── pie chart (SVG puro) ────────────────────────────── */

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
  // anel donut: raio externo + interno
  const r = size / 2
  const ri = r * 0.55
  const cx = r, cy = r
  let start = -Math.PI / 2 // começa no topo
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {slices.map((s) => {
        if (s.value === 0) return null
        const angle = (s.value / total) * Math.PI * 2
        const end = start + angle
        const large = angle > Math.PI ? 1 : 0
        // outer arc
        const x1 = cx + r * Math.cos(start)
        const y1 = cy + r * Math.sin(start)
        const x2 = cx + r * Math.cos(end)
        const y2 = cy + r * Math.sin(end)
        // inner arc (reverso)
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
      {/* total no centro */}
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

/* ── sparkline ───────────────────────────────────────── */

function Sparkline({ series }: { series: WaSeriesPoint[] }) {
  const W = 800
  const H = 110
  const PAD_X = 8
  const PAD_Y = 12
  const n = series.length
  if (n < 2) return null
  const maxVal = Math.max(1, ...series.map((p) => p.received + p.sent))
  const stepX = (W - PAD_X * 2) / (n - 1)

  function path(key: 'received' | 'sent') {
    return series
      .map((p, i) => {
        const x = PAD_X + i * stepX
        const y = PAD_Y + (H - PAD_Y * 2) * (1 - p[key] / maxVal)
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
      })
      .join(' ')
  }

  // path da área (preenchimento sob a linha)
  function area(key: 'received' | 'sent') {
    const top = series.map((p, i) => {
      const x = PAD_X + i * stepX
      const y = PAD_Y + (H - PAD_Y * 2) * (1 - p[key] / maxVal)
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
    }).join(' ')
    const bottom = `L ${(PAD_X + (n - 1) * stepX).toFixed(1)} ${(H - PAD_Y).toFixed(1)} L ${PAD_X.toFixed(1)} ${(H - PAD_Y).toFixed(1)} Z`
    return top + ' ' + bottom
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      style={{ height: H, overflow: 'visible' }}
      preserveAspectRatio="none"
    >
      {/* baseline */}
      <line
        x1={PAD_X} x2={W - PAD_X}
        y1={H - PAD_Y} y2={H - PAD_Y}
        stroke="#E6E6E1" strokeWidth={1} strokeDasharray="2 3"
      />
      {/* received (azul) */}
      <path d={area('received')} fill="#3B82F6" fillOpacity={0.08} />
      <path d={path('received')} fill="none" stroke="#3B82F6" strokeWidth={1.5} strokeLinejoin="round" />
      {/* sent (verde) */}
      <path d={area('sent')} fill="#22C55E" fillOpacity={0.08} />
      <path d={path('sent')} fill="none" stroke="#22C55E" strokeWidth={1.5} strokeLinejoin="round" />
    </svg>
  )
}

/* ── card ────────────────────────────────────────────── */

function MetricCard({
  label,
  value,
  icon,
  sub,
  accent,
  onClick,
}: {
  label: string
  value: string | number
  icon: React.ReactNode
  sub?: string
  accent?: string
  onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      className="rounded-2xl p-5 transition-all"
      style={{
        background: T.card,
        border: `1px solid ${T.border}`,
        cursor: onClick ? 'pointer' : 'default',
      }}
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

export default function DashboardView() {
  const router = useRouter()
  const [period, setPeriod] = useState<string>('week')
  const [data, setData] = useState<WaDashboard | null>(null)
  const [series, setSeries] = useState<WaSeriesPoint[]>([])
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [serverOff, setServerOff] = useState(false)

  // carrega propostas uma vez (pra distribuição em pizza)
  useEffect(() => {
    proposalStore.getAll().then(setProposals).catch(() => {})
  }, [])

  useEffect(() => {
    let alive = true
    async function load() {
      try {
        const [d, s] = await Promise.all([
          waServer.dashboard(period),
          waServer.dashboardSeries(period),
        ])
        if (alive) {
          setData(d)
          setSeries(s.series || [])
          setServerOff(false)
        }
      } catch {
        if (alive) setServerOff(true)
      }
    }
    load()
    const iv = setInterval(load, 10000)
    return () => {
      alive = false
      clearInterval(iv)
    }
  }, [period])

  const periodSub = PERIOD_SUB[period] || ''

  return (
    <div className="flex-1 min-h-0 overflow-y-auto thin-scroll">
      <div className="max-w-6xl mx-auto px-8 pt-10 pb-20">
        <p
          className="text-[10px] font-bold uppercase tracking-[0.2em] mb-3"
          style={{ color: T.textDim }}
        >
          DASHBOARD · WHATSAPP
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
          Métricas
        </h1>
        <p className="text-[13px] mb-8" style={{ color: T.textMuted }}>
          Termômetro do seu atendimento no WhatsApp.
        </p>

        {/* period tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {PERIODS.map((p) => {
            const active = period === p.id
            return (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className="text-[11px] font-bold px-4 py-2 rounded-full transition-all"
                style={{
                  background: active ? T.accent : T.card,
                  color: active ? T.accentBright : T.textMuted,
                  border: `1px solid ${active ? T.accent : T.border}`,
                }}
              >
                {p.label}
              </button>
            )
          })}
        </div>

        {serverOff ? (
          <div
            className="rounded-2xl p-12 text-center"
            style={{
              background: '#FEF2F2',
              border: '1px solid #FCA5A5',
              color: '#B91C1C',
            }}
          >
            <p className="text-[13px]">
              Servidor do WhatsApp offline. Verifique o container{' '}
              <code>wa-server</code> na VPS — pode estar reiniciando ou desconectado.
            </p>
          </div>
        ) : !data ? (
          <p className="text-[13px]" style={{ color: T.textMuted }}>
            Carregando métricas…
          </p>
        ) : (
          <>
            {/* hero card: não respondidas */}
            <div
              onClick={() => router.push('/admin/inbox?filter=unanswered')}
              className="rounded-2xl p-7 mb-3 cursor-pointer transition-transform hover:-translate-y-0.5"
              style={{
                background: '#FFFFFF',
                border: '1px solid #FCA5A5',
                boxShadow: '0 4px 16px rgba(239,68,68,0.06)',
              }}
            >
              <div className="flex items-start justify-between gap-6 flex-wrap">
                <div>
                  <p
                    className="text-[10px] font-bold uppercase tracking-[0.18em] mb-3 flex items-center gap-1.5"
                    style={{ color: '#DC2626' }}
                  >
                    <AlertCircle size={12} />
                    Aguardando sua resposta
                  </p>
                  <p
                    className="font-bold leading-none"
                    style={{
                      color: '#DC2626',
                      fontSize: 'clamp(3rem, 7vw, 4.5rem)',
                    }}
                  >
                    {data.unanswered}
                  </p>
                  <p
                    className="text-[12px] mt-3"
                    style={{ color: T.textMuted }}
                  >
                    {data.unanswered === 1
                      ? 'conversa esperando sua resposta'
                      : 'conversas esperando sua resposta'}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className="text-[10px] font-bold uppercase tracking-[0.14em] mb-2"
                    style={{ color: T.textDim }}
                  >
                    Maior espera
                  </p>
                  <p
                    className="font-bold leading-none"
                    style={{
                      color: '#DC2626',
                      fontSize: 'clamp(1.6rem, 3vw, 2.2rem)',
                    }}
                  >
                    {fmtWait(data.longestWaitH)}
                  </p>
                </div>
              </div>
              <div
                className="mt-5 inline-flex items-center gap-2 text-[12px] font-bold"
                style={{ color: T.accent }}
              >
                Abrir essas conversas
                <ArrowRight size={13} />
              </div>
            </div>

            {/* main grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <MetricCard
                label="Conversas"
                value={data.totalChats}
                icon={<MessageSquare size={15} />}
              />
              <MetricCard
                label="Conversas ativas"
                value={data.activeChats}
                icon={<Activity size={15} />}
                sub={periodSub}
              />
              <MetricCard
                label="Recebidas"
                value={data.received}
                icon={<Inbox size={15} />}
                accent="#3B82F6"
                sub={periodSub}
              />
              <MetricCard
                label="Enviadas"
                value={data.sent}
                icon={<Send size={15} />}
                accent="#22C55E"
                sub={periodSub}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <MetricCard
                label="Tempo médio de resposta"
                value={fmtResponse(data.avgResponseMin)}
                icon={<Clock size={15} />}
                sub={`quanto seus clientes esperaram ${periodSub}`}
              />
              <MetricCard
                label="Volume"
                value={`${data.received + data.sent}`}
                icon={<Timer size={15} />}
                sub={`total de mensagens (${periodSub})`}
              />
            </div>

            {/* sparkline: mensagens por dia (ou hora se period=today) */}
            {series.length > 0 && (
              <div
                className="rounded-2xl p-5 mt-3"
                style={{ background: T.card, border: `1px solid ${T.border}` }}
              >
                <div className="flex items-center justify-between mb-4">
                  <span
                    className="text-[10px] font-bold uppercase tracking-[0.14em]"
                    style={{ color: T.textDim }}
                  >
                    Volume {period === 'today' ? 'por hora' : 'por dia'}
                  </span>
                  <div className="flex items-center gap-3 text-[10px]" style={{ color: T.textMuted }}>
                    <span className="flex items-center gap-1">
                      <span className="inline-block w-2 h-2 rounded-full" style={{ background: '#3B82F6' }} />
                      Recebidas
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="inline-block w-2 h-2 rounded-full" style={{ background: '#22C55E' }} />
                      Enviadas
                    </span>
                  </div>
                </div>
                <Sparkline series={series} />
              </div>
            )}

            {/* ── Relatório de propostas ── */}
            {(() => {
              if (proposals.length === 0) return null
              // distribuições
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
                <div className="mt-6">
                  <div className="flex items-end justify-between mb-3">
                    <h2
                      className="leading-tight"
                      style={{
                        fontFamily: '"ivypresto-display", Georgia, serif',
                        fontStyle: 'italic',
                        fontWeight: 300,
                        fontSize: '1.6rem',
                        color: T.textPrimary,
                      }}
                    >
                      Propostas
                    </h2>
                    <p className="text-[11px]" style={{ color: T.textMuted }}>
                      Histórico completo · {proposals.length} proposta{proposals.length !== 1 ? 's' : ''}
                    </p>
                  </div>

                  {/* duas pizzas + cards de valor */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    {/* por tipo */}
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

                    {/* por status */}
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

                  {/* valores */}
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
                </div>
              )
            })()}

            <p
              className="text-[11px] mt-6 leading-relaxed"
              style={{ color: T.textDim }}
            >
              &quot;Conversas ativas&quot;, &quot;mensagens&quot; e &quot;tempo de
              resposta&quot; contam o período selecionado. &quot;Não respondidas&quot;
              e &quot;maior espera&quot; são o estado atual. As pizzas de propostas
              consideram todo o histórico.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
