'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { mockProposal } from '@/lib/mockData'
import { proposalStore } from '@/lib/proposalStore'
import {
  getPlansForScope,
  LP_CONFIGS,
  SITE_PAGES,
  LpConfig,
  SitePages,
} from '@/lib/scopeTemplates'
import { Plan, Proposal, ProjectType, Currency } from '@/lib/types'
import {
  CURRENCIES,
  CURRENCY_OPTIONS,
  DEFAULT_RATES,
  currencySymbol,
  formatMoney,
} from '@/lib/format'
import { Eye, Copy, Check, ArrowLeft, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { ImageUpload } from './ImageUpload'

/* ── style helpers ───────────────────────────────────── */

const INPUT =
  'w-full bg-[#F4F3EF] border border-[#DFE0DB] rounded-xl px-4 py-3 text-sm text-[#162322] placeholder-[#A8B5B0] focus:outline-none focus:border-[#0D3839] transition-colors'

const LABEL =
  'block text-[10px] font-bold uppercase tracking-[0.13em] text-[#8AA09A] mb-1.5'

function Field({ label, children, span2 = false }: { label: React.ReactNode; children: React.ReactNode; span2?: boolean }) {
  return (
    <div className={span2 ? 'sm:col-span-2' : ''}>
      <label className={LABEL}>{label}</label>
      {children}
    </div>
  )
}

function SectionCard({ step, title, desc, children }: { step: string; title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E6E6E1] p-8 mb-4">
      <div className="flex items-start gap-4 mb-7">
        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold"
          style={{ background: '#0D3839', color: '#F4F99D' }}>
          {step}
        </div>
        <div>
          <p className="text-[15px] font-bold text-[#162322] tracking-tight">{title}</p>
          <p className="text-xs text-[#8AA09A] mt-0.5">{desc}</p>
        </div>
      </div>
      {children}
    </div>
  )
}

/* ── scope selector ──────────────────────────────────── */

const SCOPE_TYPES: { value: ProjectType; label: string; desc: string }[] = [
  { value: 'landing_page',   label: 'Landing Page',          desc: 'Uma página focada em conversão' },
  { value: 'site_completo',  label: 'Site Completo',         desc: 'Múltiplas páginas e seções' },
  { value: 'mensal',         label: 'Mensal',                desc: 'Gestão recorrente' },
  { value: 'posicionamento', label: 'Posicionamento online', desc: 'Estratégia, identidade e presença digital' },
  { value: 'custom',         label: 'Custom',                desc: 'Escopo personalizado' },
]

/* ── plan editor ─────────────────────────────────────── */

