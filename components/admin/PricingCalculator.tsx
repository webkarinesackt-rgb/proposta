'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Plus,
  Trash2,
  Copy,
  Check,
  SlidersHorizontal,
  RotateCcw,
  Calculator,
  CalendarRange,
  AlertTriangle,
  Info,
} from 'lucide-react'
import {
  DEFAULT_PARAMS,
  DEFAULT_PESOS,
  PricingParams,
  orcar,
  margemDoPreco,
  fecharMes,
  roundUp100,
  custoPorVaga,
} from '@/lib/pricing'

/* piso absoluto de uma landing page (spec §9) */
const PISO_LP = 1476.71

const PARAMS_KEY = 'fysi.pricing.params'
const PESOS_KEY = 'fysi.pricing.pesos'

/* rótulos amigáveis pros tipos (a chave crua é o que a fórmula usa) */
const TIPO_LABEL: Record<string, string> = {
  'landing page': 'Landing page',
  'home de site': 'Home de site',
  'pagina de site unica': 'Página de site (única)',
  'pagina de site leve': 'Página leve (contato/obrigado)',
  blog: 'Blog',
  'template reaproveitavel': 'Template reaproveitável',
  'pagina duplicada': 'Página duplicada (dev)',
  'revisao de bloco': 'Revisão de bloco',
  'setup de conteudo ia': 'Setup de conteúdo IA',
}
const tipoLabel = (k: string) => TIPO_LABEL[k] || k

