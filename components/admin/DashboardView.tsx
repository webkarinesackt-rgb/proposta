'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { waServer, WaDashboard } from '@/lib/waServer'
import {
  ArrowLeft,
  Inbox,
  MessageSquare,
  AlertCircle,
  Send,
  Clock,
  Timer,
  Activity,
} from 'lucide-react'

const PERIODS = [
  { id: 'today', label: 'Hoje' },
  { id: 'week', label: 'Semana' },
  { id: 'month', label: 'Mês' },
  { id: 'all', label: 'Tudo' },
] as const

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

function Card({
  label,
  value,
  icon,
  accent,
  onClick,
}: {
  label: string
  value: string | number
  icon: React.ReactNode
  accent?: boolean
  onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      className="rounded-2xl p-5 flex flex-col gap-3 transition-all"
      style={{
        background: '#FFFFFF',
        border: `1px solid ${accent ? '#E6C6C6' : '#E6E6E1'}`,
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8AA09A]">
          {label}
        </span>
        <span style={{ color: accent ? '#C9554D' : '#8AA09A' }}>{icon}</span>
      </div>
      <span
        className="text-[2.2rem] font-bold leading-none tracking-tight"
        style={{ color: accent ? '#C9554D' : '#162322' }}
      >
        {value}
      </span>
    </div>
  )
}

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

  return (
    <div
      className="min-h-screen"
      style={{ background: '#ECEAE3', fontFamily: 'var(--font-inter)' }}
    >
      {/* top bar */}
      <div style={{ borderBottom: '1px solid #DFE0DB' }}>
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <button
            onClick={() => router.push('/admin')}
            className="flex items-center gap-1.5 text-[11px] font-semibold text-[#8AA09A] hover:text-[#0D3839] transition-colors"
          >
            <ArrowLeft size={13} /> Painel
          </button>
          <button
            onClick={() => router.push('/admin/inbox')}
            className="flex items-center gap-1.5 text-[11px] font-semibold text-[#8AA09A] hover:text-[#0D3839] transition-colors"
          >
            <Inbox size={13} /> Inbox
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 pt-10 pb-20">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#A8B5B0] mb-2">
          DASHBOARD · WHATSAPP
        </p>
        <h1 className="text-[2rem] font-bold text-[#162322] tracking-tight mb-6">
          Métricas
        </h1>

        {/* period tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className="text-[11px] font-bold px-4 py-2 rounded-full transition-all"
              style={{
                background: period === p.id ? '#0D3839' : '#FFFFFF',
                color: period === p.id ? '#F4F99D' : '#8AA09A',
                border: `1px solid ${period === p.id ? '#0D3839' : '#E6E6E1'}`,
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {serverOff ? (
          <div
            className="rounded-2xl p-12 text-center"
            style={{ background: '#FFFFFF', border: '1px solid #E6E6E1' }}
          >
            <p className="text-[13px] text-[#A33]">
              Servidor do WhatsApp offline. Rode <code>npm start</code> na pasta{' '}
              <code>wa-server</code>.
            </p>
          </div>
        ) : !data ? (
          <p className="text-[13px] text-[#A8B5B0]">Carregando métricas…</p>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Card
                label="Conversas"
                value={data.totalChats}
                icon={<MessageSquare size={15} />}
              />
              <Card
                label="Não respondidas"
                value={data.unanswered}
                icon={<AlertCircle size={15} />}
                accent
                onClick={() => router.push('/admin/inbox?filter=unanswered')}
              />
              <Card
                label="Conversas ativas"
                value={data.activeChats}
                icon={<Activity size={15} />}
              />
              <Card
                label="Mensagens recebidas"
                value={data.received}
                icon={<Inbox size={15} />}
              />
              <Card
                label="Mensagens enviadas"
                value={data.sent}
                icon={<Send size={15} />}
              />
              <Card
                label="Tempo de resposta"
                value={fmtResponse(data.avgResponseMin)}
                icon={<Clock size={15} />}
              />
              <Card
                label="Maior espera"
                value={fmtWait(data.longestWaitH)}
                icon={<Timer size={15} />}
                accent
              />
            </div>
            <p className="text-[11px] text-[#A8B5B0] mt-4 leading-relaxed">
              &quot;Conversas ativas&quot; e &quot;mensagens&quot; contam o período
              selecionado. &quot;Não respondidas&quot; e &quot;maior espera&quot; são o
              estado atual. Clique em &quot;Não respondidas&quot; para abrir essas
              conversas no inbox.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
