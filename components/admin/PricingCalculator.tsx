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
const CATALOG_KEY = 'fysi.pricing.catalog.v2'

/* Catálogo de produtos: rótulo, quanto ocupa de vaga (esforço de estúdio)
   e o preço que a Karine costuma cobrar (referência de tabela).
   Itens "interno" são etapas de estúdio — não têm preço de venda avulso. */
type CatItem = { key: string; label: string; vagas: number; preco?: number; interno?: boolean }

const DEFAULT_CATALOG: CatItem[] = [
  { key: 'lp ate 7 dobras', label: 'Landing page até 7 dobras / one page', vagas: 1.0, preco: 2300 },
  { key: 'lp mais dobras', label: 'Landing page +7 dobras', vagas: 1.3, preco: 2800 },
  { key: 'pagina parceiros', label: 'Página de parceiros', vagas: 0.5, preco: 650 },
  { key: 'pagina link bio', label: 'Página link na bio', vagas: 0.5, preco: 650 },
  { key: 'pagina de proposta', label: 'Página de proposta', vagas: 0.4, preco: 300 },
  { key: 'pagina de obrigado', label: 'Página de obrigado', vagas: 0.3, preco: 350 },
  { key: 'blog', label: 'Blog', vagas: 0.3, preco: 450 },
  { key: 'home de site', label: 'Home de site', vagas: 1.0, preco: 2200 },
  { key: 'pagina de site unica', label: 'Página de site (Sobre, Serviços)', vagas: 0.6, preco: 1500 },
  { key: 'pagina de site leve', label: 'Página leve (Contato)', vagas: 0.4, preco: 900 },
  { key: 'consultoria', label: 'Consultoria', vagas: 1.0 },
  { key: 'template reaproveitavel', label: 'Template reaproveitável', vagas: 0.8, interno: true },
  { key: 'pagina duplicada', label: 'Página duplicada (dev)', vagas: 0.0, interno: true },
  { key: 'revisao de bloco', label: 'Revisão de bloco', vagas: 0.5, interno: true },
  { key: 'setup de conteudo ia', label: 'Setup de conteúdo IA', vagas: 0.25, interno: true },
]

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

  const [params, setParams] = useState<PricingParams>(DEFAULT_PARAMS)
  const [catalog, setCatalog] = useState<CatItem[]>(DEFAULT_CATALOG)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try {
      const p = localStorage.getItem(PARAMS_KEY)
      if (p) setParams({ ...DEFAULT_PARAMS, ...JSON.parse(p) })
      const c = localStorage.getItem(CATALOG_KEY)
      if (c) {
        const parsed = JSON.parse(c)
        if (Array.isArray(parsed) && parsed.length) setCatalog(parsed)
      }
    } catch {}
    setLoaded(true)
  }, [])
  useEffect(() => {
    if (!loaded) return
    try {
      localStorage.setItem(PARAMS_KEY, JSON.stringify(params))
      localStorage.setItem(CATALOG_KEY, JSON.stringify(catalog))
    } catch {}
  }, [params, catalog, loaded])

  // mapa chave→vagas pra alimentar as fórmulas puras
  const pesos = useMemo(
    () => Object.fromEntries(catalog.map((c) => [c.key, c.vagas])),
    [catalog]
  )

  function resetAll() {
    if (!confirm('Restaurar parâmetros e catálogo para o padrão?')) return
    setParams(DEFAULT_PARAMS)
    setCatalog(DEFAULT_CATALOG)
  }

  return (
    <div className="max-w-5xl">
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
          <SlidersHorizontal size={14} /> Catálogo & parâmetros
        </button>
      </div>

      {showParams && (
        <ParamsEditor params={params} setParams={setParams} catalog={catalog} setCatalog={setCatalog} onReset={resetAll} />
      )}

      {mode === 'orcar' ? (
        <OrcarPanel params={params} pesos={pesos} catalog={catalog} />
      ) : (
        <FecharMesPanel params={params} />
      )}
    </div>
  )
}

/* ─────────────────────────── ORÇAR PROJETO ─────────────────────────── */