const brl = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const pct = (v: number) => (v * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%'
const num = (s: string | number) => {
  const n = parseFloat(String(s).replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

type ItemRow = { id: number; tipo: string; qtd: string }
type MesRow = { id: number; qtd: string; preco: string; vagasUnit: string; custoDiretoUnit: string }

let _id = 1
const nid = () => _id++

export default function PricingCalculator() {
  const [mode, setMode] = useState<'orcar' | 'mes'>('orcar')
  const [showParams, setShowParams] = useState(false)

  // parâmetros e pesos — editáveis, salvos no navegador
  const [params, setParams] = useState<PricingParams>(DEFAULT_PARAMS)
  const [pesos, setPesos] = useState<Record<string, number>>(DEFAULT_PESOS)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try {
      const p = localStorage.getItem(PARAMS_KEY)
      if (p) setParams({ ...DEFAULT_PARAMS, ...JSON.parse(p) })
      const w = localStorage.getItem(PESOS_KEY)
      if (w) setPesos({ ...DEFAULT_PESOS, ...JSON.parse(w) })
    } catch {}
    setLoaded(true)
  }, [])
  useEffect(() => {
    if (!loaded) return
    try {
      localStorage.setItem(PARAMS_KEY, JSON.stringify(params))
      localStorage.setItem(PESOS_KEY, JSON.stringify(pesos))
    } catch {}
  }, [params, pesos, loaded])

  function resetParams() {
    if (!confirm('Restaurar parâmetros e pesos para o padrão do modelo?')) return
    setParams(DEFAULT_PARAMS)
    setPesos(DEFAULT_PESOS)
  }

  return (
    <div className="max-w-5xl">
      {/* modo + botão parâmetros */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="flex items-center gap-1 p-1 rounded-full" style={{ background: '#FFFFFF', border: '1px solid #E6E6E1' }}>
          {([
            { id: 'orcar', label: 'Orçar projeto', icon: Calculator },
            { id: 'mes', label: 'Fechar o mês', icon: CalendarRange },
          ] as const).map((t) => {
            const active = mode === t.id
            const Icon = t.icon
            return (
              <button
                key={t.id}
                onClick={() => setMode(t.id)}
                className="flex items-center gap-1.5 text-[12px] font-bold px-3.5 py-1.5 rounded-full transition-all"
                style={{ background: active ? '#141414' : 'transparent', color: active ? '#D6F23C' : '#6E6E6E' }}
              >
                <Icon size={13} /> {t.label}
              </button>
            )
          })}
        </div>
        <button
          onClick={() => setShowParams((s) => !s)}
          className="flex items-center gap-1.5 text-[12px] font-bold px-3 py-2 rounded-lg ml-auto"
          style={{ background: showParams ? '#141414' : '#FFFFFF', color: showParams ? '#D6F23C' : '#141414', border: '1px solid ' + (showParams ? '#141414' : '#E6E6E1') }}
        >
          <SlidersHorizontal size={14} /> Parâmetros
        </button>
      </div>

      {showParams && <ParamsEditor params={params} setParams={setParams} pesos={pesos} setPesos={setPesos} onReset={resetParams} />}

      {mode === 'orcar' ? (
        <OrcarPanel params={params} pesos={pesos} />
      ) : (
        <FecharMesPanel params={params} pesos={pesos} />
      )}
    </div>
  )
}

/* ─────────────────────────── ORÇAR PROJETO ─────────────────────────── */

function OrcarPanel({ params, pesos }: { params: PricingParams; pesos: Record<string, number> }) {
  const tipos = Object.keys(pesos)
  const [itens, setItens] = useState<ItemRow[]>([{ id: nid(), tipo: 'landing page', qtd: '1' }])
  const [custoDireto, setCustoDireto] = useState('350')
  const [precoNeg, setPrecoNeg] = useState('')
  const [copied, setCopied] = useState(false)

  const r = useMemo(
    () =>
      orcar(
        itens.map((i) => ({ tipo: i.tipo, qtd: num(i.qtd) })),
        num(custoDireto),
        params,
        pesos
      ),
    [itens, custoDireto, params, pesos]
  )

  const sugerido = r.precoAlvo != null ? roundUp100(r.precoAlvo) : null
  const precoNegVal = num(precoNeg)
  const teste = precoNeg.trim() ? margemDoPreco(precoNegVal, r.custo, params) : null

  function addItem() {
    setItens((xs) => [...xs, { id: nid(), tipo: tipos[0] || 'landing page', qtd: '1' }])
  }
  function copyResumo() {
    const linhas = itens
      .filter((i) => num(i.qtd) > 0)
      .map((i) => `• ${num(i.qtd)}× ${tipoLabel(i.tipo)}`)
      .join('\n')
    const txt =
      `Orçamento — precificação Fysi\n${linhas}\n` +
      `\nVagas do mês: ${r.vagas.toFixed(2)} (${pct(r.ocupacaoDoMes)} da capacidade)` +
      `\nCusto do projeto: ${brl(r.custo)}` +
      `\nPreço mínimo (empata): ${brl(r.precoMinimo)}` +
      (sugerido != null ? `\nPreço sugerido (margem ${pct(params.margemAlvo)}): ${brl(sugerido)}` : '') +
      (teste ? `\nPreço testado: ${brl(precoNegVal)} → margem ${pct(teste.margem)}` : '')
    navigator.clipboard.writeText(txt).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    })
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
      {/* entrada */}
      <div className="rounded-2xl p-4 md:p-5" style={{ background: '#FFFFFF', border: '1px solid #E6E6E1' }}>
        <p className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: '#9B9B9B' }}>
          Itens do projeto
        </p>
        <div className="flex flex-col gap-2">
          {itens.map((it) => {
            const peso = pesos[it.tipo] ?? 0
            const vagasItem = peso * num(it.qtd)
            return (
              <div key={it.id} className="flex items-center gap-2">
                <select
                  value={it.tipo}
                  onChange={(e) => setItens((xs) => xs.map((x) => (x.id === it.id ? { ...x, tipo: e.target.value } : x)))}
                  className="flex-1 min-w-0 text-[13px] px-2.5 py-2 rounded-lg outline-none"
                  style={{ background: '#F4F3EF', border: '1px solid #E6E6E1', color: '#141414' }}
                >
                  {tipos.map((t) => (
                    <option key={t} value={t}>
                      {tipoLabel(t)} ({pesos[t]} vg)
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={it.qtd}
                  onChange={(e) => setItens((xs) => xs.map((x) => (x.id === it.id ? { ...x, qtd: e.target.value } : x)))}
                  className="w-16 text-[13px] text-center px-2 py-2 rounded-lg outline-none"
                  style={{ background: '#F4F3EF', border: '1px solid #E6E6E1', color: '#141414' }}
                />
                <span className="text-[11px] w-16 text-right tabular-nums" style={{ color: '#9B9B9B' }}>
                  {vagasItem.toFixed(2)} vg
                </span>
                <button
                  onClick={() => setItens((xs) => (xs.length > 1 ? xs.filter((x) => x.id !== it.id) : xs))}
                  className="p-1.5 rounded hover:bg-[#FBE0E0] flex-shrink-0"
                  style={{ color: '#C86B6B' }}
                  title="Remover"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            )
          })}
        </div>
        <button
          onClick={addItem}
          className="mt-3 flex items-center gap-1.5 text-[12px] font-bold px-3 py-1.5 rounded-lg"
          style={{ background: '#F4F3EF', color: '#141414', border: '1px solid #E6E6E1' }}
        >
          <Plus size={13} /> Adicionar item
        </button>

        {/* custo direto */}
        <div className="mt-5 pt-4" style={{ borderTop: '1px solid #F0F0EC' }}>
          <label className="block text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: '#9B9B9B' }}>
            Custo direto do projeto (R$)
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={custoDireto}
            onChange={(e) => setCustoDireto(e.target.value)}
            className="w-full text-[15px] font-semibold px-3 py-2 rounded-lg outline-none"
            style={{ background: '#F4F3EF', border: '1px solid #E6E6E1', color: '#141414' }}
          />
          <p className="text-[11px] mt-1.5 leading-relaxed flex items-start gap-1" style={{ color: '#9B9B9B' }}>
            <Info size={12} className="flex-shrink-0 mt-0.5" />
            <span>
              Entrada livre — nunca fórmula automática por página. Ref: Daniel página avulsa R$350, site até 5 págs
              R$600 (pacote), site &gt;5 págs R$120/pág, Leonardo tráfego R$300.
            </span>
          </p>
        </div>

        {/* teste de preço */}
        <div className="mt-5 pt-4" style={{ borderTop: '1px solid #F0F0EC' }}>
          <label className="block text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: '#9B9B9B' }}>
            Testar um preço negociado (R$) — opcional
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={precoNeg}
            onChange={(e) => setPrecoNeg(e.target.value)}
            placeholder="Ex: 2300"
            className="w-full text-[15px] font-semibold px-3 py-2 rounded-lg outline-none"
            style={{ background: '#F4F3EF', border: '1px solid #E6E6E1', color: '#141414' }}
          />
          {teste && (
            <div className="mt-2 flex items-center gap-4 text-[12px]" style={{ color: '#4A5A56' }}>
              <span>Imposto: <b>{brl(teste.imposto)}</b></span>
              <span>Sobra: <b>{brl(teste.sobra)}</b></span>
              <span>
                Margem:{' '}
                <b style={{ color: teste.margem < 0 ? '#B42318' : teste.margem < 0.15 ? '#B4780A' : '#137A3F' }}>
                  {pct(teste.margem)}
                </b>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* resultado */}
      <div className="flex flex-col gap-3">
        <div className="rounded-2xl p-5" style={{ background: '#141414' }}>
          <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'rgba(214,242,60,0.7)' }}>
            Preço sugerido
          </p>
          <p className="text-[34px] font-bold leading-tight mt-1" style={{ color: '#D6F23C' }}>
            {sugerido != null ? brl(sugerido) : '—'}
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>
            margem-alvo {pct(params.margemAlvo)}
            {r.precoAlvo != null && sugerido != null && sugerido !== r.precoAlvo
              ? ` · exato ${brl(r.precoAlvo)}`
              : ''}
          </p>
          {r.precoAlvo == null && (
            <p className="text-[12px] mt-2 font-semibold" style={{ color: '#F4A0A0' }}>
              Margem inviável — ajuste a margem-alvo nos parâmetros.
            </p>
          )}
        </div>

        <div className="rounded-2xl p-4" style={{ background: '#FFFFFF', border: '1px solid #E6E6E1' }}>
          <Line label="Vagas do estúdio" value={`${r.vagas.toFixed(2)} vg`} />
          <Line label="Ocupação do mês" value={pct(r.ocupacaoDoMes)} />
          <div className="my-2" style={{ borderTop: '1px solid #F0F0EC' }} />
          <Line label="Custo indireto (vagas)" value={brl(r.indireto)} sub />
          <Line label="Custo direto" value={brl(r.custoDireto)} sub />
          <Line label="Custo total" value={brl(r.custo)} strong />
          <div className="my-2" style={{ borderTop: '1px solid #F0F0EC' }} />
          <Line label="Preço mínimo (empata)" value={brl(r.precoMinimo)} />
        </div>

        {/* avisos */}
        <Warnings
          ocupacao={r.ocupacaoDoMes}
          precoMinimo={r.precoMinimo}
          precoNeg={precoNeg.trim() ? precoNegVal : null}
          margem={teste?.margem ?? null}
        />

        <button
          onClick={copyResumo}
          className="flex items-center justify-center gap-1.5 text-[12px] font-bold px-3 py-2.5 rounded-xl"
          style={{ background: copied ? '#DCF3E4' : '#141414', color: copied ? '#137A3F' : '#D6F23C' }}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? 'Copiado!' : 'Copiar resumo'}
        </button>
      </div>
    </div>
  )
}

