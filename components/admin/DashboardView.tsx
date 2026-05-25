'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { waServer, WaDashboard } from '@/lib/waServer'
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

/* ── main ────────────────────────────────────────────── */

export default function DashboardView() {
  const router = useRouter()
  const [period, setPeriod] = useState<string>('week')
  const [data, setData] = useState<WaDashboard | null>(null)
  const [serverOff, setServerOff] = useState(false)

  useEffect(() => {
    let alive = true
    async function load() {
      try {
        const d = await waServer.dashboard(period)
        if (alive) {
          setData(d)
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
    <div className="flex-1 min-h-0 overflow-y-auto">
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
              Servidor do WhatsApp offline. Rode <code>npm start</code> na pasta{' '}
              <code>wa-server</code>.
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
