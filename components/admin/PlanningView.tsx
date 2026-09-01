'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, Trash2, Check, Target } from 'lucide-react'
import {
  planningStore,
  PlanningEntry,
  PlanningTableMissingError,
} from '@/lib/planningStore'
import { proposalStore } from '@/lib/proposalStore'
import { Proposal } from '@/lib/types'
import { useToast } from '@/lib/useToast'

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]
function ym(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
function monthLabel(m: string) {
  const [y, mo] = m.split('-').map(Number)
  return `${MONTH_NAMES[(mo || 1) - 1]} ${y}`
}
function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}
function planPrice(p: Proposal) {
  const plan = p.selected_plans?.find((x) => x.is_recommended) || p.selected_plans?.[0]
  return plan?.price_cash || 0
}

const METAS = [
  { key: 'faturamento', label: 'Faturamento', money: true },
  { key: 'fechamentos', label: 'Fechamentos', money: false },
  { key: 'propostas', label: 'Propostas enviadas', money: false },
] as const

const CONTEUDO_STATUS = ['ideia', 'produzindo', 'publicado'] as const
const CONTEUDO_META: Record<string, { label: string; bg: string; color: string }> = {
  ideia: { label: 'Ideia', bg: '#EDEDEA', color: '#6E6E6E' },
  produzindo: { label: 'Produzindo', bg: '#FDECD3', color: '#B45309' },
  publicado: { label: 'Publicado', bg: '#DCF3E4', color: '#137A3F' },
}

