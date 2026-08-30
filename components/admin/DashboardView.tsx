'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { waServer, WaDashboard, WaSeriesPoint } from '@/lib/waServer'
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


/* ── main ────────────────────────────────────────────── */

export default function DashboardView() {
  const router = useRouter()
  const [period, setPeriod] = useState<string>('week')
  const [data, setData] = useState<WaDashboard | null>(null)
  const [unansweredFixed, setUnansweredFixed] = useState<number | null>(null)
  const [series, setSeries] = useState<WaSeriesPoint[]>([])
  const [serverOff, setServerOff] = useState(false)

  useEffect(() => {
    let alive = true
    let iv: ReturnType<typeof setInterval> | null = null
    async function load() {
      if (document.hidden) return // não puxa em background
      try {
        const [d, s, cs] = await Promise.all([
          waServer.dashboard(period),
          waServer.dashboardSeries(period),
          waServer.chats(),
        ])
        if (alive) {
          setData(d)
          setSeries(s.series || [])
          // 'sem resposta' correto: mesma regra do inbox (fora grupos,
          // arquivadas e ignoradas; última mensagem não é minha) no período.
          const now = Date.now() / 1000
          const since =
            period === 'today'
              ? new Date().setHours(0, 0, 0, 0) / 1000
              : period === 'week'
              ? now - 7 * 86400
              : period === 'month'
              ? now - 30 * 86400
              : 0
          setUnansweredFixed(
            cs.filter(
              (c) =>
                !c.isGroup &&
                !c.archived &&
                !c.ignored &&
                !c.fromMeLast &&
                !(c.tags || []).includes('pessoal') &&
                c.lastTime >= since
            ).length
          )
          setServerOff(false)
        }
      } catch {
        if (alive) setServerOff(true)
      }
    }
    function start() {
      if (iv != null) return
      load()
      iv = setInterval(load, 10000)
    }
    function stop() {
      if (iv == null) return
      clearInterval(iv); iv = null
    }
    function onVis() {
      if (document.hidden) stop()
      else start()
    }
    start()
    document.addEventListener('visibilitychange', onVis)
    return () => {
      alive = false
      stop()
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [period])

  const periodSub = PERIOD_SUB[period] || ''

  return (
    <div className="flex-1 min-h-0 overflow-y-auto thin-scroll">
      <div className="max-w-6xl mx-auto px-4 sm:px-8 pt-10 pb-20">
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
                    {unansweredFixed ?? data.unanswered}
                  </p>
                  <p
                    className="text-[12px] mt-3"
                    style={{ color: T.textMuted }}
                  >
                    {(unansweredFixed ?? data.unanswered) === 1
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

            <p
              className="text-[11px] mt-6 leading-relaxed"
              style={{ color: T.textDim }}
            >
              &quot;Conversas ativas&quot;, &quot;mensagens&quot; e &quot;tempo de
              resposta&quot; contam o período selecionado. &quot;Não respondidas&quot;
              e &quot;maior espera&quot; são o estado atual.
            </p>
          </>
        )}
      </div>
    </div>
  )
}