function PlanEditor({
  plan,
  index,
  onChange,
  onToggleRecommended,
  onRemove,
  expandedScope = false,
  currency = 'BRL',
  exchangeRate = 1,
  onCurrencyChange,
}: {
  plan: Plan
  index: number
  onChange: (id: string, field: keyof Plan, value: unknown) => void
  onToggleRecommended: (id: string) => void
  onRemove?: (id: string) => void
  expandedScope?: boolean
  currency?: Currency
  exchangeRate?: number
  onCurrencyChange: (c: Currency) => void
}) {
  const [open, setOpen] = useState(index === 0)

  return (
    <div
      className="rounded-xl border transition-all"
      style={{
        borderColor: plan.is_recommended ? '#0D3839' : '#E6E6E1',
        background: plan.is_recommended ? '#F4FAF8' : '#FAFAF8',
      }}
    >
      {/* header */}
      <button
        type="button"
        className="w-full flex items-center justify-between p-5 text-left"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
            style={{ background: '#0D3839', color: '#F4F99D' }}>
            {index + 1}
          </div>
          <div>
            <p className="text-[13px] font-bold text-[#162322]">{plan.name}</p>
            <p className="text-[11px] text-[#8AA09A]">{plan.tagline}</p>
          </div>
          {plan.is_recommended && (
            <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
              style={{ background: '#F4F99D', color: '#162322' }}>
              Recomendado
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          {/* toggle recommended */}
          <div className="flex items-center gap-2" onClick={e => { e.stopPropagation(); onToggleRecommended(plan.id) }}>
            <span className="text-[11px] text-[#8AA09A]">Recomendar</span>
            <div className="w-9 h-5 rounded-full relative transition-colors"
              style={{ background: plan.is_recommended ? '#0D3839' : '#DFE0DB' }}>
              <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all"
                style={{ left: plan.is_recommended ? '18px' : '2px' }} />
            </div>
          </div>
          {onRemove && (
            <span
              role="button"
              tabIndex={0}
              onClick={e => { e.stopPropagation(); onRemove(plan.id) }}
              className="text-[#8AA09A] hover:text-[#B83B3B] transition-colors p-1 -m-1"
              aria-label="Remover plano"
            >
              <Trash2 size={14} />
            </span>
          )}
          <ChevronRight size={14} className="text-[#8AA09A] transition-transform"
            style={{ transform: open ? 'rotate(90deg)' : 'none' }} />
        </div>
      </button>

      {/* fields */}
      {open && (
        <div className="px-5 pb-5 border-t border-[#E6E6E1] pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <Field label="Nome do plano">
              <input className={INPUT} value={plan.name}
                onChange={e => onChange(plan.id, 'name', e.target.value)} />
            </Field>
            <Field label="Tagline">
              <input className={INPUT} value={plan.tagline}
                onChange={e => onChange(plan.id, 'tagline', e.target.value)} />
            </Field>
            <Field label="Descrição" span2>
              <textarea className={`${INPUT} resize-none`} rows={3} value={plan.description}
                onChange={e => onChange(plan.id, 'description', e.target.value)} />
            </Field>
          </div>
          {/* seletor de cifrão — moeda única da proposta */}
          <div className="mb-4">
            <label className={LABEL}>Cifrão exibido ao cliente</label>
            <div className="flex gap-2">
              {CURRENCY_OPTIONS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => onCurrencyChange(c)}
                  className="flex-1 rounded-xl px-3 py-2.5 text-center text-[12px] font-bold transition-all"
                  style={{
                    background: currency === c ? '#0D3839' : '#F4F3EF',
                    border: `1px solid ${currency === c ? '#0D3839' : '#DFE0DB'}`,
                    color: currency === c ? '#FFFFFF' : '#162322',
                  }}
                >
                  {CURRENCIES[c].symbol} {c}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-[#8AA09A] mt-1.5">
              Vale para a proposta toda. Os valores abaixo são sempre em reais.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <Field label="Valor à vista (R$)">
              <input className={INPUT} type="number" value={plan.price_cash}
                onChange={e => onChange(plan.id, 'price_cash', Number(e.target.value))} />
            </Field>
            <Field label="Nº parcelas">
              <input className={INPUT} type="number" value={plan.price_installments_count}
                onChange={e => onChange(plan.id, 'price_installments_count', Number(e.target.value))} />
            </Field>
            <Field label={
              <span className="flex items-center gap-1.5">
                Valor parcela (R$)
                {Math.round((plan.price_cash || 0) / Math.max(1, plan.price_installments_count || 1)) === plan.price_installment_value && (
                  <span
                    className="text-[8px] font-bold uppercase tracking-wider px-1 py-0.5 rounded"
                    style={{ background: '#E0F2FE', color: '#0EA5E9' }}
                    title="Calculado automaticamente. Você pode editar pra incluir juros."
                  >
                    auto
                  </span>
                )}
              </span>
            }>
              <input className={INPUT} type="number" value={plan.price_installment_value}
                onChange={e => onChange(plan.id, 'price_installment_value', Number(e.target.value))} />
              {plan.price_installments_count > 0 && plan.price_installment_value > 0 && (
                <p className="text-[10px] mt-1" style={{ color: '#8AA09A' }}>
                  Total: {formatMoney(
                    plan.price_installment_value * plan.price_installments_count,
                    currency,
                    exchangeRate
                  )}
                  {plan.price_cash > 0 &&
                    plan.price_installment_value * plan.price_installments_count > plan.price_cash &&
                    (() => {
                      const diff = plan.price_installment_value * plan.price_installments_count - plan.price_cash
                      const pct = Math.round((diff / plan.price_cash) * 100)
                      return (
                        <span style={{ color: pct > 0 ? '#C2410C' : '#22C55E' }}>
                          {' '}(+{pct}% vs à vista)
                        </span>
                      )
                    })()}
                </p>
              )}
            </Field>
            <Field label="Prazo (dias úteis)">
              <input className={INPUT} type="number" value={plan.delivery_days}
                onChange={e => onChange(plan.id, 'delivery_days', Number(e.target.value))} />
            </Field>
          </div>
          {currency !== 'BRL' && (
            <div className="-mt-1 mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-[#F4FAF8] px-3 py-2 text-[11px]">
              <span className="font-bold uppercase tracking-wide text-[#8AA09A]">
                Cliente vê:
              </span>
              <span className="font-bold text-[#0D3839]">
                {formatMoney(plan.price_cash, currency, exchangeRate)} à vista
              </span>
              {plan.price_installments_count > 0 && (
                <span className="text-[#8AA09A]">
                  · {plan.price_installments_count}× de{' '}
                  {formatMoney(plan.price_installment_value, currency, exchangeRate)}
                </span>
              )}
            </div>
          )}
          <div className="mb-4">
            <Field label="Texto do prazo (prefixo)">
              <input
                className={INPUT}
                value={plan.delivery_label ?? ''}
                onChange={e => onChange(plan.id, 'delivery_label', e.target.value)}
                placeholder="Primeira versão em"
              />
              <p className="text-[10px] text-[#8AA09A] mt-1.5">
                Aparece antes do nº de dias. Ex.: &quot;Prazo total de&quot;, &quot;Entrega em&quot;, &quot;Projeto pronto em&quot;.
              </p>
            </Field>
          </div>
          {/* features */}
          <div>
            <label className={LABEL}>
              {expandedScope ? 'Escopo detalhado (um item por linha)' : 'Itens inclusos (um por linha)'}
            </label>
            <textarea
              className={`${INPUT} ${expandedScope ? 'resize-y' : 'resize-none'}`}
              rows={expandedScope ? Math.max(plan.features.length + 4, 14) : plan.features.length + 1}
              style={expandedScope ? { minHeight: 340 } : undefined}
              placeholder={
                expandedScope
                  ? 'Estratégia:\nSEO técnico inicial\nEstrutura amigável para indexação\n\nPáginas principais:\nHome\nEmpresa\nPortfólio'
                  : undefined
              }
              value={plan.features.join('\n')}
              onChange={e =>
                onChange(plan.id, 'features', e.target.value.split('\n').filter(Boolean))
              }
            />
            <p className="text-[10px] text-[#8AA09A] mt-1.5">
              Dica: termine uma linha com <strong>:</strong> para virar título de seção (sem check).
            </p>
          </div>
          <div className="mt-4">
            <Field label="Frase de destaque">
              <input className={INPUT} value={plan.highlight_phrase}
                onChange={e => onChange(plan.id, 'highlight_phrase', e.target.value)} />
            </Field>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── main form ───────────────────────────────────────── */

interface ProposalFormProps {
  initial?: Proposal
  mode: 'new' | 'edit'
}

const defaultForm = {
  client_name: '',
  client_email: '',
  client_company: '',
  client_whatsapp: '',
  project_type: 'landing_page' as ProjectType,
  hero_title: 'Proposta Landing Page',
  hero_subtitle: 'Além do design comum.',
  hero_description: mockProposal.hero_description,
  valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  currency: 'BRL' as Currency,
  exchange_rate: 1,
}

export default function ProposalForm({ initial, mode }: ProposalFormProps) {
  const router = useRouter()

  const [form, setForm] = useState(
    initial
      ? {
          client_name:     initial.client_name,
          client_email:    initial.client_email,
          client_company:  initial.client_company ?? '',
          client_whatsapp: initial.client_whatsapp ?? '',
          project_type:    initial.project_type,
          hero_title:      initial.hero_title,
          hero_subtitle:   initial.hero_subtitle,
          hero_description:initial.hero_description,
          valid_until:     initial.valid_until.slice(0, 10),
          currency:        initial.currency ?? ('BRL' as Currency),
          exchange_rate:   initial.exchange_rate ?? 1,
        }
      : defaultForm
  )

  const [lpConfig, setLpConfig] = useState<LpConfig>('sem_copy_com_copy')
  const [sitePages, setSitePages] = useState<SitePages>('3-5')
  const [plans, setPlans] = useState<Plan[]>(
    initial?.selected_plans ?? getPlansForScope('landing_page', 'sem_copy_com_copy')
  )
  const [photoUrl, setPhotoUrl] = useState(
    initial?.agency_settings.photo_url ?? mockProposal.agency_settings.photo_url
  )
  const [copied, setCopied] = useState(false)

  // when scope type changes, refresh plans with template
  function handleScopeType(type: ProjectType) {
    setForm(f => ({ ...f, project_type: type }))
    setPlans(getPlansForScope(type, lpConfig, sitePages))
  }

  function handleLpConfig(cfg: LpConfig) {
    setLpConfig(cfg)
    setPlans(getPlansForScope('landing_page', cfg, sitePages))
  }

  function handleSitePages(pages: SitePages) {
    setSitePages(pages)
    setPlans(getPlansForScope('site_completo', lpConfig, pages))
  }

  function handleCurrency(c: Currency) {
    setForm(f => ({
      ...f,
      currency: c,
      // ao trocar de moeda, sugere uma taxa de câmbio padrão
      exchange_rate: c === f.currency ? f.exchange_rate : DEFAULT_RATES[c],
    }))
  }

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))

  const updatePlan = (id: string, field: keyof Plan, value: unknown) =>
    setPlans(prev =>
      prev.map(p => {
        if (p.id !== id) return p
        const next = { ...p, [field]: value } as Plan
        // Auto-calcula valor da parcela quando muda cash OU count.
        // Fórmula: round(cash / count). Usuário ainda pode editar
        // a parcela manualmente depois — mas se mexer em cash/count
        // de novo, sobrescreve. Predicabilidade > teimosia.
        if (field === 'price_cash' || field === 'price_installments_count') {
          const cash = Number(next.price_cash) || 0
          const count = Number(next.price_installments_count) || 0
          next.price_installment_value = count > 0 ? Math.round(cash / count) : 0
        }
        return next
      })
    )

  const setRecommended = (id: string) =>
    setPlans(prev => prev.map(p => ({ ...p, is_recommended: p.id === id ? !p.is_recommended : false })))

  const addPlan = () =>
    setPlans(prev => [
      ...prev,
      {
        id: `tpl_${Date.now()}`,
        name: 'Novo plano',
        tagline: '',
        description: '',
        delivery_days: 7,
        price_cash: 0,
        price_installments_count: 6,
        price_installment_value: 0,
        highlight_phrase: '',
        features: [],
      },
    ])

  const removePlan = (id: string) =>
    setPlans(prev => (prev.length > 1 ? prev.filter(p => p.id !== id) : prev))

  function buildProposal(): Proposal {
    const base = initial ?? mockProposal
    return {
      ...base,
      ...form,
      id: initial?.id ?? '',
      slug: initial?.slug ?? '',
      valid_until: new Date(form.valid_until + 'T23:59:00').toISOString(),
      selected_plans: plans,
      status: initial?.status ?? 'draft',
      agency_settings: {
        ...base.agency_settings,
        photo_url: photoUrl,
      },
    }
  }

  async function handleSave() {
    try {
      await proposalStore.save(buildProposal())
      router.push('/admin')
    } catch (err) {
      console.error('[handleSave]', err)
      alert('Erro ao salvar a proposta. Veja o console.')
    }
  }

  function handlePreview() {
    localStorage.setItem('fysi_draft', JSON.stringify(buildProposal()))
    window.open('/p/preview', '_blank')
  }

  async function handleCopy() {
    localStorage.setItem('fysi_draft', JSON.stringify(buildProposal()))
    await navigator.clipboard.writeText(`${window.location.origin}/p/preview`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2200)
  }

  const done1 = !!(form.client_name && form.client_email)
  const done2 = !!(form.hero_title && form.hero_subtitle)
  const done3 = plans.length > 0
  const completedCount = [done1, done2, done3].filter(Boolean).length

  return (
    <div className="min-h-screen" style={{ background: '#ECEAE3', fontFamily: 'var(--font-inter)' }}>
      {/* top bar */}
      <div style={{ borderBottom: '1px solid #DFE0DB', background: '#ECEAE3' }}>
        <div className="max-w-5xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <button
            onClick={() => router.push('/admin')}
            className="flex items-center gap-2 text-[11px] font-semibold text-[#8AA09A] hover:text-[#0D3839] transition-colors"
          >
            <ArrowLeft size={13} />
            Voltar ao painel
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full" style={{ background: '#0D3839' }} />
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8AA09A]">
              Fysi Lab Digital
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-32 pt-6 sm:pt-10">
        {/* header */}
        <div className="mb-10">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#A8B5B0] mb-2">
            {mode === 'new' ? 'NOVA PROPOSTA' : 'EDITAR PROPOSTA'}
          </p>
          <h1 className="text-[2rem] font-bold text-[#162322] tracking-tight">
            {mode === 'new' ? 'Criar proposta' : form.client_name || 'Editar proposta'}
          </h1>
        </div>

        {/* ── SEÇÃO 0: Escopo ── */}
        <SectionCard step="◈" title="Escopo da proposta" desc="Define quais planos serão apresentados ao cliente">
          {/* scope type */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 mb-6">
            {SCOPE_TYPES.map((s, i) => {
              const active = form.project_type === s.value
              return (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => handleScopeType(s.value)}
                  className="relative rounded-xl px-4 py-5 text-left transition-all hover:-translate-y-0.5"
                  style={{
                    background: active ? '#0D3839' : '#FFFFFF',
                    border: `1px solid ${active ? '#0D3839' : '#E6E6E1'}`,
                    color: active ? '#FFFFFF' : '#162322',
                    boxShadow: active
                      ? '0 8px 24px rgba(13,56,57,0.18)'
                      : '0 1px 2px rgba(0,0,0,0.02)',
                  }}
                >
                  {/* eyebrow numerado pra dar hierarquia premium */}
                  <span
                    className="text-[9px] font-bold uppercase tracking-[0.18em] block mb-2"
                    style={{ color: active ? '#F4F99D' : '#A8B5B0' }}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <p className="text-[14px] font-semibold leading-tight">{s.label}</p>
                  <p
                    className="text-[11px] mt-1.5 leading-snug"
                    style={{ color: active ? '#8BB7AF' : '#8AA09A' }}
                  >
                    {s.desc}
                  </p>
                </button>
              )
            })}
          </div>

          {/* lp config */}
          {form.project_type === 'landing_page' && (
            <div>
              <p className={LABEL}>Configuração dos planos</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {LP_CONFIGS.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => handleLpConfig(c.value)}
                    className="rounded-xl px-4 py-3 text-left transition-all"
                    style={{
                      background: lpConfig === c.value ? '#F4FAF8' : '#F4F3EF',
                      border: `1px solid ${lpConfig === c.value ? '#0D3839' : '#DFE0DB'}`,
                    }}
                  >
                    <p className="text-[12px] font-bold text-[#162322]">{c.label}</p>
                    <p className="text-[10px] text-[#8AA09A] mt-0.5">{c.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* site pages */}
          {form.project_type === 'site_completo' && (
            <div>
              <p className={LABEL}>Número de páginas</p>
              <div className="grid grid-cols-3 gap-2">
                {SITE_PAGES.map(s => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => handleSitePages(s.value)}
                    className="rounded-xl px-4 py-3 text-left transition-all"
                    style={{
                      background: sitePages === s.value ? '#F4FAF8' : '#F4F3EF',
                      border: `1px solid ${sitePages === s.value ? '#0D3839' : '#DFE0DB'}`,
                    }}
                  >
                    <p className="text-[12px] font-bold text-[#162322]">{s.label}</p>
                    <p className="text-[10px] text-[#8AA09A] mt-0.5">{s.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* plans preview chips */}
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="text-[10px] text-[#8AA09A] self-center">Planos:</span>
            {plans.map(p => (
              <span key={p.id}
                className="text-[10px] font-semibold px-3 py-1 rounded-full"
                style={{
                  background: p.is_recommended ? '#F4F99D' : '#E8E7E1',
                  color: '#162322',
                }}>
                {p.name}
                {p.is_recommended && ' ★'}
              </span>
            ))}
          </div>
        </SectionCard>

        {/* ── SEÇÃO 1: Cliente ── */}
        <SectionCard step="1" title="Dados do Cliente" desc="Informações básicas que identificam o cliente na proposta">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Nome completo">
              <input className={INPUT} value={form.client_name} onChange={set('client_name')}
                placeholder="Dr. Rodrigo Mendes" />
            </Field>
            <Field label="Email">
              <input className={INPUT} type="email" value={form.client_email} onChange={set('client_email')}
                placeholder="cliente@email.com" />
            </Field>
            <Field label="Empresa / Clínica">
              <input className={INPUT} value={form.client_company} onChange={set('client_company')}
                placeholder="Clínica Mendes" />
            </Field>
            <Field label="WhatsApp (com DDI)">
              <input className={INPUT} value={form.client_whatsapp} onChange={set('client_whatsapp')}
                placeholder="5511999999999" />
            </Field>
          </div>
        </SectionCard>

        {/* ── SEÇÃO 2: Conteúdo ── */}
        <SectionCard step="2" title="Conteúdo da Proposta" desc="Textos que aparecem no hero da proposta do cliente">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Badge do hero">
              <input className={INPUT} value={form.hero_title} onChange={set('hero_title')}
                placeholder="Proposta Landing Page" />
            </Field>
            <Field label="Válido até">
              <input className={INPUT} type="date" value={form.valid_until} onChange={set('valid_until')} />
            </Field>
            <Field label="Título principal" span2>
              <input className={INPUT} value={form.hero_subtitle} onChange={set('hero_subtitle')}
                placeholder="Além do design comum." />
            </Field>
            <Field label="Descrição" span2>
              <textarea className={`${INPUT} resize-none`} rows={4} value={form.hero_description}
                onChange={set('hero_description')} />
            </Field>
          </div>
        </SectionCard>

        {/* ── SEÇÃO 3: Imagens ── */}
        <SectionCard step="3" title="Imagens" desc="Sua foto de perfil para a proposta">
          <ImageUpload
            label="Sua foto"
            value={photoUrl}
            onChange={setPhotoUrl}
            folder=""
            hint="Proporção 3×4 recomendada"
            aspect="3/4"
          />
        </SectionCard>

        {/* ── SEÇÃO 4: Planos ── */}
        <SectionCard step="4" title="Planos e Investimento" desc="Ajuste preços, prazos e itens de cada plano">
          {/* moeda + câmbio */}
          <div className="mb-5 rounded-xl border border-[#E6E6E1] bg-[#FAFAF8] p-5">
            <p className={LABEL}>Moeda exibida ao cliente</p>
            <div className="grid grid-cols-3 gap-2">
              {CURRENCY_OPTIONS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => handleCurrency(c)}
                  className="rounded-xl px-4 py-3 text-center transition-all"
                  style={{
                    background: form.currency === c ? '#0D3839' : '#F4F3EF',
                    border: `1px solid ${form.currency === c ? '#0D3839' : '#DFE0DB'}`,
                    color: form.currency === c ? '#FFFFFF' : '#162322',
                  }}
                >
                  <p className="text-[12px] font-bold">{CURRENCIES[c].label}</p>
                </button>
              ))}
            </div>

            {form.currency !== 'BRL' && (
              <div className="mt-4">
                <Field label={`Câmbio — quanto vale 1 ${currencySymbol(form.currency)} em reais`}>
                  <input
                    className={INPUT}
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.exchange_rate}
                    onChange={e =>
                      setForm(f => ({ ...f, exchange_rate: Number(e.target.value) }))
                    }
                  />
                </Field>
                <p className="text-[10px] text-[#8AA09A] mt-1.5">
                  Ex.: um plano de R$ 2.300 aparece como{' '}
                  <strong style={{ color: '#0D3839' }}>
                    {formatMoney(2300, form.currency, form.exchange_rate)}
                  </strong>{' '}
                  para o cliente.
                </p>
              </div>
            )}

            <p className="text-[10px] text-[#8AA09A] mt-3">
              Os valores abaixo são sempre digitados em reais. A moeda escolhida
              converte automaticamente o que o cliente vê na proposta.
            </p>
          </div>

          <div className="space-y-3">
            {plans.map((plan, i) => (
              <PlanEditor
                key={plan.id}
                plan={plan}
                index={i}
                onChange={updatePlan}
                onToggleRecommended={setRecommended}
                onRemove={form.project_type === 'custom' && plans.length > 1 ? removePlan : undefined}
                expandedScope={form.project_type === 'custom'}
                currency={form.currency}
                exchangeRate={form.exchange_rate}
                onCurrencyChange={handleCurrency}
              />
            ))}
          </div>

          {form.project_type === 'custom' && plans.length < 3 && (
            <button
              type="button"
              onClick={addPlan}
              className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed text-[12px] font-semibold transition-colors hover:bg-[#F4FAF8]"
              style={{ borderColor: '#0D3839', color: '#0D3839', background: '#FAFAF8' }}
            >
              <Plus size={14} />
              Adicionar outro plano
            </button>
          )}
        </SectionCard>
      </div>

      {/* ── sticky bar ── */}
      <div className="fixed bottom-0 left-0 right-0 px-6 pb-6 pt-2 pointer-events-none">
        <div
          className="max-w-5xl mx-auto rounded-2xl px-5 py-4 flex flex-wrap items-center justify-between gap-3 pointer-events-auto"
          style={{ background: '#162322', boxShadow: '0 8px 40px rgba(0,0,0,0.25)' }}
        >
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-white leading-snug truncate">
              {form.client_name || 'Sem cliente'}
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: '#6BA89E' }}>
              {completedCount}/3 seções · válida até{' '}
              {form.valid_until
                ? new Date(form.valid_until + 'T12:00:00').toLocaleDateString('pt-BR')
                : '—'}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-semibold transition-all"
              style={{ background: 'rgba(255,255,255,0.07)', color: '#8BB7AF', border: '1px solid rgba(255,255,255,0.07)' }}>
              {copied ? <Check size={12} /> : <Copy size={12} />}
              <span className="hidden sm:inline">{copied ? 'Copiado!' : 'Copiar link'}</span>
            </button>
            <button onClick={handlePreview}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-semibold transition-all"
              style={{ background: 'rgba(255,255,255,0.07)', color: '#8BB7AF', border: '1px solid rgba(255,255,255,0.07)' }}>
              <Eye size={12} />
              <span className="hidden sm:inline">Prévia</span>
            </button>
            <button onClick={handleSave}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wide transition-all hover:opacity-90 active:scale-95"
              style={{ background: '#F4F99D', color: '#162322' }}>
              {mode === 'new' ? 'Salvar proposta' : 'Salvar alterações'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
