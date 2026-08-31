'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { waServer, WaDashboard, WaSeriesPoint } from '@/lib/waServer'
import { proposalStore } from '@/lib/proposalStore'
import { taskStore, Task, TaskTableMissingError } from '@/lib/taskStore'
import {
  Inbox,
  MessageSquare,
  Send,
  Clock,
  Timer,
  Activity,
  ArrowUpRight,
  Plus,
  Trash2,
  ListChecks,
} from 'lucide-react'

/* ── tokens ──────────────────────────────────────────── */

const T = {
  textPrimary: '#141414',
  textMuted: '#6E6E6E',
  textDim: '#9B9B9B',
  border: '#E8E8E5',
  card: '#FFFFFF',
  bgSubtle: '#F2F2F0',
  accent: '#141414',
  accentBright: '#D6F23C',
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

/* ── card (usado em toda a página — número sempre no mesmo estilo) ── */

function OverviewCard({
  icon,
  label,
  value,
  sub,
  onClick,
  urgent,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  sub?: string
  onClick?: () => void
  urgent?: boolean
}) {
  const ink = '#141414'
  return (
    <div
      onClick={onClick}
      className="relative rounded-2xl p-5 transition-all"
      style={{
        background: urgent ? T.accentBright : T.card,
        border: urgent ? 'none' : `1px solid ${T.border}`,
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <span
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: urgent ? 'rgba(20,20,20,0.1)' : T.bgSubtle, color: ink }}
        >
          {icon}
        </span>
        <span
          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: urgent ? '#FFFFFF' : T.bgSubtle, color: ink }}
        >
          <ArrowUpRight size={13} />
        </span>
      </div>
      <p
        className="leading-none font-bold tabular-nums"
        style={{
          letterSpacing: '-0.03em',
          color: ink,
          fontSize: 'clamp(1.875rem, 3.4vw, 2.5rem)',
        }}
      >
        {value}
      </p>
      <p className="text-[11px] font-bold uppercase tracking-wider mt-2.5" style={{ color: ink, opacity: urgent ? 0.75 : 1 }}>
        {label}
      </p>
      {sub && (
        <p className="text-[11px] mt-1" style={{ color: urgent ? 'rgba(20,20,20,0.62)' : T.textDim }}>
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
      {/* received: linha cheia */}
      <path d={area('received')} fill="#162322" fillOpacity={0.05} />
      <path d={path('received')} fill="none" stroke="#162322" strokeWidth={1.5} strokeLinejoin="round" />
      {/* sent: linha tracejada, mesma tinta — diferencia sem precisar de 2ª cor */}
      <path
        d={path('sent')}
        fill="none"
        stroke="#162322"
        strokeOpacity={0.45}
        strokeWidth={1.5}
        strokeDasharray="5 4"
        strokeLinejoin="round"
      />
    </svg>
  )
}


/* ── tarefas/lembretes ───────────────────────────────── */

const TASK_OWNERS = ['Karine', 'Tainá']

function dueTone(dueDate: string): { label: string; color: string; bg: string } | null {
  if (!dueDate) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const d = new Date(dueDate + 'T00:00:00')
  const diffDays = Math.round((d.getTime() - today.getTime()) / 86400_000)
  if (diffDays < 0) return { label: `atrasada ${Math.abs(diffDays)}d`, color: '#B45309', bg: 'rgba(180,83,9,0.1)' }
  if (diffDays === 0) return { label: 'hoje', color: '#B45309', bg: 'rgba(180,83,9,0.1)' }
  if (diffDays === 1) return { label: 'amanhã', color: T.textMuted, bg: T.bgSubtle }
  return { label: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), color: T.textMuted, bg: T.bgSubtle }
}