function Line({ label, value, sub, strong }: { label: string; value: string; sub?: boolean; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-[12px]" style={{ color: sub ? '#9B9B9B' : '#6E6E6E' }}>
        {label}
      </span>
      <span
        className="tabular-nums"
        style={{ fontSize: strong ? 15 : 13, fontWeight: strong ? 700 : 600, color: '#141414' }}
      >
        {value}
      </span>
    </div>
  )
}

function Warnings({
  ocupacao,
  precoMinimo,
  precoNeg,
  margem,
}: {
  ocupacao: number
  precoMinimo: number
  precoNeg: number | null
  margem: number | null
}) {
  const items: { tone: 'red' | 'amber'; text: string }[] = []
  if (ocupacao > 0.5)
    items.push({ tone: 'amber', text: 'Este projeto ocupa mais de metade do mês. Parcele a entrega e o pagamento.' })
  if (precoNeg != null) {
    if (margem != null && margem < 0)
      items.push({ tone: 'red', text: `Este preço dá prejuízo. Faltam ${brl(precoMinimo - precoNeg)} para empatar.` })
    else if (precoNeg < precoMinimo)
      items.push({ tone: 'red', text: `Abaixo do mínimo. Faltam ${brl(precoMinimo - precoNeg)} para empatar.` })
    else if (margem != null && margem >= 0 && margem < 0.15)
      items.push({ tone: 'amber', text: 'Margem abaixo do mínimo saudável (15%).' })
    if (precoNeg < PISO_LP)
      items.push({ tone: 'red', text: `Abaixo do piso de uma landing page (${brl(PISO_LP)}). Abaixo disso a peça dá prejuízo sozinha.` })
  }
  if (items.length === 0) return null
  return (
    <div className="flex flex-col gap-2">
      {items.map((w, i) => (
        <div
          key={i}
          className="flex items-start gap-2 text-[12px] rounded-xl p-3 leading-relaxed"
          style={{
            background: w.tone === 'red' ? '#FBE9E7' : '#FBF4E0',
            color: w.tone === 'red' ? '#B42318' : '#8A5A00',
          }}
        >
          <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
          <span>{w.text}</span>
        </div>
      ))}
    </div>
  )
}