function OrcarPanel({
  params,
  pesos,
  catalog,
}: {
  params: PricingParams
  pesos: Record<string, number>
  catalog: CatItem[]
}) {
  const catMap = useMemo(() => Object.fromEntries(catalog.map((c) => [c.key, c])), [catalog])
  const first = catalog[0]?.key || 'landing page'
  const [itens, setItens] = useState<ItemRow[]>([{ id: nid(), tipo: first, qtd: '1' }])
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

  // preço de tabela = soma dos preços que a Karine cobra por cada item
  const precoTabela = useMemo(
    () => itens.reduce((a, i) => a + num(i.qtd) * (catMap[i.tipo]?.preco || 0), 0),
    [itens, catMap]
  )
  const tabelaMargem = precoTabela > 0 ? margemDoPreco(precoTabela, r.custo, params).margem : null

  const precoNegVal = num(precoNeg)
  const teste = precoNeg.trim() ? margemDoPreco(precoNegVal, r.custo, params) : null

  function copyResumo() {
    const linhas = itens
      .filter((i) => num(i.qtd) > 0)
      .map((i) => `• ${num(i.qtd)}× ${catMap[i.tipo]?.label || i.tipo}`)
      .join('\n')
    const txt =
      `Precificação Fysi\n${linhas}\n` +
      `\nCusto do projeto: ${brl(r.custo)}` +
      `\nPreço mínimo (empata): ${brl(r.precoMinimo)}` +
      (precoTabela > 0 ? `\nSeu preço de tabela: ${brl(precoTabela)}` : '') +
      (sugerido != null ? `\nPreço sugerido (margem ${pct(params.margemAlvo)}): ${brl(sugerido)}` : '') +
      `\nOcupação do mês: ${pct(r.ocupacaoDoMes)}`
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
                  {catalog.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.label} · {c.vagas} vg{c.preco ? ` · ${brl(c.preco)}` : ''}
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
                <span className="text-[11px] w-14 text-right tabular-nums" style={{ color: '#9B9B9B' }}>
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
          onClick={() => setItens((xs) => [...xs, { id: nid(), tipo: first, qtd: '1' }])}
          className="mt-3 flex items-center gap-1.5 text-[12px] font-bold px-3 py-1.5 rounded-lg"
          style={{ background: '#F4F3EF', color: '#141414', border: '1px solid #E6E6E1' }}
        >
          <Plus size={13} /> Adicionar item
        </button>

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

        <div className="mt-5 pt-4" style={{ borderTop: '1px solid #F0F0EC' }}>
          <label className="block text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: '#9B9B9B' }}>
            Testar outro preço (R$) — opcional
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={precoNeg}
            onChange={(e) => setPrecoNeg(e.target.value)}
            placeholder="Ex: 2000"
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
        {/* dois preços lado a lado */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl p-4" style={{ background: '#FFFFFF', border: '1px solid #E6E6E1' }}>
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#9B9B9B' }}>
              Sua tabela
            </p>
            <p className="text-[22px] font-bold leading-tight mt-1" style={{ color: '#141414' }}>
              {precoTabela > 0 ? brl(precoTabela) : '—'}
            </p>
            {tabelaMargem != null && (
              <p className="text-[11px] mt-0.5 font-semibold" style={{ color: tabelaMargem < 0 ? '#B42318' : tabelaMargem < 0.15 ? '#B4780A' : '#137A3F' }}>
                margem {pct(tabelaMargem)}
              </p>
            )}
          </div>
          <div className="rounded-2xl p-4" style={{ background: '#141414' }}>
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'rgba(214,242,60,0.7)' }}>
              Modelo sugere
            </p>
            <p className="text-[22px] font-bold leading-tight mt-1" style={{ color: '#D6F23C' }}>
              {sugerido != null ? brl(sugerido) : '—'}
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>
              margem {pct(params.margemAlvo)}
            </p>
          </div>
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
          {r.precoAlvo != null && sugerido != null && sugerido !== r.precoAlvo && (
            <Line label="Preço-alvo exato" value={brl(r.precoAlvo)} sub />
          )}
        </div>

        <Comparacao precoTabela={precoTabela} sugerido={sugerido} precoMinimo={r.precoMinimo} />

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

function Comparacao({
  precoTabela,
  sugerido,
  precoMinimo,
}: {
  precoTabela: number
  sugerido: number | null
  precoMinimo: number
}) {
  if (precoTabela <= 0 || sugerido == null) return null
  let tone: 'red' | 'amber' | 'green'
  let text: string
  if (precoTabela < precoMinimo) {
    tone = 'red'
    text = `Sua tabela dá prejuízo: faltam ${brl(precoMinimo - precoTabela)} só pra empatar o custo.`
  } else if (precoTabela < sugerido) {
    tone = 'amber'
    text = `Sua tabela cobre o custo, mas está ${brl(sugerido - precoTabela)} abaixo do preço-alvo (margem cheia).`
  } else {
    tone = 'green'
    text = `Sua tabela está no alvo — ${brl(precoTabela - sugerido)} acima do sugerido. 👏`
  }
  const bg = tone === 'red' ? '#FBE9E7' : tone === 'amber' ? '#FBF4E0' : '#DCF3E4'
  const fg = tone === 'red' ? '#B42318' : tone === 'amber' ? '#8A5A00' : '#137A3F'
  return (
    <div className="text-[12px] rounded-xl p-3 leading-relaxed" style={{ background: bg, color: fg }}>
      {text}
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
  }
  if (items.length === 0) return null
  return (
    <div className="flex flex-col gap-2">
      {items.map((w, i) => (
        <div
          key={i}
          className="flex items-start gap-2 text-[12px] rounded-xl p-3 leading-relaxed"
          style={{ background: w.tone === 'red' ? '#FBE9E7' : '#FBF4E0', color: w.tone === 'red' ? '#B42318' : '#8A5A00' }}
        >
          <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
          <span>{w.text}</span>
        </div>
      ))}
    </div>
  )
}

/* ─────────────────────────── FECHAR O MÊS ─────────────────────────── */

function FecharMesPanel({ params }: { params: PricingParams }) {
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

/* ─────────────────────────── CATÁLOGO & PARÂMETROS ─────────────────────────── */

function ParamsEditor({
  params,
  setParams,
  catalog,
  setCatalog,
  onReset,
}: {
  params: PricingParams
  setParams: (p: PricingParams) => void
  catalog: CatItem[]
  setCatalog: (c: CatItem[]) => void
  onReset: () => void
}) {
  const [novo, setNovo] = useState('')

  function upRow(key: string, patch: Partial<CatItem>) {
    setCatalog(catalog.map((c) => (c.key === key ? { ...c, ...patch } : c)))
  }
  function addRow() {
    const label = novo.trim()
    if (!label) return
    const key = label.toLowerCase()
    if (catalog.some((c) => c.key === key)) return
    setCatalog([...catalog, { key, label, vagas: 0.5, preco: undefined }])
    setNovo('')
  }

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
        Catálogo — produto · vagas (esforço) · preço de tabela
      </p>
      <div className="grid grid-cols-[1fr_64px_92px_28px] gap-2 mb-1 px-1">
        {['Produto', 'Vagas', 'Preço', ''].map((h, i) => (
          <span key={i} className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#9B9B9B' }}>
            {h}
          </span>
        ))}
      </div>
      <div className="flex flex-col gap-1.5">
        {catalog.map((c) => (
          <div key={c.key} className="grid grid-cols-[1fr_64px_92px_28px] gap-2 items-center">
            <input
              value={c.label}
              onChange={(e) => upRow(c.key, { label: e.target.value })}
              className="text-[12.5px] px-2.5 py-1.5 rounded-lg outline-none"
              style={{ background: '#F4F3EF', border: '1px solid #E6E6E1', color: '#141414' }}
            />
            <input
              type="text"
              inputMode="decimal"
              value={String(c.vagas)}
              onChange={(e) => upRow(c.key, { vagas: num(e.target.value) })}
              className="text-[12.5px] text-center px-2 py-1.5 rounded-lg outline-none tabular-nums"
              style={{ background: '#F4F3EF', border: '1px solid #E6E6E1', color: '#141414' }}
            />
            <input
              type="text"
              inputMode="decimal"
              value={c.preco != null ? String(c.preco) : ''}
              placeholder={c.interno ? 'interno' : '—'}
              onChange={(e) => {
                const t = e.target.value.trim()
                upRow(c.key, { preco: t === '' ? undefined : num(t) })
              }}
              className="text-[12.5px] text-center px-2 py-1.5 rounded-lg outline-none tabular-nums"
              style={{ background: '#F4F3EF', border: '1px solid #E6E6E1', color: '#141414' }}
            />
            <button
              onClick={() => setCatalog(catalog.length > 1 ? catalog.filter((x) => x.key !== c.key) : catalog)}
              className="p-1 rounded hover:bg-[#FBE0E0]"
              style={{ color: '#C86B6B' }}
              title="Remover"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-3">
        <input
          value={novo}
          onChange={(e) => setNovo(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addRow()}
          placeholder="Novo produto (ex: E-mail marketing)"
          className="flex-1 text-[12px] px-3 py-2 rounded-lg outline-none"
          style={{ background: '#F4F3EF', border: '1px solid #E6E6E1', color: '#141414' }}
        />
        <button onClick={addRow} className="text-[12px] font-bold px-3 py-2 rounded-lg" style={{ background: '#141414', color: '#D6F23C' }}>
          Adicionar produto
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