function TasksPanel() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [needsSetup, setNeedsSetup] = useState(false)
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [owner, setOwner] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const t = await taskStore.getAll()
        setTasks(t)
        setNeedsSetup(false)
      } catch (e) {
        if (e instanceof TaskTableMissingError) setNeedsSetup(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function addTask() {
    const t = title.trim()
    if (!t) return
    setTitle('')
    try {
      const created = await taskStore.create({ title: t, due_date: dueDate, owner })
      setTasks((ts) => [created, ...ts])
      setDueDate('')
    } catch (e) {
      console.error('[tasks.create]', e)
      setTitle(t)
    }
  }

  async function toggleDone(id: string) {
    setTasks((ts) => ts.filter((x) => x.id !== id))
    try {
      await taskStore.update(id, { done: true })
    } catch (e) {
      console.error('[tasks.done]', e)
    }
  }

  async function removeTask(id: string) {
    setTasks((ts) => ts.filter((x) => x.id !== id))
    try {
      await taskStore.remove(id)
    } catch (e) {
      console.error('[tasks.remove]', e)
    }
  }

  const open = useMemo(() => tasks.filter((t) => !t.done), [tasks])

  // sem aviso de setup aqui na Visão geral — se a tabela ainda não existe,
  // o painel simplesmente não aparece (fica limpo até ela rodar o SQL).
  if (needsSetup) return null

  return (
    <div className="rounded-2xl p-5 mb-5" style={{ background: T.card, border: `1px solid ${T.border}` }}>
      <div className="flex items-center justify-between mb-3">
        <p
          className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider"
          style={{ color: T.textDim }}
        >
          <ListChecks size={13} />
          Suas tarefas
        </p>
        {open.length > 0 && (
          <span className="text-[11px]" style={{ color: T.textMuted }}>{open.length} em aberto</span>
        )}
      </div>

      <div className="flex gap-2 flex-wrap mb-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addTask()}
          placeholder="Nova tarefa — ex: Ligar pra Fulana sobre o contrato"
          className="flex-1 min-w-[200px] text-[13px] px-3 py-2 rounded-lg outline-none"
          style={{ background: T.bgSubtle, border: `1px solid ${T.border}`, color: T.textPrimary }}
        />
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="text-[12px] px-2 py-2 rounded-lg outline-none"
          style={{ background: T.bgSubtle, border: `1px solid ${T.border}`, color: T.textPrimary }}
        />
        <select
          value={owner}
          onChange={(e) => setOwner(e.target.value)}
          className="text-[12px] px-2 py-2 rounded-lg outline-none"
          style={{ background: T.bgSubtle, border: `1px solid ${T.border}`, color: T.textPrimary }}
        >
          <option value="">Quem</option>
          {TASK_OWNERS.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <button
          onClick={addTask}
          className="flex items-center gap-1 text-[12px] font-bold px-3 py-2 rounded-lg"
          style={{ background: T.accent, color: T.accentBright }}
        >
          <Plus size={14} />
          Adicionar
        </button>
      </div>

      {loading ? (
        <p className="text-[12px]" style={{ color: T.textDim }}>Carregando…</p>
      ) : open.length === 0 ? (
        <p className="text-[12px]" style={{ color: T.textDim }}>Nenhuma tarefa em aberto. 🎉</p>
      ) : (
        <div className="flex flex-col">
          {open.map((t, i) => {
            const tone = dueTone(t.due_date)
            return (
              <div
                key={t.id}
                className="flex items-center gap-3 py-2.5 group"
                style={{ borderTop: i > 0 ? `1px solid ${T.border}` : 'none' }}
              >
                <input
                  type="checkbox"
                  onChange={() => toggleDone(t.id)}
                  className="w-4 h-4 flex-shrink-0 cursor-pointer"
                  style={{ accentColor: T.accent }}
                />
                <span className="flex-1 min-w-0 truncate text-[13px]" style={{ color: T.textPrimary }}>
                  {t.title}
                </span>
                {t.owner && (
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                    style={{ background: T.bgSubtle, color: T.textMuted }}
                  >
                    {t.owner}
                  </span>
                )}
                {tone && (
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{ color: tone.color, background: tone.bg }}
                  >
                    {tone.label}
                  </span>
                )}
                <button
                  onClick={() => removeTask(t.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                  style={{ color: T.textDim }}
                  title="Excluir"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
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
  const [followupsDue, setFollowupsDue] = useState(0)
  const [monthStats, setMonthStats] = useState({ enviadas: 0, aceitas: 0, expiring: 0 })

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
          // follow-ups pra fazer: próxima ação marcada pra hoje ou atrasada
          const endToday = new Date()
          endToday.setHours(23, 59, 59, 999)
          const endTodayS = endToday.getTime() / 1000
          setFollowupsDue(
            cs.filter(
              (c) => c.nextAction && (c.nextActionDate || 0) > 0 && (c.nextActionDate || 0) <= endTodayS
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

  // propostas do mês (enviadas por criação; aceitas pela data do aceite) +
  // propostas vencendo nos próximos 7 dias
  useEffect(() => {
    proposalStore
      .getAll()
      .then((ps) => {
        const now = new Date()
        const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
        const weekEnd = Date.now() + 7 * 86400 * 1000
        let enviadas = 0,
          aceitas = 0,
          expiring = 0
        for (const p of ps) {
          if (p.status !== 'draft' && (p.created_at || '').slice(0, 7) === ym) enviadas++
          if (p.status === 'accepted' && (p.updated_at || p.created_at || '').slice(0, 7) === ym)
            aceitas++
          if ((p.status === 'sent' || p.status === 'viewed') && p.valid_until) {
            const vu = new Date(p.valid_until).getTime()
            if (vu >= Date.now() && vu <= weekEnd) expiring++
          }
        }
        setMonthStats({ enviadas, aceitas, expiring })
      })
      .catch(() => {})
  }, [])

  const periodSub = PERIOD_SUB[period] || ''

  return (
    <div className="flex-1 min-h-0 overflow-y-auto thin-scroll">
      <div className="max-w-6xl mx-auto px-4 sm:px-8 pt-8 pb-20">
        <h1
          className="leading-none mb-2"
          style={{
            fontFamily: 'var(--font-inter), Inter, sans-serif',
            fontStyle: 'normal',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            fontSize: 'clamp(1.75rem, 4vw, 2.4rem)',
            color: T.textPrimary,
          }}
        >
          Visão geral
        </h1>
        <p className="text-[13px] mb-5" style={{ color: T.textMuted }}>
          Tudo que precisa da sua atenção agora.
        </p>

        {/* ações rápidas */}
        <div className="flex gap-2 mb-5 flex-wrap">
          <button
            onClick={() => router.push('/admin/new')}
            className="text-[12px] font-bold px-4 py-2.5 rounded-lg transition-opacity hover:opacity-90"
            style={{ background: T.accent, color: T.accentBright }}
          >
            + Nova proposta
          </button>
          <button
            onClick={() => router.push('/admin?rapida=1')}
            className="text-[12px] font-bold px-4 py-2.5 rounded-lg transition-colors"
            style={{ background: T.card, color: T.textPrimary, border: `1px solid ${T.border}` }}
          >
            Proposta rápida
          </button>
        </div>

        {/* visão geral: aguardando resposta (destaque) + enviadas + pra fazer */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
          <OverviewCard
            icon={<MessageSquare size={15} />}
            label="Aguardando resposta"
            value={unansweredFixed ?? 0}
            sub={
              data
                ? `conversas esperando você · espera máx. ${fmtWait(data.longestWaitH)}`
                : 'conversas esperando você'
            }
            onClick={() => router.push('/admin/inbox?filter=unanswered')}
            urgent={(unansweredFixed ?? 0) > 0}
          />
          <OverviewCard
            icon={<Send size={15} />}
            label="Propostas enviadas"
            value={monthStats.enviadas}
            sub={
              monthStats.enviadas > 0
                ? `${monthStats.aceitas} aceitas · ${Math.round((monthStats.aceitas / monthStats.enviadas) * 100)}% de conversão`
                : 'nenhuma este mês'
            }
            onClick={() => router.push('/admin')}
          />
          <OverviewCard
            icon={<Clock size={15} />}
            label="Pra fazer"
            value={followupsDue}
            sub={
              monthStats.expiring > 0
                ? `follow-ups pra hoje · +${monthStats.expiring} proposta${monthStats.expiring > 1 ? 's' : ''} vencendo`
                : 'follow-ups pra hoje/atrasados'
            }
            onClick={() => router.push('/admin/leads')}
          />
        </div>

        {/* tarefas/lembretes — não renderiza nada se a tabela não existir */}
        <TasksPanel />

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
            {/* main grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <OverviewCard
                label="Conversas"
                value={data.totalChats}
                icon={<MessageSquare size={15} />}
              />
              <OverviewCard
                label="Conversas ativas"
                value={data.activeChats}
                icon={<Activity size={15} />}
                sub={periodSub}
              />
              <OverviewCard
                label="Recebidas"
                value={data.received}
                icon={<Inbox size={15} />}
                sub={periodSub}
              />
              <OverviewCard
                label="Enviadas"
                value={data.sent}
                icon={<Send size={15} />}
                sub={periodSub}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <OverviewCard
                label="Tempo médio de resposta"
                value={fmtResponse(data.avgResponseMin)}
                icon={<Clock size={15} />}
                sub={`quanto seus clientes esperaram ${periodSub}`}
              />
              <OverviewCard
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
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block w-3 h-[1.5px]" style={{ background: '#162322' }} />
                      Recebidas
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span
                        className="inline-block w-3 h-[1.5px]"
                        style={{
                          backgroundImage: 'repeating-linear-gradient(90deg, #162322 0 3px, transparent 3px 5px)',
                          opacity: 0.55,
                        }}
                      />
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

