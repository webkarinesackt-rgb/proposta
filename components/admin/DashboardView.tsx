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

/* ── card de métrica ─────────────────────────────────── */

function MetricCard({
  label,
  value,
  icon,
  sub,
  accent = '#E6F1EE',
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
        background:
          'linear-gradient(165deg, rgba(15,57,58,0.7) 0%, rgba(7,31,32,0.9) 100%)',
        border: '1px solid rgba(139,183,175,0.12)',
        cursor: onClick ? 'pointer' : 'default',
        boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <span
          className="text-[10px] font-bold uppercase tracking-[0.14em]"
          style={{ color: '#8BB7AF' }}
        >
          {label}
        </span>
        <span style={{ color: 'rgba(139,183,175,0.45)' }}>{icon}</span>
      </div>
      <p
        className="font-bold leading-none tracking-tight"
        style={{
          color: accent,
          fontSize: 'clamp(2rem, 4vw, 2.6rem)',
        }}
      >
        {value}
      </p>
      {sub && (
        <p className="text-[11px] mt-2" style={{ color: 'rgba(139,183,175,0.7)' }}>
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
      <div className="max-w-6xl mx-auto px-6 pt-12 pb-20">
        <p
          className="text-[10px] font-bold uppercase tracking-[0.2em] mb-3"
          style={{ color: '#6BA89E' }}
        >
          DASHBOARD · WHATSAPP
        </p>
        <h1
          className="leading-none tracking-tight mb-2"
          style={{
            fontFamily: '"ivypresto-display", Georgia, serif',
            fontStyle: 'italic',
            fontWeight: 300,
            fontSize: 'clamp(2.4rem, 5vw, 3.2rem)',
            color: '#E6F1EE',
          }}
        >
          Métricas
        </h1>
        <p className="text-[13px] mb-8" style={{ color: 'rgba(139,183,175,0.65)' }}>
          Termômetro do seu atendimento no WhatsApp.
        </p>

        {/* period pills */}
        <div className="flex gap-2 mb-8 flex-wrap">
          {PERIODS.map((p) => {
            const active = period === p.id
            return (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className="text-[11px] font-bold px-4 py-2 rounded-full transition-all"
                style={{
                  background: active ? '#F4F99D' : 'rgba(139,183,175,0.08)',
                  color: active ? '#0D3839' : '#8BB7AF',
                  border: `1px solid ${
                    active ? '#F4F99D' : 'rgba(139,183,175,0.18)'
                  }`,
                  letterSpacing: '0.04em',
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
              background: 'rgba(229,115,115,0.08)',
              border: '1px solid rgba(229,115,115,0.25)',
              color: '#FFC7BD',
            }}
          >
            <p className="text-[13px]">
              Servidor do WhatsApp offline. Rode <code>npm start</code> na pasta{' '}
              <code>wa-server</code>.
            </p>
          </div>
        ) : !data ? (
          <p className="text-[13px]" style={{ color: 'rgba(139,183,175,0.7)' }}>
            Carregando métricas…
          </p>
        ) : (
          <>
            {/* hero card: não respondidas + maior espera */}
            <div
              onClick={() => router.push('/admin/inbox?filter=unanswered')}
              className="relative overflow-hidden rounded-3xl p-7 mb-3 cursor-pointer transition-transform hover:-translate-y-0.5"
              style={{
                background:
                  'radial-gradient(ellipse at 100% 0%, rgba(229,115,115,0.16) 0%, transparent 60%), linear-gradient(160deg, rgba(82,28,28,0.55) 0%, rgba(40,12,12,0.7) 100%)',
                border: '1px solid rgba(229,115,115,0.30)',
                boxShadow: '0 12px 36px rgba(229,115,115,0.10)',
              }}
            >
              <div className="flex items-start justify-between gap-6 flex-wrap">
                <div>
                  <p
                    className="text-[10px] font-bold uppercase tracking-[0.18em] mb-3 flex items-center gap-1.5"
                    style={{ color: '#FFC7BD' }}
                  >
                    <AlertCircle size={12} />
                    Aguardando sua resposta
                  </p>
                  <p
                    className="font-bold leading-none"
                    style={{
                      color: '#FFD7CD',
                      fontSize: 'clamp(3.5rem, 8vw, 5rem)',
                    }}
                  >
                    {data.unanswered}
                  </p>
                  <p
                    className="text-[12px] mt-3"
                    style={{ color: 'rgba(255,199,189,0.7)' }}
                  >
                    {data.unanswered === 1
                      ? 'conversa esperando sua resposta'
                      : 'conversas esperando sua resposta'}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className="text-[10px] font-bold uppercase tracking-[0.14em] mb-2"
                    style={{ color: 'rgba(255,199,189,0.65)' }}
                  >
                    Maior espera
                  </p>
                  <p
                    className="font-bold leading-none"
                    style={{
                      color: '#E57373',
                      fontSize: 'clamp(1.8rem, 3.5vw, 2.4rem)',
                    }}
                  >
                    {fmtWait(data.longestWaitH)}
                  </p>
                </div>
              </div>
              <div
                className="mt-6 inline-flex items-center gap-2 text-[12px] font-bold"
                style={{ color: '#F4F99D' }}
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
                accent="#E6F1EE"
              />
              <MetricCard
                label="Conversas ativas"
                value={data.activeChats}
                icon={<Activity size={15} />}
                accent="#E6F1EE"
                sub={periodSub}
              />
              <MetricCard
                label="Mensagens recebidas"
                value={data.received}
                icon={<Inbox size={15} />}
                accent="#8BB7AF"
                sub={periodSub}
              />
              <MetricCard
                label="Mensagens enviadas"
                value={data.sent}
                icon={<Send size={15} />}
                accent="#F4F99D"
                sub={periodSub}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <MetricCard
                label="Tempo médio de resposta"
                value={fmtResponse(data.avgResponseMin)}
                icon={<Clock size={15} />}
                accent="#8BB7AF"
                sub={`quanto seus clientes esperaram ${periodSub}`}
              />
              <MetricCard
                label="Volume"
                value={`${data.received + data.sent}`}
                icon={<Timer size={15} />}
                accent="#E6F1EE"
                sub={`total de mensagens (${periodSub})`}
              />
            </div>

            <p
              className="text-[11px] mt-6 leading-relaxed"
              style={{ color: 'rgba(139,183,175,0.55)' }}
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
