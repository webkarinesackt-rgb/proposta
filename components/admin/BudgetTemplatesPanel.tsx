'use client'

import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, X, Search, Pencil, Calculator, Copy, Check } from 'lucide-react'
import {
  budgetStore,
  BudgetTemplate,
  BudgetItem,
  BudgetTableMissingError,
} from '@/lib/budgetStore'
import { useToast } from '@/lib/useToast'

const CATEGORIES = [
  'Landing Page',
  'Site Completo',
  'Social Media',
  'Tráfego pago',
  'Identidade visual',
  'Posicionamento',
  'Outro',
]

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}
function totalOf(t: BudgetTemplate) {
  return t.items.reduce((s, i) => s + (Number(i.price) || 0), 0)
}

export default function BudgetTemplatesPanel() {
  const [templates, setTemplates] = useState<BudgetTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [needsSetup, setNeedsSetup] = useState(false)
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<BudgetTemplate | null>(null)
  const [showCalc, setShowCalc] = useState(false)
  const { show: showToast, Toast } = useToast()

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      setTemplates(await budgetStore.getAll())
      setNeedsSetup(false)
    } catch (e) {
      if (e instanceof BudgetTableMissingError) setNeedsSetup(true)
    } finally {
      setLoading(false)
    }
  }

  async function save(draft: BudgetTemplate) {
    try {
      if (draft.id) {
        await budgetStore.update(draft.id, {
          name: draft.name,
          category: draft.category,
          items: draft.items,
        })
        setTemplates((ts) => ts.map((t) => (t.id === draft.id ? draft : t)))
      } else {
        const created = await budgetStore.create({
          name: draft.name,
          category: draft.category,
          items: draft.items,
        })
        setTemplates((ts) => [...ts, created])
      }
      setEditing(null)
      showToast('Orçamento base salvo ✓')
    } catch (e) {
      if (e instanceof BudgetTableMissingError) setNeedsSetup(true)
      else showToast('Erro ao salvar', { kind: 'error' })
    }
  }

  async function remove(id: string) {
    if (!confirm('Excluir este orçamento base?')) return
    setTemplates((ts) => ts.filter((t) => t.id !== id))
    try {
      await budgetStore.remove(id)
    } catch {
      showToast('Erro ao excluir', { kind: 'error' })
    }
  }

  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = templates.filter((t) =>
      !q ? true : [t.name, t.category, ...t.items.map((i) => i.name)].join(' ').toLowerCase().includes(q),
    )
    const m = new Map<string, BudgetTemplate[]>()
    for (const t of list) {
      const k = t.category || 'Sem categoria'
      if (!m.has(k)) m.set(k, [])
      m.get(k)!.push(t)
    }
    return [...m.entries()]
  }, [templates, search])

  return (
    <div>
      <Toast />
      {/* barra de ações */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <div className="relative flex-1 max-w-[320px] min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#A8B5B0' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar orçamento base…"
            className="w-full text-[13px] pl-9 pr-3 py-2 rounded-lg outline-none"
            style={{ background: '#FFFFFF', border: '1px solid #E6E6E1', color: '#141414' }}
          />
        </div>
        <button
          onClick={() => setShowCalc(true)}
          className="ml-auto flex items-center gap-1.5 text-[12px] font-bold px-3.5 py-2 rounded-lg transition-colors"
          style={{ background: '#FFFFFF', color: '#141414', border: '1px solid #E6E6E1' }}
        >
          <Calculator size={14} /> Calculadora
        </button>
        <button
          onClick={() => setEditing({ id: '', name: '', category: 'Landing Page', items: [] })}
          className="flex items-center gap-1.5 text-[12px] font-bold px-3.5 py-2 rounded-lg transition-opacity hover:opacity-90"
          style={{ background: '#141414', color: '#D6F23C' }}
        >
          <Plus size={14} /> Novo orçamento base
        </button>
      </div>

      {needsSetup ? (
        <SetupBanner onRetry={load} />
      ) : loading ? (
        <p className="text-[13px] text-center py-16" style={{ color: '#A8B5B0' }}>Carregando…</p>
      ) : templates.length === 0 ? (
        <div className="text-center py-16 rounded-2xl" style={{ background: '#FFFFFF', border: '1px dashed #D8D8D0' }}>
          <p className="text-[14px] font-semibold" style={{ color: '#141414' }}>
            Nenhum orçamento base ainda.
          </p>
          <p className="text-[12px] mt-1" style={{ color: '#9B9B9B' }}>
            Crie modelos por tipo de projeto pra puxar direto na proposta.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {grouped.map(([cat, items]) => (
            <div key={cat}>
              <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: '#9B9B9B' }}>
                {cat}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {items.map((t) => (
                  <div key={t.id} className="rounded-2xl p-4 group" style={{ background: '#FFFFFF', border: '1px solid #E6E6E1' }}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[14px] font-bold" style={{ color: '#141414' }}>
                        {t.name || '(sem nome)'}
                      </p>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <button onClick={() => setEditing(t)} title="Editar" className="p-1 rounded hover:bg-[#F4F3EF]" style={{ color: '#6E6E6E' }}>
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => remove(t.id)} title="Excluir" className="p-1 rounded hover:bg-[#FBE0E0]" style={{ color: '#C86B6B' }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-col gap-1">
                      {t.items.slice(0, 4).map((i) => (
                        <div key={i.id} className="flex items-center justify-between text-[12px]">
                          <span style={{ color: '#6E6E6E' }} className="truncate pr-2">{i.name}</span>
                          <span style={{ color: '#141414' }} className="font-semibold whitespace-nowrap">{fmtBRL(Number(i.price) || 0)}</span>
                        </div>
                      ))}
                      {t.items.length > 4 && (
                        <span className="text-[11px]" style={{ color: '#A8B5B0' }}>+{t.items.length - 4} serviço(s)</span>
                      )}
                    </div>
                    <div className="mt-3 pt-2 flex items-center justify-between" style={{ borderTop: '1px solid #F0F0EC' }}>
                      <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#9B9B9B' }}>Total</span>
                      <span className="text-[15px] font-bold" style={{ color: '#141414' }}>{fmtBRL(totalOf(t))}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <TemplateEditor
          template={editing}
          onClose={() => setEditing(null)}
          onSave={save}
        />
      )}
      {showCalc && (
        <CalculatorModal templates={templates} onClose={() => setShowCalc(false)} onCopied={() => showToast('Orçamento copiado ✓')} />
      )}
    </div>
  )
}

/* ── calculadora de orçamento ─────────────────────────── */

// juros de parcelamento no cartão (composto, tabela Price) — igual à proposta
function installmentValue(cash: number, count: number, rate = 0.0399): number {
  if (count <= 0) return 0
  if (rate <= 0) return Math.round(cash / count)
  const f = Math.pow(1 + rate, count)
  return Math.round((cash * (rate * f)) / (f - 1))
}

function CalculatorModal({
  templates,
  onClose,
  onCopied,
}: {
  templates: BudgetTemplate[]
  onClose: () => void
  onCopied: () => void
}) {
  const [items, setItems] = useState<BudgetItem[]>([
    { id: 'c1', name: '', subtitle: '', price: 0 },
  ])
  const [parcelas, setParcelas] = useState(6)
  const [copied, setCopied] = useState(false)
  const total = items.reduce((s, i) => s + (Number(i.price) || 0), 0)
  const parcela = installmentValue(total, parcelas)
  const totalParcelado = parcela * parcelas

  function upd(id: string, field: keyof BudgetItem, v: string | number) {
    setItems((it) => it.map((x) => (x.id === id ? { ...x, [field]: v } : x)))
  }
  function loadTemplate(t: BudgetTemplate) {
    setItems(t.items.length ? t.items.map((i) => ({ ...i })) : [{ id: 'c1', name: '', subtitle: '', price: 0 }])
  }
  function copyText() {
    const lines = items
      .filter((i) => i.name.trim() || i.price)
      .map((i) => `• ${i.name || 'Serviço'} — ${fmtBRL(Number(i.price) || 0)}`)
    const txt =
      `*Orçamento*\n\n${lines.join('\n')}\n\n` +
      `*Total: ${fmtBRL(total)}*` +
      (parcelas > 0 && total > 0 ? `\nou ${parcelas}x de ${fmtBRL(parcela)} no cartão` : '')
    navigator.clipboard.writeText(txt).then(() => {
      setCopied(true)
      onCopied()
      setTimeout(() => setCopied(false), 1500)
    })
  }

  const INPUT_STYLE = { background: '#F4F3EF', border: '1px solid #E6E6E1', color: '#141414' }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose} />
      <div className="relative w-full max-w-[520px] rounded-2xl flex flex-col" style={{ background: '#FFFFFF', maxHeight: '88vh' }}>
        <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid #E6E6E1' }}>
          <span className="text-[14px] font-bold flex items-center gap-1.5" style={{ color: '#141414' }}>
            <Calculator size={15} /> Calculadora de orçamento
          </span>
          <button onClick={onClose} style={{ color: '#A8B5B0' }}><X size={16} /></button>
        </div>
        <div className="p-4 flex flex-col gap-3 overflow-y-auto">
          {templates.length > 0 && (
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#9B9B9B' }}>
                Começar de um modelo (opcional)
              </label>
              <select
                onChange={(e) => {
                  const t = templates.find((x) => x.id === e.target.value)
                  if (t) loadTemplate(t)
                }}
                defaultValue=""
                className="w-full text-[13px] px-3 py-2 rounded-lg outline-none"
                style={INPUT_STYLE}
              >
                <option value="">— escolher modelo —</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name} ({t.category})</option>
                ))}
              </select>
            </div>
          )}

          {items.map((it) => (
            <div key={it.id} className="flex items-center gap-2">
              <input
                value={it.name}
                onChange={(e) => upd(it.id, 'name', e.target.value)}
                placeholder="Serviço"
                className="flex-1 text-[13px] px-3 py-2 rounded-lg outline-none"
                style={INPUT_STYLE}
              />
              <div className="flex items-center gap-1 flex-shrink-0">
                <span className="text-[12px]" style={{ color: '#9B9B9B' }}>R$</span>
                <input
                  type="number"
                  value={it.price || ''}
                  onChange={(e) => upd(it.id, 'price', Number(e.target.value))}
                  className="w-24 text-[13px] px-2 py-2 rounded-lg outline-none"
                  style={INPUT_STYLE}
                />
              </div>
              <button onClick={() => setItems((x) => x.filter((y) => y.id !== it.id))} className="p-2 rounded-lg hover:bg-[#FBE0E0]" style={{ color: '#C86B6B' }}><Trash2 size={13} /></button>
            </div>
          ))}
          <button
            onClick={() => setItems((x) => [...x, { id: 'c' + Date.now(), name: '', subtitle: '', price: 0 }])}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-dashed text-[12px] font-semibold"
            style={{ borderColor: '#141414', color: '#141414', background: '#FAFAF8' }}
          >
            <Plus size={14} /> Adicionar serviço
          </button>

          <div className="flex items-center gap-2">
            <label className="text-[12px]" style={{ color: '#6E6E6E' }}>Parcelas (cartão, 3,99% a.m.):</label>
            <input type="number" min="1" value={parcelas} onChange={(e) => setParcelas(Math.max(1, Number(e.target.value) || 1))} className="w-16 text-[13px] px-2 py-1.5 rounded-lg outline-none" style={INPUT_STYLE} />
          </div>

          <div className="rounded-xl p-4" style={{ background: '#141414' }}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#D6F23C' }}>Total à vista</span>
              <span className="text-[22px] font-bold text-white">{fmtBRL(total)}</span>
            </div>
            {parcelas > 0 && total > 0 && (
              <div className="flex items-center justify-between mt-2 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.12)' }}>
                <span className="text-[12px]" style={{ color: '#9B9B9B' }}>{parcelas}x no cartão</span>
                <span className="text-[14px] font-bold text-white">{fmtBRL(parcela)} <span style={{ color: '#9B9B9B', fontWeight: 400 }}>({fmtBRL(totalParcelado)})</span></span>
              </div>
            )}
          </div>
        </div>
        <div className="px-4 py-3 flex justify-end gap-2" style={{ borderTop: '1px solid #E6E6E1' }}>
          <button onClick={onClose} className="text-[12px] font-semibold px-4 py-2 rounded-lg" style={{ color: '#6E6E6E' }}>Fechar</button>
          <button onClick={copyText} className="flex items-center gap-1.5 text-[12px] font-bold px-4 py-2 rounded-lg" style={{ background: copied ? '#DCF3E4' : '#141414', color: copied ? '#137A3F' : '#D6F23C' }}>
            {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? 'Copiado!' : 'Copiar orçamento'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── editor ───────────────────────────────────────────── */

function TemplateEditor({
  template,
  onClose,
  onSave,
}: {
  template: BudgetTemplate
  onClose: () => void
  onSave: (t: BudgetTemplate) => void
}) {
  const [draft, setDraft] = useState<BudgetTemplate>(template)
  const total = draft.items.reduce((s, i) => s + (Number(i.price) || 0), 0)

  function addItem() {
    setDraft((d) => ({ ...d, items: [...d.items, { id: `bi_${Date.now()}`, name: '', subtitle: '', price: 0 }] }))
  }
  function updItem(id: string, field: keyof BudgetItem, value: string | number) {
    setDraft((d) => ({ ...d, items: d.items.map((i) => (i.id === id ? { ...i, [field]: value } : i)) }))
  }
  function delItem(id: string) {
    setDraft((d) => ({ ...d, items: d.items.filter((i) => i.id !== id) }))
  }

  const INPUT = 'w-full text-[13px] px-3 py-2 rounded-lg outline-none'
  const INPUT_STYLE = { background: '#F4F3EF', border: '1px solid #E6E6E1', color: '#141414' }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose} />
      <div className="relative w-full max-w-[560px] rounded-2xl flex flex-col" style={{ background: '#FFFFFF', maxHeight: '88vh' }}>
        <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid #E6E6E1' }}>
          <span className="text-[14px] font-bold" style={{ color: '#141414' }}>
            {draft.id ? 'Editar' : 'Novo'} orçamento base
          </span>
          <button onClick={onClose} style={{ color: '#A8B5B0' }}><X size={16} /></button>
        </div>
        <div className="p-4 flex flex-col gap-3 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#9B9B9B' }}>Nome do modelo</label>
              <input autoFocus value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Ex: Landing Page Completa" className={INPUT} style={INPUT_STYLE} />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#9B9B9B' }}>Tipo de projeto</label>
              <input list="bud-cats" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} placeholder="Landing, Site, Social…" className={INPUT} style={INPUT_STYLE} />
              <datalist id="bud-cats">{CATEGORIES.map((c) => <option key={c} value={c} />)}</datalist>
            </div>
          </div>

          <label className="block text-[10px] font-bold uppercase tracking-wider mt-1" style={{ color: '#9B9B9B' }}>Serviços (nome · escopo · valor)</label>
          {draft.items.map((it) => (
            <div key={it.id} className="rounded-xl border p-3 flex flex-col gap-2" style={{ borderColor: '#E6E6E1', background: '#FAFAF8' }}>
              <div className="flex items-center gap-2">
                <input value={it.name} onChange={(e) => updItem(it.id, 'name', e.target.value)} placeholder="Serviço (ex: Página de vendas)" className={INPUT} style={INPUT_STYLE} />
                <div className="flex items-center gap-1 flex-shrink-0">
                  <span className="text-[12px]" style={{ color: '#9B9B9B' }}>R$</span>
                  <input type="number" value={it.price} onChange={(e) => updItem(it.id, 'price', Number(e.target.value))} className="text-[13px] px-2 py-2 rounded-lg outline-none w-24" style={INPUT_STYLE} />
                </div>
                <button onClick={() => delItem(it.id)} className="flex-shrink-0 p-2 rounded-lg hover:bg-[#FBE0E0]" style={{ color: '#C86B6B' }}><Trash2 size={13} /></button>
              </div>
              <textarea value={it.subtitle} onChange={(e) => updItem(it.id, 'subtitle', e.target.value)} rows={2} placeholder="Escopo — o que inclui esse serviço" className={INPUT} style={INPUT_STYLE} />
            </div>
          ))}
          <button onClick={addItem} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-dashed text-[12px] font-semibold" style={{ borderColor: '#141414', color: '#141414', background: '#FAFAF8' }}>
            <Plus size={14} /> Adicionar serviço
          </button>
          <div className="rounded-xl p-3 flex items-center justify-between" style={{ background: '#141414' }}>
            <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#D6F23C' }}>Total</span>
            <span className="text-[18px] font-bold text-white">{fmtBRL(total)}</span>
          </div>
        </div>
        <div className="px-4 py-3 flex justify-end gap-2" style={{ borderTop: '1px solid #E6E6E1' }}>
          <button onClick={onClose} className="text-[12px] font-semibold px-4 py-2 rounded-lg" style={{ color: '#6E6E6E' }}>Cancelar</button>
          <button onClick={() => onSave(draft)} disabled={!draft.name.trim()} className="text-[12px] font-bold px-4 py-2 rounded-lg disabled:opacity-50" style={{ background: '#141414', color: '#D6F23C' }}>Salvar</button>
        </div>
      </div>
    </div>
  )
}

/* ── setup banner ─────────────────────────────────────── */

function SetupBanner({ onRetry }: { onRetry: () => void }) {
  const sql = `create table if not exists public.budget_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  category text default '',
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
notify pgrst, 'reload schema';`
  const [copied, setCopied] = useState(false)
  return (
    <div className="max-w-[640px] mt-2 rounded-2xl p-6" style={{ background: '#FFFFFF', border: '1px solid #E6E6E1' }}>
      <p className="text-[15px] font-bold" style={{ color: '#141414' }}>Falta um passo único (30 segundos)</p>
      <p className="text-[13px] mt-1.5 leading-relaxed" style={{ color: '#6E6E6E' }}>
        Pra guardar os orçamentos base, precisamos criar a tabela uma vez. Copie o comando, cole no <b>SQL Editor</b> do Supabase (Run) e clique “Já criei”.
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