export default function PlanningView() {
  const [month, setMonth] = useState<string>(() => ym(new Date()))
  const [entries, setEntries] = useState<PlanningEntry[]>([])
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(true)
  const [needsSetup, setNeedsSetup] = useState(false)
  const [newAcao, setNewAcao] = useState('')
  const [newConteudo, setNewConteudo] = useState('')
  const { show: showToast, Toast } = useToast()

  useEffect(() => {
    proposalStore.getAll().then(setProposals).catch(() => {})
  }, [])

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month])

  async function load() {
    setLoading(true)
    try {
      setEntries(await planningStore.getMonth(month))
      setNeedsSetup(false)
    } catch (e) {
      if (e instanceof PlanningTableMissingError) setNeedsSetup(true)
    } finally {
      setLoading(false)
    }
  }

  // realizado do mês (a partir das propostas)
  const realizado = useMemo(() => {
    let faturamento = 0, fechamentos = 0, propostas = 0
    for (const p of proposals) {
      const createdM = (p.created_at || '').slice(0, 7)
      const acceptM = (p.updated_at || p.created_at || '').slice(0, 7)
      if (p.status !== 'draft' && createdM === month) propostas++
      if (p.status === 'accepted' && acceptM === month) {
        fechamentos++
        faturamento += planPrice(p)
      }
    }
    return { faturamento, fechamentos, propostas } as Record<string, number>
  }, [proposals, month])

  function metaEntry(key: string) {
    return entries.find((e) => e.kind === 'meta' && e.title === key)
  }
  async function saveMeta(key: string, target: number) {
    const existing = metaEntry(key)
    if (existing) {
      setEntries((es) => es.map((e) => (e.id === existing.id ? { ...e, target } : e)))
      try { await planningStore.update(existing.id, { target }) } catch {}
    } else {
      try {
        const created = await planningStore.create({ month, kind: 'meta', title: key, target })
        setEntries((es) => [...es, created])
      } catch (e) {
        if (e instanceof PlanningTableMissingError) setNeedsSetup(true)
      }
    }
  }

  async function addItem(kind: 'acao' | 'conteudo', title: string) {
    const t = title.trim()
    if (!t) return
    try {
      const created = await planningStore.create({
        month, kind, title: t, status: kind === 'conteudo' ? 'ideia' : '',
      })
      setEntries((es) => [...es, created])
    } catch (e) {
      if (e instanceof PlanningTableMissingError) setNeedsSetup(true)
      else showToast('Erro ao adicionar', { kind: 'error' })
    }
  }
  async function patchItem(id: string, patch: Partial<PlanningEntry>) {
    setEntries((es) => es.map((e) => (e.id === id ? { ...e, ...patch } : e)))
    try { await planningStore.update(id, patch) } catch {}
  }
  async function removeItem(id: string) {
    setEntries((es) => es.filter((e) => e.id !== id))
    try { await planningStore.remove(id) } catch {}
  }

  const acoes = entries.filter((e) => e.kind === 'acao')
  const conteudos = entries.filter((e) => e.kind === 'conteudo')

  function shiftMonth(delta: number) {
    const [y, m] = month.split('-').map(Number)
    setMonth(ym(new Date(y, m - 1 + delta, 1)))
  }

  return (
    <div className="flex flex-col h-full" style={{ background: '#EDEDEA' }}>
      <Toast />
      <div className="px-5 md:px-8 pt-6 pb-3">
        <h1 className="text-[22px] md:text-[26px] font-bold" style={{ color: '#141414', fontFamily: 'var(--font-inter), Inter, sans-serif' }}>
          Planejamento
        </h1>
        <p className="text-[12px] mt-0.5" style={{ color: '#9B9B9B' }}>
          Metas, ações e criação de conteúdo — mês a mês.
        </p>
        {/* seletor de mês */}
        <div className="flex items-center gap-2 mt-4">
          <button onClick={() => shiftMonth(-1)} className="p-2 rounded-lg" style={{ background: '#FFFFFF', border: '1px solid #E6E6E1', color: '#141414' }}>
            <ChevronLeft size={16} />
          </button>
          <span className="text-[14px] font-bold px-4 py-2 rounded-lg" style={{ background: '#141414', color: '#D6F23C', minWidth: 160, textAlign: 'center' }}>
            {monthLabel(month)}
          </span>
          <button onClick={() => shiftMonth(1)} className="p-2 rounded-lg" style={{ background: '#FFFFFF', border: '1px solid #E6E6E1', color: '#141414' }}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto px-5 md:px-8 pb-8">
        {needsSetup ? (
          <SetupBanner onRetry={load} />
        ) : loading ? (
          <p className="text-[13px] text-center py-16" style={{ color: '#A8B5B0' }}>Carregando…</p>
        ) : (
          <div className="max-w-5xl flex flex-col gap-6">
            {/* METAS */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: '#9B9B9B' }}>
                <Target size={13} /> Metas do mês
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {METAS.map((m) => {
                  const target = metaEntry(m.key)?.target || 0
                  const done = realizado[m.key] || 0
                  const pct = target > 0 ? Math.min(100, Math.round((done / target) * 100)) : 0
                  return (
                    <div key={m.key} className="rounded-2xl p-4" style={{ background: '#FFFFFF', border: '1px solid #E6E6E1' }}>
                      <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#9B9B9B' }}>{m.label}</p>
                      <div className="flex items-end justify-between gap-2 mt-1">
                        <p className="text-[22px] font-bold leading-none" style={{ color: '#141414' }}>
                          {m.money ? fmtBRL(done) : done}
                        </p>
                        <div className="flex items-center gap-1 text-[11px]" style={{ color: '#9B9B9B' }}>
                          <span>meta:</span>
                          <input
                            type="number"
                            defaultValue={target || ''}
                            onBlur={(e) => {
                              const v = Math.max(0, Number(e.target.value) || 0)
                              if (v !== target) saveMeta(m.key, v)
                            }}
                            placeholder="0"
                            className="w-20 text-right text-[12px] font-bold px-2 py-1 rounded outline-none"
                            style={{ background: '#F4F3EF', border: '1px solid #E6E6E1', color: '#141414' }}
                          />
                        </div>
                      </div>
                      <div className="mt-3 h-2 rounded-full overflow-hidden" style={{ background: '#EDEDEA' }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct >= 100 ? '#137A3F' : '#D6F23C' }} />
                      </div>
                      <p className="text-[10px] mt-1.5" style={{ color: '#9B9B9B' }}>
                        {target > 0 ? `${pct}% da meta` : 'defina a meta'}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* AÇÕES + CONTEÚDO */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* ações */}
              <div className="rounded-2xl p-4" style={{ background: '#FFFFFF', border: '1px solid #E6E6E1' }}>
                <p className="text-[12px] font-bold mb-3" style={{ color: '#141414' }}>Ações do mês</p>
                <div className="flex flex-col gap-1.5 mb-3">
                  {acoes.length === 0 && <p className="text-[12px]" style={{ color: '#A8B5B0' }}>Nenhuma ação ainda.</p>}
                  {acoes.map((a) => (
                    <div key={a.id} className="flex items-center gap-2 group">
                      <button
                        onClick={() => patchItem(a.id, { status: a.status === 'done' ? '' : 'done' })}
                        className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                        style={{ background: a.status === 'done' ? '#137A3F' : '#F4F3EF', border: '1px solid ' + (a.status === 'done' ? '#137A3F' : '#D8D8D0') }}
                      >
                        {a.status === 'done' && <Check size={12} color="#fff" />}
                      </button>
                      <span className="text-[13px] flex-1" style={{ color: a.status === 'done' ? '#A8B5B0' : '#141414', textDecoration: a.status === 'done' ? 'line-through' : 'none' }}>
                        {a.title}
                      </span>
                      <button onClick={() => removeItem(a.id)} className="opacity-0 group-hover:opacity-100 p-1" style={{ color: '#C86B6B' }}><Trash2 size={12} /></button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={newAcao}
                    onChange={(e) => setNewAcao(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { addItem('acao', newAcao); setNewAcao('') } }}
                    placeholder="Nova ação…"
                    className="flex-1 text-[13px] px-3 py-2 rounded-lg outline-none"
                    style={{ background: '#F4F3EF', border: '1px solid #E6E6E1', color: '#141414' }}
                  />
                  <button onClick={() => { addItem('acao', newAcao); setNewAcao('') }} className="px-3 rounded-lg" style={{ background: '#141414', color: '#D6F23C' }}><Plus size={14} /></button>
                </div>
              </div>

              {/* conteúdo */}
              <div className="rounded-2xl p-4" style={{ background: '#FFFFFF', border: '1px solid #E6E6E1' }}>
                <p className="text-[12px] font-bold mb-3" style={{ color: '#141414' }}>Conteúdo / Criação</p>
                <div className="flex flex-col gap-1.5 mb-3">
                  {conteudos.length === 0 && <p className="text-[12px]" style={{ color: '#A8B5B0' }}>Nenhum conteúdo ainda.</p>}
                  {conteudos.map((c) => {
                    const meta = CONTEUDO_META[c.status] || CONTEUDO_META.ideia
                    return (
                      <div key={c.id} className="flex items-center gap-2 group">
                        <button
                          onClick={() => {
                            const i = CONTEUDO_STATUS.indexOf(c.status as typeof CONTEUDO_STATUS[number])
                            const next = CONTEUDO_STATUS[(i + 1) % CONTEUDO_STATUS.length]
                            patchItem(c.id, { status: next })
                          }}
                          className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full flex-shrink-0"
                          style={{ background: meta.bg, color: meta.color }}
                          title="Clique pra mudar o status"
                        >
                          {meta.label}
                        </button>
                        <span className="text-[13px] flex-1" style={{ color: '#141414' }}>{c.title}</span>
                        <button onClick={() => removeItem(c.id)} className="opacity-0 group-hover:opacity-100 p-1" style={{ color: '#C86B6B' }}><Trash2 size={12} /></button>
                      </div>
                    )
                  })}
                </div>
                <div className="flex gap-2">
                  <input
                    value={newConteudo}
                    onChange={(e) => setNewConteudo(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { addItem('conteudo', newConteudo); setNewConteudo('') } }}
                    placeholder="Nova ideia de conteúdo…"
                    className="flex-1 text-[13px] px-3 py-2 rounded-lg outline-none"
                    style={{ background: '#F4F3EF', border: '1px solid #E6E6E1', color: '#141414' }}
                  />
                  <button onClick={() => { addItem('conteudo', newConteudo); setNewConteudo('') }} className="px-3 rounded-lg" style={{ background: '#141414', color: '#D6F23C' }}><Plus size={14} /></button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function SetupBanner({ onRetry }: { onRetry: () => void }) {
  const sql = `create table if not exists public.planning_entries (
  id uuid primary key default gen_random_uuid(),
  month text not null default '',
  kind text not null default 'acao',
  title text not null default '',
  target numeric not null default 0,
  status text default '',
  sort bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
notify pgrst, 'reload schema';`
  const [copied, setCopied] = useState(false)
  return (
    <div className="max-w-[640px] mt-2 rounded-2xl p-6" style={{ background: '#FFFFFF', border: '1px solid #E6E6E1' }}>
      <p className="text-[15px] font-bold" style={{ color: '#141414' }}>Falta um passo único (30 segundos)</p>
      <p className="text-[13px] mt-1.5 leading-relaxed" style={{ color: '#6E6E6E' }}>
        Pra guardar o planejamento, precisamos criar a tabela uma vez. Copie, cole no <b>SQL Editor</b> do Supabase (Run) e clique “Já criei”.
      </p>
      <pre className="text-[11px] mt-3 p-3 rounded-lg overflow-x-auto" style={{ background: '#141414', color: '#EAF3E9' }}>{sql}</pre>
      <div className="flex items-center gap-2 mt-3">
        <button onClick={() => navigator.clipboard.writeText(sql).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) })} className="text-[12px] font-bold px-3 py-2 rounded-lg" style={{ background: '#F4F3EF', color: '#141414', border: '1px solid #E6E6E1' }}>
          {copied ? 'Copiado!' : 'Copiar comando'}
        </button>
        <button onClick={onRetry} className="text-[12px] font-bold px-3 py-2 rounded-lg" style={{ background: '#141414', color: '#D6F23C' }}>Já criei</button>
      </div>
    </div>
  )
}