/* ─────────────────────────── FECHAR O MÊS ─────────────────────────── */

function FecharMesPanel({ params, pesos }: { params: PricingParams; pesos: Record<string, number> }) {
  void pesos
  const [linhas, setLinhas] = useState<MesRow[]>([
    { id: nid(), qtd: '5', preco: '1800', vagasUnit: '1', custoDiretoUnit: '350' },
    { id: nid(), qtd: '10', preco: '2300', vagasUnit: '1', custoDiretoUnit: '350' },
  ])

  const f = useMemo(
    () =>
      fecharMes(
        linhas.map((l) => ({
          qtd: num(l.qtd),
          preco: num(l.preco),
          vagasUnit: num(l.vagasUnit),
          custoDiretoUnit: num(l.custoDiretoUnit),
        })),
        params
      ),
    [linhas, params]
  )

  function up(id: number, k: keyof MesRow, v: string) {
    setLinhas((xs) => xs.map((x) => (x.id === id ? { ...x, [k]: v } : x)))
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
      <div className="rounded-2xl p-4 md:p-5 overflow-x-auto" style={{ background: '#FFFFFF', border: '1px solid #E6E6E1' }}>
        <p className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: '#9B9B9B' }}>
          Peças do mês
        </p>
        <div className="min-w-[480px]">
          <div className="grid grid-cols-[60px_1fr_1fr_1fr_32px] gap-2 mb-1 px-1">
            {['Qtd', 'Preço', 'Vagas/un', 'Custo dir/un', ''].map((h, i) => (
              <span key={i} className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#9B9B9B' }}>
                {h}
              </span>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            {linhas.map((l) => (
              <div key={l.id} className="grid grid-cols-[60px_1fr_1fr_1fr_32px] gap-2 items-center">
                <MesInput value={l.qtd} onChange={(v) => up(l.id, 'qtd', v)} />
                <MesInput value={l.preco} onChange={(v) => up(l.id, 'preco', v)} />
                <MesInput value={l.vagasUnit} onChange={(v) => up(l.id, 'vagasUnit', v)} />
                <MesInput value={l.custoDiretoUnit} onChange={(v) => up(l.id, 'custoDiretoUnit', v)} />
                <button
                  onClick={() => setLinhas((xs) => (xs.length > 1 ? xs.filter((x) => x.id !== l.id) : xs))}
                  className="p-1.5 rounded hover:bg-[#FBE0E0]"
                  style={{ color: '#C86B6B' }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
        <button
          onClick={() => setLinhas((xs) => [...xs, { id: nid(), qtd: '1', preco: '2200', vagasUnit: '1', custoDiretoUnit: '350' }])}
          className="mt-3 flex items-center gap-1.5 text-[12px] font-bold px-3 py-1.5 rounded-lg"
          style={{ background: '#F4F3EF', color: '#141414', border: '1px solid #E6E6E1' }}
        >
          <Plus size={13} /> Adicionar peça
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <div className="rounded-2xl p-5" style={{ background: '#141414' }}>
          <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'rgba(214,242,60,0.7)' }}>
            Sobra do mês
          </p>
          <p className="text-[30px] font-bold leading-tight mt-1" style={{ color: f.sobra < 0 ? '#F4A0A0' : '#D6F23C' }}>
            {brl(f.sobra)}
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>
            margem {pct(f.margem)} · depois de impostos, diretos e custo fixo
          </p>
        </div>
        <div className="rounded-2xl p-4" style={{ background: '#FFFFFF', border: '1px solid #E6E6E1' }}>
          <Line label="Peças" value={String(f.qtd)} />
          <Line label="Faturamento" value={brl(f.faturamento)} strong />
          <Line label="Imposto" value={brl(f.imposto)} sub />
          <Line label="Custo direto" value={brl(f.direto)} sub />
          <Line label="Custo fixo" value={brl(params.custoFixoMensal)} sub />
          <div className="my-2" style={{ borderTop: '1px solid #F0F0EC' }} />
          <Line label="Vagas usadas" value={`${f.vagas.toFixed(2)} / ${params.vagasPorMes}`} />
          <Line label="Ocupação" value={pct(f.ocupacao)} />
          <div className="my-2" style={{ borderTop: '1px solid #F0F0EC' }} />
          <Line label="Contribuição/peça" value={brl(f.contribuicao)} sub />
          <Line
            label="Peças pra empatar"
            value={Number.isFinite(f.pecasParaEmpatar) ? f.pecasParaEmpatar.toFixed(1) : '—'}
            strong
          />
        </div>
        {f.ocupacao > 1 && (
          <div className="flex items-start gap-2 text-[12px] rounded-xl p-3" style={{ background: '#FBE9E7', color: '#B42318' }}>
            <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
            <span>Passou da capacidade do mês ({params.vagasPorMes} vagas). Reduza o escopo ou empurre entregas.</span>
          </div>
        )}
      </div>
    </div>
  )
}

function MesInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="text"
      inputMode="decimal"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full text-[13px] text-center px-2 py-2 rounded-lg outline-none tabular-nums"
      style={{ background: '#F4F3EF', border: '1px solid #E6E6E1', color: '#141414' }}
    />
  )
}

/* ─────────────────────────── PARÂMETROS ─────────────────────────── */

function ParamsEditor({
  params,
  setParams,
  pesos,
  setPesos,
  onReset,
}: {
  params: PricingParams
  setParams: (p: PricingParams) => void
  pesos: Record<string, number>
  setPesos: (p: Record<string, number>) => void
  onReset: () => void
}) {
  const [novoTipo, setNovoTipo] = useState('')
  return (
    <div className="rounded-2xl p-4 md:p-5 mb-4" style={{ background: '#FFFFFF', border: '1px solid #E6E6E1' }}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#9B9B9B' }}>
          Parâmetros do modelo
        </p>
        <button onClick={onReset} className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg" style={{ color: '#6E6E6E', border: '1px solid #E6E6E1' }}>
          <RotateCcw size={12} /> Restaurar padrão
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <ParamField label="Custo fixo mensal (R$)" value={params.custoFixoMensal} onChange={(v) => setParams({ ...params, custoFixoMensal: v })} />
        <ParamField label="Vagas por mês" value={params.vagasPorMes} onChange={(v) => setParams({ ...params, vagasPorMes: v })} />
        <ParamField label="Imposto (%)" value={params.imposto * 100} onChange={(v) => setParams({ ...params, imposto: v / 100 })} />
        <ParamField label="Margem-alvo (%)" value={params.margemAlvo * 100} onChange={(v) => setParams({ ...params, margemAlvo: v / 100 })} />
      </div>
      <p className="text-[11px] mt-2" style={{ color: '#9B9B9B' }}>
        Custo por vaga: <b>{brl(custoPorVaga(params))}</b> · rateio do custo fixo por unidade de trabalho.
      </p>

      <p className="text-[11px] font-bold uppercase tracking-wider mt-5 mb-2" style={{ color: '#9B9B9B' }}>
        Pesos (vagas por tipo)
      </p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {Object.keys(pesos).map((k) => (
          <div key={k} className="flex items-center gap-2">
            <span className="text-[12px] flex-1 min-w-0 truncate" style={{ color: '#4A5A56' }} title={tipoLabel(k)}>
              {tipoLabel(k)}
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={String(pesos[k])}
              onChange={(e) => setPesos({ ...pesos, [k]: num(e.target.value) })}
              className="w-16 text-[13px] text-center px-2 py-1.5 rounded-lg outline-none tabular-nums"
              style={{ background: '#F4F3EF', border: '1px solid #E6E6E1', color: '#141414' }}
            />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-3">
        <input
          value={novoTipo}
          onChange={(e) => setNovoTipo(e.target.value)}
          placeholder="Novo tipo (ex: e-mail marketing)"
          className="flex-1 text-[12px] px-3 py-2 rounded-lg outline-none"
          style={{ background: '#F4F3EF', border: '1px solid #E6E6E1', color: '#141414' }}
        />
        <button
          onClick={() => {
            const t = novoTipo.trim().toLowerCase()
            if (t && !(t in pesos)) setPesos({ ...pesos, [t]: 0.5 })
            setNovoTipo('')
          }}
          className="text-[12px] font-bold px-3 py-2 rounded-lg"
          style={{ background: '#141414', color: '#D6F23C' }}
        >
          Adicionar peso
        </button>
      </div>
    </div>
  )
}

function ParamField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#9B9B9B' }}>
        {label}
      </label>
      <input
        type="text"
        inputMode="decimal"
        value={String(value)}
        onChange={(e) => onChange(num(e.target.value))}
        className="w-full text-[14px] font-semibold px-3 py-2 rounded-lg outline-none tabular-nums"
        style={{ background: '#F4F3EF', border: '1px solid #E6E6E1', color: '#141414' }}
      />
    </div>
  )
}
