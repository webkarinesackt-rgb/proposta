'use client'

import { useState, type CSSProperties, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import {
  Clock,
  Check,
  ArrowRight,
  PenTool,
  Code2,
  Gauge,
  BarChart3,
  ShieldCheck,
  GraduationCap,
  Sparkles,
  ChevronDown,
} from 'lucide-react'
import { Plan, ProjectType, Currency, PageItem } from '@/lib/types'
import { currencySymbol, convertFromBRL, formatNumber } from '@/lib/format'

// Títulos grandes em Helvetica (visual minimalista) — escopado neste componente
// pra não mexer no display serifado do resto do app.
const HELV = '"Helvetica Neue", Helvetica, Arial, sans-serif'

interface PlansSectionProps {
  plans: Plan[]
  items?: PageItem[]
  onAccept: (planId: string) => void
  projectType?: ProjectType
  currency?: Currency
  exchangeRate?: number
  /** 'section': escopo como seção própria + preço único abaixo (ligado por
   *  proposta em ProposalPage). 'card' (padrão): card do plano + card de preço. */
  scopeLayout?: 'card' | 'section'
}

/* ── bloco de Orçamento: serviços somados (nome · escopo · valor + total) ── */
function OrcamentoBlock({
  items,
  plan,
  onAccept,
  currency,
  exchangeRate,
}: {
  items: PageItem[]
  plan?: Plan
  onAccept: (id: string) => void
  currency: Currency
  exchangeRate: number
}) {
  const symbol = currencySymbol(currency)
  const money = (v: number) => `${symbol} ${formatNumber(convertFromBRL(v, currency, exchangeRate))}`
  const total = items.reduce((s, it) => s + (typeof it.price === 'number' ? it.price : 0), 0)
  const count = plan?.price_installments_count || 0
  const parcela = plan?.price_installment_value || 0
  return (
    <div className="max-w-2xl mx-auto px-4">
      <div
        className="overflow-hidden"
        style={{ borderRadius: 28, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)' }}
      >
        <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          {items.map((it) => (
            <div key={it.id} className="px-6 py-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-bold" style={{ color: 'var(--text-primary)', fontSize: 16 }}>
                  {it.name || 'Serviço'}
                </p>
                {it.subtitle && (
                  <p className="mt-1 leading-snug" style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                    {it.subtitle}
                  </p>
                )}
              </div>
              <p className="font-bold whitespace-nowrap" style={{ color: 'var(--text-primary)', fontSize: 15 }}>
                {money(typeof it.price === 'number' ? it.price : 0)}
              </p>
            </div>
          ))}
        </div>
        {/* total */}
        <div
          className="px-6 py-5 flex items-center justify-between"
          style={{ background: 'rgba(214,242,60,0.08)', borderTop: '1px solid rgba(255,255,255,0.10)' }}
        >
          <div>
            <p className="uppercase tracking-wider font-bold" style={{ color: 'var(--text-secondary)', fontSize: 11 }}>
              Total
            </p>
            {count > 0 && parcela > 0 && (
              <p style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 2 }}>
                ou {count}× de {money(parcela)}
              </p>
            )}
          </div>
          <p className="font-bold" style={{ color: 'var(--text-primary)', fontSize: 28 }}>
            {money(total)}
          </p>
        </div>
      </div>
      {plan && (
        <button
          onClick={() => onAccept(plan.id)}
          className="mt-5 w-full flex items-center justify-center gap-2 font-bold transition-transform hover:-translate-y-0.5"
          style={{ background: '#D6F23C', color: '#141414', borderRadius: 16, padding: '16px 24px', fontSize: 15 }}
        >
          Aceitar proposta <ArrowRight size={18} />
        </button>
      )}
    </div>
  )
}

/* ── Escopo ──
   Faz o parse das features em grupos (linha terminada em ':' = título).
   O grupo de "páginas" vira tiles com contador; os demais viram etapas
   lado a lado — colunas separadas por hairline, todos os itens em chips.
   O olho escaneia colunas, não uma coluna comprida de bullets. */
type ScopeGroup = { title: string; items: string[] }

function parseScope(features: string[]): ScopeGroup[] {
  const groups: ScopeGroup[] = []
  for (const raw of features) {
    const t = raw.trim()
    if (!t) continue
    if (t.endsWith(':') && t.length > 1) {
      groups.push({ title: t.slice(0, -1).trim(), items: [] })
    } else {
      if (!groups.length) groups.push({ title: '', items: [] })
      groups[groups.length - 1].items.push(t)
    }
  }
  return groups
}

/* ícone por grupo: diz o que é antes de a pessoa ler */
function groupIcon(title: string) {
  const t = title.toLowerCase()
  if (/design|estrat/.test(t)) return PenTool
  if (/desenvolv|c[óo]digo|wordpress/.test(t)) return Code2
  if (/seo|performance|velocidade/.test(t)) return Gauge
  if (/medi|analytics|dados|m[ée]trica/.test(t)) return BarChart3
  if (/segur|backup/.test(t)) return ShieldCheck
  if (/entrega|autonomia|suporte|treinamento/.test(t)) return GraduationCap
  return Sparkles
}

const HAIR = '1px solid rgba(184,212,208,0.12)'
const SERIF = '"ivypresto-display", "ivypresto-headline", Georgia, serif'

/* rótulo pequeno em caixa alta — abre cada bloco do escopo */
function Eyebrow({
  children,
  color = 'var(--teal)',
  mb = '0.85rem',
}: {
  children: ReactNode
  color?: string
  mb?: string
}) {
  return (
    <p
      style={{
        fontSize: '0.6rem',
        fontWeight: 700,
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        color,
        marginBottom: mb,
      }}
    >
      {children}
    </p>
  )
}

/* "Home · Sobre · Atacama (17) · …" → tiles com nome + contador */
function PageTiles({ line }: { line: string }) {
  const tiles = line
    .split('·')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const m = s.match(/^(.*?)\s*\((\d+)\)\s*$/)
      return m ? { name: m[1].trim(), count: Number(m[2]) } : { name: s, count: 0 }
    })
  return (
    <div className="flex flex-wrap gap-2">
      {tiles.map((t) => (
        <span
          key={t.name}
          className="inline-flex items-center gap-2"
          style={{
            padding: '0.5rem 0.85rem',
            borderRadius: 12,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(184,212,208,0.14)',
            fontSize: '0.85rem',
            color: 'var(--text-primary)',
          }}
        >
          {t.name}
          {t.count > 0 && (
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                padding: '0.1rem 0.45rem',
                borderRadius: 999,
                background: 'rgba(184,212,208,0.14)',
                color: 'var(--green-pastel)',
              }}
            >
              {t.count}
            </span>
          )}
        </span>
      ))}
    </div>
  )
}

/* item do escopo em chip — pílula curta, várias por linha */
function Chip({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        padding: '0.4rem 0.75rem',
        borderRadius: 999,
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(184,212,208,0.10)',
        fontSize: '0.78rem',
        color: 'var(--text-primary)',
        lineHeight: 1.3,
      }}
    >
      {children}
    </span>
  )
}

/* ── Etapas: grupos lado a lado, separados por hairline (CSS em
   globals.css: .scope-phases). No desktop o título de cada etapa desce
   em escada em relação à anterior — lê como linha do tempo, não tabela. */
function ScopePhases({ groups }: { groups: ScopeGroup[] }) {
  // até 5 etapas cabem numa linha; acima disso quebra em linhas de 3
  const cols = groups.length > 5 ? 3 : Math.max(groups.length, 1)
  return (
    <div className="scope-phases" style={{ '--cols': cols } as CSSProperties}>
      {groups.map((g, i) => {
        const Icon = groupIcon(g.title)
        const col = i % cols
        const row = Math.floor(i / cols)
        return (
          <div
            key={i}
            className="scope-phase"
            data-col={col}
            data-row={row}
            style={{ '--i': col } as CSSProperties}
          >
            <div className="flex items-center justify-between">
              <span
                className="flex items-center justify-center flex-shrink-0"
                style={{ width: 38, height: 38, borderRadius: '50%', border: '1px solid rgba(139,183,175,0.35)' }}
              >
                <Icon size={14} style={{ color: 'var(--green-pastel)' }} />
              </span>
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  letterSpacing: '0.14em',
                  color: 'var(--text-muted)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {String(i + 1).padStart(2, '0')}
              </span>
            </div>
            <div className="scope-phase-step" aria-hidden />
            <h4
              style={{
                fontFamily: SERIF,
                fontStyle: 'italic',
                fontWeight: 300,
                fontSize: 'clamp(1.4rem, 2.2vw, 1.75rem)',
                lineHeight: 1.1,
                letterSpacing: '-0.01em',
                color: 'var(--text-primary)',
                marginTop: '1.75rem',
              }}
            >
              {g.title || 'Incluído'}
            </h4>
            <div className="flex flex-wrap gap-1.5" style={{ marginTop: '1.1rem' }}>
              {g.items.map((it, ii) => (
                <Chip key={ii}>{it}</Chip>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ── Escopo claro: não incluso / você entrega / prazo e revisões
   (só os que existem), em colunas planas ── */
function FinePrint({ plan }: { plan: Plan }) {
  const blocks: ReactNode[] = []
  if (plan.not_included?.length) {
    // frase inteira (termina em '.') no fim da lista = nota, não item
    const raw = plan.not_included
    const last = raw[raw.length - 1]
    const isNote = raw.length > 1 && last.trim().endsWith('.')
    const items = isNote ? raw.slice(0, -1) : raw
    blocks.push(
      <div key="ni">
        <Eyebrow color="var(--text-muted)">Não incluso</Eyebrow>
        <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {items.map((t, i) => (
            <li key={i} style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
              {/* traço = fica de fora */}
              <span aria-hidden style={{ width: 10, height: 1, flexShrink: 0, background: 'var(--text-muted)', transform: 'translateY(-4px)' }} />
              <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{t}</span>
            </li>
          ))}
        </ul>
        {isNote && (
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.6, marginTop: '1rem', fontStyle: 'italic', maxWidth: '40ch' }}>
            {last}
          </p>
        )}
      </div>
    )
  }
  if (plan.client_delivers?.length) {
    blocks.push(
      <div key="cd">
        <Eyebrow>Você entrega</Eyebrow>
        <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {plan.client_delivers.map((t, i) => (
            <li key={i} style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
              {/* círculo vazado = vem do cliente */}
              <span aria-hidden style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, border: '1px solid var(--teal)', transform: 'translateY(-1px)' }} />
              <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{t}</span>
            </li>
          ))}
        </ul>
      </div>
    )
  }
  if (plan.terms_note) {
    blocks.push(
      <div key="tn">
        <Eyebrow color="var(--text-muted)" mb="0.6rem">Prazo e revisões</Eyebrow>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: '52ch' }}>{plan.terms_note}</p>
      </div>
    )
  }
  if (!blocks.length) return null
  const cols = blocks.length === 3 ? 'md:grid-cols-3' : blocks.length === 2 ? 'md:grid-cols-2' : ''
  return (
    <div className={`grid gap-8 ${cols}`} style={{ borderTop: HAIR, marginTop: '3rem', paddingTop: '2.5rem' }}>
      {blocks}
    </div>
  )
}

/* ── Investimento: um preço só, em faixa plana logo abaixo do escopo.
   Sem card — o escopo acima já disse tudo; aqui é o desfecho. ── */
function PriceBand({
  plan,
  onAccept,
  currency,
  exchangeRate,
}: {
  plan: Plan
  onAccept: (id: string) => void
  currency: Currency
  exchangeRate: number
}) {
  const symbol = currencySymbol(currency)
  const hasInstallments = plan.price_installments_count > 0 && plan.price_installment_value > 0
  // "sem juros" só aparece quando a conta fecha de verdade: as parcelas
  // somam o valor à vista (tolerância de 1 unidade pra arredondamento).
  const semJuros =
    hasInstallments &&
    Math.abs(plan.price_installments_count * plan.price_installment_value - plan.price_cash) <= 1
  return (
    <div
      style={{
        marginTop: '3.5rem',
        borderRadius: 28,
        overflow: 'hidden',
        position: 'relative',
        background:
          'linear-gradient(135deg, rgba(184,212,208,0.13) 0%, rgba(139,183,175,0.06) 42%, rgba(255,255,255,0.02) 100%)',
        border: '1px solid rgba(184,212,208,0.26)',
        boxShadow: '0 24px 60px rgba(0,0,0,0.35)',
        padding: 'clamp(2rem, 4vw, 2.75rem) clamp(1.75rem, 4vw, 3rem)',
      }}
    >
      {/* brilho no canto — dá volume à superfície sem virar card colorido */}
      <div
        aria-hidden
        className="absolute pointer-events-none"
        style={{
          top: -140,
          right: -80,
          width: 420,
          height: 300,
          background: 'radial-gradient(ellipse at center, rgba(184,212,208,0.22) 0%, transparent 70%)',
          filter: 'blur(10px)',
        }}
      />
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8" style={{ position: 'relative' }}>
      <div>
        <Eyebrow color="var(--green-pastel)" mb="1rem">Investimento</Eyebrow>
        {/* Valor alto entra pela parcela: a forma de pagamento vem numa pílula
            acima, o número grande fica limpo (cifrão + parcela) e as demais
            formas aparecem abaixo. Sem parcelamento, o total assume. */}
        {hasInstallments && (
          <span
            className="inline-block"
            style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#071F20',
              background: 'var(--green-pastel)',
              borderRadius: 999,
              padding: '0.35rem 0.8rem',
              marginBottom: '0.9rem',
            }}
          >
            {plan.price_installments_count}× no cartão{semJuros ? ' · sem juros' : ''}
          </span>
        )}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.45rem' }}>
          <span
            style={{
              fontFamily: HELV,
              fontSize: '1.4rem',
              fontWeight: 600,
              color: 'var(--green-pastel)',
              marginTop: '0.75rem',
            }}
          >
            {symbol}
          </span>
          <span
            style={{
              fontFamily: HELV,
              fontWeight: 700,
              fontSize: 'clamp(3.5rem, 8vw, 5.25rem)',
              lineHeight: 1,
              letterSpacing: '-0.045em',
              color: '#FFFFFF',
            }}
          >
            {formatNumber(
              convertFromBRL(hasInstallments ? plan.price_installment_value : plan.price_cash, currency, exchangeRate)
            )}
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginTop: '1.1rem' }}>
          {hasInstallments && (
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {dot}
              <span>
                ou{' '}
                <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                  {symbol} {formatNumber(convertFromBRL(plan.price_cash, currency, exchangeRate))}
                </strong>{' '}
                à vista
              </span>
            </p>
          )}
          {plan.payment_options?.map((opt, i) => (
            <p key={i} style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {dot}
              <span>
                ou <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{opt}</strong>
              </span>
            </p>
          ))}
        </div>
      </div>

      <div className="flex flex-col items-start md:items-end gap-3">
        <button
          onClick={() => onAccept(plan.id)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.55rem',
            padding: '1.05rem 2.1rem',
            borderRadius: 999,
            background: 'linear-gradient(135deg, #D2E9E4 0%, var(--green-pastel) 55%, #9FC7C1 100%)',
            color: '#071F20',
            border: 'none',
            fontFamily: 'var(--font-inter)',
            fontWeight: 700,
            fontSize: '0.76rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            boxShadow: '0 10px 30px rgba(184,212,208,0.22)',
            transition: 'transform 0.25s ease, box-shadow 0.25s ease',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)'
            e.currentTarget.style.boxShadow = '0 16px 40px rgba(184,212,208,0.34)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'none'
            e.currentTarget.style.boxShadow = '0 10px 30px rgba(184,212,208,0.22)'
          }}
        >
          Aceitar proposta
          <ArrowRight size={15} />
        </button>
        {plan.highlight_phrase && (
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', maxWidth: '32ch', textAlign: 'left' }} className="md:text-right">
            {plan.highlight_phrase}
          </p>
        )}
      </div>
      </div>
    </div>
  )
}

/* ── Plano único: escopo como seção própria, preço como desfecho ──
   Sem card. Cabeçalho (nome à esquerda, descrição e prazo à direita),
   páginas em tiles, etapas em colunas, escopo claro, e por fim um preço
   só. Superfície plana, hairlines, muito respiro. */
function SinglePlanLayout({
  plan,
  onAccept,
  currency = 'BRL',
  exchangeRate = 1,
}: {
  plan: Plan
  onAccept: (id: string) => void
  currency?: Currency
  exchangeRate?: number
}) {
  const groups = parseScope(plan.features)
  const isPages = (g: ScopeGroup) => /p[áa]gina/i.test(g.title) && g.items.length >= 1 && g.items[0].includes('·')
  const pages = groups.find(isPages)
  const rest = groups.filter((g) => g !== pages)
  // plano simples sem grupos → nuvem de chips (compatível com propostas antigas)
  const flat = rest.length === 1 && !rest[0].title

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* ── cabeçalho: nome à esquerda, descrição e prazo à direita ── */}
      <div className="grid gap-8 lg:grid-cols-[1.15fr_1fr] lg:gap-16 lg:items-end">
        <div>
          <Eyebrow mb="1.25rem">Escopo do projeto</Eyebrow>
          <h3
            style={{
              fontFamily: HELV,
              fontStyle: 'normal',
              fontWeight: 700,
              fontSize: 'clamp(2.5rem, 6vw, 4rem)',
              lineHeight: 1.0,
              letterSpacing: '-0.035em',
              color: 'var(--text-primary)',
            }}
          >
            {plan.name}
            <sup style={{ fontSize: '0.36em', color: 'var(--teal)', fontWeight: 500, verticalAlign: 'super' }}>™</sup>
          </h3>
          {plan.tagline && (
            <p
              style={{
                fontSize: '0.68rem',
                fontWeight: 600,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'var(--teal)',
                marginTop: '1rem',
              }}
            >
              {plan.tagline}
            </p>
          )}
        </div>
        <div>
          {plan.description && (
            <p style={{ fontSize: '0.95rem', lineHeight: 1.8, color: 'var(--text-secondary)', maxWidth: '46ch' }}>
              {plan.description}
            </p>
          )}
          <p
            className="inline-flex items-center gap-2 flex-wrap"
            style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1.25rem' }}
          >
            <Clock size={12} style={{ color: 'var(--teal)' }} />
            {plan.delivery_label?.trim() || 'Primeira versão em'}{' '}
            <strong style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{plan.delivery_days} dias úteis</strong>
            {plan.delivery_full_label && (
              <>
                <span aria-hidden style={{ opacity: 0.4 }}>·</span>
                <strong style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{plan.delivery_full_label}</strong>
              </>
            )}
          </p>
        </div>
      </div>

      {/* ── páginas ── */}
      {pages && (
        <div style={{ borderTop: HAIR, marginTop: '3rem', paddingTop: '2.5rem' }}>
          <Eyebrow>{pages.title}</Eyebrow>
          <PageTiles line={pages.items[0]} />
          {/* linhas extras do grupo = nota de apoio (ex.: como os templates se replicam) */}
          {pages.items.length > 1 && (
            <p style={{ fontSize: '0.85rem', lineHeight: 1.7, color: 'var(--text-secondary)', maxWidth: '56ch', marginTop: '1.25rem' }}>
              {pages.items.slice(1).join(' ')}
            </p>
          )}
        </div>
      )}

      {/* ── etapas ── */}
      {(flat || rest.length > 0) && (
        <div style={{ borderTop: HAIR, marginTop: pages ? '2.5rem' : '3rem', paddingTop: '2.5rem' }}>
          {flat ? (
            <>
              <Eyebrow>O que está incluído</Eyebrow>
              <div className="flex flex-wrap gap-2">
                {rest[0].items.map((it, i) => (
                  <Chip key={i}>{it}</Chip>
                ))}
              </div>
            </>
          ) : (
            <ScopePhases groups={rest} />
          )}
        </div>
      )}

      <FinePrint plan={plan} />

      {/* ── um preço só, logo abaixo ── */}
      <PriceBand plan={plan} onAccept={onAccept} currency={currency} exchangeRate={exchangeRate} />
    </motion.div>
  )
}

const dot = (
  <span
    aria-hidden
    style={{ width: 4, height: 4, borderRadius: '50%', flexShrink: 0, background: 'var(--teal)', transform: 'translateY(-2px)' }}
  />
)

function ScopeGroups({ features }: { features: string[] }) {
  const groups = parseScope(features)
  // grupos colapsados por padrão — a pessoa abre só o que quiser (menos rolagem)
  const [open, setOpen] = useState<Set<number>>(new Set())
  const toggle = (i: number) =>
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  const isPages = (g: ScopeGroup) => /p[áa]gina/i.test(g.title) && g.items.length >= 1 && g.items[0].includes('·')
  const pages = groups.find(isPages)
  const rest = groups.filter((g) => g !== pages)
  // plano simples sem grupos → lista chapada, largura cheia (compatível com propostas antigas)
  const flat = rest.length === 1 && !rest[0].title

  return (
    <div className="flex flex-col" style={{ gap: '1.75rem' }}>
      {pages && (
        <div>
          <p style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: '0.85rem' }}>
            {pages.title}
          </p>
          <PageTiles line={pages.items[0]} />
        </div>
      )}

      {flat ? (
        <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {rest[0].items.map((it, i) => (
            <li key={i} style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
              {dot}
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{it}</span>
            </li>
          ))}
        </ul>
      ) : rest.length > 0 ? (
        /* linhas planas (sem card dentro de card), colapsadas — abre no toque */
        <div>
          {rest.map((g, gi) => {
            const Icon = groupIcon(g.title)
            const isOpen = open.has(gi)
            const preview = g.items.slice(0, 3).join(' · ')
            const more = g.items.length - 3
            return (
              <div
                key={gi}
                style={{
                  borderTop: gi === 0 && !pages ? 'none' : '1px solid rgba(184,212,208,0.12)',
                  padding: '0.85rem 0',
                }}
              >
                <button
                  type="button"
                  onClick={() => toggle(gi)}
                  aria-expanded={isOpen}
                  className="w-full flex items-center gap-3 text-left"
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                >
                  <span
                    className="flex items-center justify-center flex-shrink-0"
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 9,
                      background: 'rgba(139,183,175,0.10)',
                      border: '1px solid rgba(139,183,175,0.2)',
                    }}
                  >
                    <Icon size={13} style={{ color: 'var(--green-pastel)' }} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span
                      style={{
                        display: 'block',
                        fontFamily: '"ivypresto-display", "ivypresto-headline", Georgia, serif',
                        fontStyle: 'italic',
                        fontWeight: 300,
                        fontSize: '1.05rem',
                        lineHeight: 1.15,
                        color: 'var(--text-primary)',
                      }}
                    >
                      {g.title}
                    </span>
                    {!isOpen && (
                      <span
                        className="block truncate"
                        style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: 2 }}
                      >
                        {preview}
                        {more > 0 ? ` · +${more}` : ''}
                      </span>
                    )}
                  </span>
                  <ChevronDown
                    size={15}
                    style={{
                      color: 'var(--text-muted)',
                      flexShrink: 0,
                      transition: 'transform 0.25s ease',
                      transform: isOpen ? 'rotate(180deg)' : 'none',
                    }}
                  />
                </button>
                {isOpen && (
                  <motion.div
                    className="flex flex-wrap gap-1.5"
                    style={{ paddingTop: '0.75rem', paddingLeft: 42 }}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {g.items.map((it, ii) => (
                      <span
                        key={ii}
                        style={{
                          padding: '0.3rem 0.62rem',
                          borderRadius: 999,
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(184,212,208,0.12)',
                          fontSize: '0.76rem',
                          color: 'var(--text-secondary)',
                          lineHeight: 1.3,
                        }}
                      >
                        {it}
                      </span>
                    ))}
                  </motion.div>
                )}
              </div>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

/* ── Plano único: escopo primeiro, investimento depois ──
   Layout minimalista pra quando a proposta tem um só plano. Superfície plana,
   linhas finas, muito respiro — o cliente lê tudo o que recebe e o preço vem
   como desfecho, não como abertura. Sem glow, um acento só. */
function SinglePlanCard({
  plan,
  onAccept,
  currency = 'BRL',
  exchangeRate = 1,
}: {
  plan: Plan
  onAccept: (id: string) => void
  currency?: Currency
  exchangeRate?: number
}) {
  const symbol = currencySymbol(currency)
  const hasInstallments = plan.price_installments_count > 0 && plan.price_installment_value > 0
  const hairline = '1px solid rgba(184,212,208,0.12)'
  const PADX = 'clamp(1.75rem, 5vw, 3.5rem)'

  return (
    <motion.div
      className="mx-auto"
      style={{ maxWidth: 620 }}
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
    >
      <div
        style={{
          borderRadius: 24,
          overflow: 'hidden',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(184,212,208,0.12)',
        }}
      >
        {/* ── cabeçalho ── */}
        <div style={{ padding: `clamp(2.25rem, 5vw, 3.25rem) ${PADX} clamp(1.75rem, 4vw, 2.5rem)` }}>
        {/* nome — título grande em Helvetica (reto) */}
        <h3
          style={{
            fontFamily: HELV,
            fontStyle: 'normal',
            fontWeight: 700,
            fontSize: 'clamp(2.25rem, 5vw, 3.25rem)',
            lineHeight: 1.0,
            letterSpacing: '-0.035em',
            color: 'var(--text-primary)',
          }}
        >
          {plan.name}
          <sup style={{ fontSize: '0.36em', color: 'var(--teal)', fontWeight: 500, verticalAlign: 'super' }}>™</sup>
        </h3>

        {/* tagline — uma linha discreta, sem pílula */}
        {plan.tagline && (
          <p
            style={{
              fontSize: '0.68rem',
              fontWeight: 600,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'var(--teal)',
              marginTop: '0.85rem',
            }}
          >
            {plan.tagline}
          </p>
        )}

        {/* descrição */}
        {plan.description && (
          <p
            style={{
              fontSize: '0.9rem',
              lineHeight: 1.8,
              color: 'var(--text-secondary)',
              marginTop: '1.5rem',
              maxWidth: '48ch',
            }}
          >
            {plan.description}
          </p>
        )}

        {/* prazo — linha discreta */}
        <p
          className="inline-flex items-center gap-2"
          style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1.5rem' }}
        >
          <Clock size={12} style={{ color: 'var(--teal)' }} />
          {plan.delivery_label?.trim() || 'Primeira versão em'}{' '}
          <strong style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{plan.delivery_days} dias úteis</strong>
          {plan.delivery_full_label && (
            <>
              <span aria-hidden style={{ opacity: 0.4 }}>·</span>
              <strong style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{plan.delivery_full_label}</strong>
            </>
          )}
        </p>
        </div>

        {/* ── escopo (divisória de largura cheia) ── */}
        <div style={{ borderTop: hairline, padding: `clamp(1.75rem, 4vw, 2.5rem) ${PADX}` }}>
          <ScopeGroups features={plan.features} />
        </div>

        {/* ── escopo claro: não incluso / você entrega / prazo e revisões (só quando existem) ── */}
        {!!plan.not_included?.length && (
          <div style={{ borderTop: hairline, padding: `clamp(1.5rem, 4vw, 2rem) ${PADX}` }}>
            <p style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.85rem' }}>
              Não incluso
            </p>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {plan.not_included.map((t, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
                  {/* traço = fica de fora */}
                  <span aria-hidden style={{ width: 10, height: 1, flexShrink: 0, background: 'var(--text-muted)', transform: 'translateY(-4px)' }} />
                  <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{t}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {!!plan.client_delivers?.length && (
          <div style={{ borderTop: hairline, padding: `clamp(1.5rem, 4vw, 2rem) ${PADX}` }}>
            <p style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: '0.85rem' }}>
              Você entrega
            </p>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {plan.client_delivers.map((t, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
                  {/* círculo vazado = vem do cliente */}
                  <span aria-hidden style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, border: '1px solid var(--teal)', transform: 'translateY(-1px)' }} />
                  <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{t}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {plan.terms_note && (
          <div style={{ borderTop: hairline, padding: `clamp(1.5rem, 4vw, 2rem) ${PADX}` }}>
            <p style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>
              Prazo e revisões
            </p>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: '52ch' }}>{plan.terms_note}</p>
          </div>
        )}

      </div>

      {/* ── investimento — card separado e direto (escopo acima, preço aqui) ── */}
      <div
        style={{
          marginTop: '1.25rem',
          borderRadius: 24,
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(184,212,208,0.12)',
          padding: `clamp(1.75rem, 4vw, 2.5rem) ${PADX}`,
        }}
      >
        {/* contexto em uma linha, pra não perder o fio */}
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
          {plan.name}
          <span aria-hidden style={{ opacity: 0.4, margin: '0 0.5rem' }}>·</span>
          {plan.delivery_label?.trim() || 'Primeira versão em'} {plan.delivery_days} dias úteis
          {plan.delivery_full_label ? ` · ${plan.delivery_full_label}` : ''}
        </p>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
          <div>
            <p
              style={{
                fontSize: '0.58rem',
                fontWeight: 600,
                letterSpacing: '0.25em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                marginBottom: '0.6rem',
              }}
            >
              Investimento
            </p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem' }}>
              <span
                style={{
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  fontFamily: HELV,
                }}
              >
                {symbol}
              </span>
              <span
                style={{
                  fontFamily: HELV,
                  fontWeight: 700,
                  fontSize: 'clamp(2.75rem, 6.5vw, 4rem)',
                  lineHeight: 1,
                  letterSpacing: '-0.045em',
                  color: 'var(--text-primary)',
                }}
              >
                {formatNumber(convertFromBRL(plan.price_cash, currency, exchangeRate))}
              </span>
            </div>
            {hasInstallments && (
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.6rem' }}>
                ou {plan.price_installments_count}× de {symbol}{' '}
                {formatNumber(convertFromBRL(plan.price_installment_value, currency, exchangeRate))} no cartão
              </p>
            )}
          </div>

          {/* CTA */}
          <button
            onClick={() => onAccept(plan.id)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.55rem',
              padding: '0.95rem 1.9rem',
              borderRadius: 999,
              background: 'var(--green-pastel)',
              color: '#071F20',
              border: 'none',
              fontFamily: 'var(--font-inter)',
              fontWeight: 700,
              fontSize: '0.74rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'transform 0.25s ease, opacity 0.25s ease',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.opacity = '0.92'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'none'
              e.currentTarget.style.opacity = '1'
            }}
          >
            Aceitar proposta
            <ArrowRight size={15} />
          </button>
        </div>

        {plan.highlight_phrase && (
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '1.25rem' }}>
            {plan.highlight_phrase}
          </p>
        )}
      </div>
    </motion.div>
  )
}

function PlanCard({
  plan,
  index,
  onAccept,
  isSingle = false,
  currency = 'BRL',
  exchangeRate = 1,
}: {
  plan: Plan
  index: number
  onAccept: (id: string) => void
  isSingle?: boolean
  currency?: Currency
  exchangeRate?: number
}) {
  const isRec = plan.is_recommended
  const symbol = currencySymbol(currency)

  return (
    <motion.div
      className={`relative flex flex-col ${isSingle ? 'md:flex-row md:items-stretch' : ''}`}
      initial={{ opacity: 0, y: 48 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.65, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
      style={{ zIndex: isRec ? 2 : 1, transform: isRec && !isSingle ? 'translateY(-12px)' : 'none' }}
    >
      {/* Outer glow for recommended */}
      {isRec && (
        <div className="absolute pointer-events-none" style={{
          inset: '-32px',
          background: 'radial-gradient(ellipse at 50% 20%, rgba(139,183,175,0.12) 0%, transparent 70%)',
          filter: 'blur(20px)',
          zIndex: 0,
        }} />
      )}

      {/* Card */}
      <div
        className="relative flex flex-col flex-1 overflow-hidden"
        style={{
          borderRadius: '28px',
          background: isRec
            ? `
              radial-gradient(ellipse 100% 55% at 50% 115%, rgba(195,225,219,0.32) 0%, transparent 60%),
              radial-gradient(ellipse 70% 50% at 15% 0%,  rgba(139,183,175,0.22) 0%, transparent 55%),
              radial-gradient(ellipse 60% 40% at 90% 10%, rgba(107,168,158,0.18) 0%, transparent 50%),
              linear-gradient(170deg, #0E3C3D 0%, #082828 45%, #051A1A 100%)
            `
            : 'linear-gradient(170deg, rgba(15,57,58,0.6) 0%, rgba(7,31,32,0.8) 100%)',
          border: isRec
            ? '1px solid rgba(184,212,208,0.30)'
            : '1px solid rgba(139,183,175,0.1)',
          backdropFilter: 'blur(32px)',
          boxShadow: isRec
            ? '0 40px 100px rgba(0,0,0,0.7), 0 0 0 1px rgba(244,249,157,0.08), 0 0 80px rgba(244,249,157,0.06)'
            : '0 8px 32px rgba(0,0,0,0.3)',
        }}
      >
        {/* Top gradient line — neon shimmer for recommended */}
        <div className="absolute top-0 left-0 right-0" style={{
          height: '1px',
          background: isRec
            ? 'linear-gradient(90deg, transparent 0%, rgba(139,183,175,0.5) 20%, rgba(244,249,157,0.9) 50%, rgba(139,183,175,0.5) 80%, transparent 100%)'
            : 'linear-gradient(90deg, transparent, rgba(139,183,175,0.2) 50%, transparent)',
        }} />

        {/* Bottom neon glow layer */}
        {isRec && (
          <div className="absolute bottom-0 left-0 right-0 pointer-events-none" style={{
            height: '180px',
            background: 'linear-gradient(to top, rgba(244,249,157,0.07) 0%, transparent 100%)',
          }} />
        )}

        {/* ── TOP BODY ── */}
        <div style={{ padding: 'clamp(1.5rem, 4vw, 2.25rem)', paddingBottom: '1.5rem' }}>

          {/* Badge row */}
          <div className="flex items-center justify-between mb-6">
            <span style={{
              fontSize: '0.6rem',
              fontWeight: 600,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: isRec ? 'rgba(184,212,208,0.5)' : 'var(--text-muted)',
            }}>
              {String(index + 1).padStart(2, '0')}
            </span>
            {isRec && (
              <span style={{
                fontSize: '0.58rem',
                fontWeight: 700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                padding: '0.25rem 0.75rem',
                borderRadius: '999px',
                background: '#F4F99D',
                border: '1px solid #F4F99D',
                color: '#071F20',
              }}>
                Mais escolhido
              </span>
            )}
          </div>

          {/* Plan name */}
          <h3 style={{
            fontFamily: '"ivypresto-display", Georgia, serif',
            fontWeight: 300,
            fontStyle: 'italic',
            fontSize: isRec ? 'clamp(1.6rem, 3vw, 2rem)' : 'clamp(1.4rem, 2.5vw, 1.75rem)',
            lineHeight: 1.1,
            color: 'var(--text-primary)',
            marginBottom: '0.3rem',
            letterSpacing: '-0.02em',
          }}>
            {plan.name}<sup style={{ fontSize: '0.45em', color: 'var(--teal)', fontWeight: 400, fontStyle: 'normal' }}>™</sup>
          </h3>

          {/* Tagline — destaque visual */}
          <div style={{ marginBottom: '1.5rem' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: isRec ? '0.35rem 0.9rem' : '0.28rem 0.75rem',
              borderRadius: '999px',
              background: isRec
                ? 'linear-gradient(135deg, rgba(184,212,208,0.18) 0%, rgba(139,183,175,0.10) 100%)'
                : 'rgba(139,183,175,0.08)',
              border: isRec
                ? '1px solid rgba(184,212,208,0.35)'
                : '1px solid rgba(139,183,175,0.18)',
              fontSize: isRec ? '0.68rem' : '0.62rem',
              fontWeight: 700,
              letterSpacing: '0.09em',
              textTransform: 'uppercase',
              color: isRec ? 'var(--green-pastel)' : 'var(--teal)',
            }}>
              {isRec && (
                <span style={{
                  width: '5px', height: '5px', borderRadius: '50%',
                  background: 'var(--green-pastel)',
                  boxShadow: '0 0 6px rgba(184,212,208,0.8)',
                  flexShrink: 0,
                }} />
              )}
              {plan.tagline}
            </span>
          </div>

          {/* Divider */}
          <div style={{
            height: '1px',
            marginBottom: '1.5rem',
            background: isRec
              ? 'linear-gradient(90deg, rgba(184,212,208,0.2), transparent)'
              : 'linear-gradient(90deg, rgba(139,183,175,0.1), transparent)',
          }} />

          {/* Description */}
          <p style={{
            fontSize: '0.8125rem',
            lineHeight: 1.75,
            color: 'var(--text-secondary)',
            marginBottom: '1.25rem',
          }}>
            {plan.description}
          </p>

          {/* Delivery pill */}
          <div className="inline-flex items-center gap-2 mb-5" style={{
            padding: '0.45rem 0.9rem',
            borderRadius: '999px',
            background: 'rgba(139,183,175,0.06)',
            border: '1px solid rgba(139,183,175,0.12)',
          }}>
            <Clock size={10} style={{ color: 'var(--teal)' }} />
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
              {plan.delivery_label?.trim() || 'Primeira versão em'}{' '}
              <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                {plan.delivery_days} dias úteis
              </strong>
            </span>
          </div>

          {/* Features — linhas terminadas com `:` viram cabeçalhos de seção */}
          <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
            {plan.features.map((f, i) => {
              const trimmed = f.trim()
              const isHeading = trimmed.endsWith(':') && trimmed.length > 1
              if (isHeading) {
                return (
                  <li
                    key={i}
                    style={{
                      listStyle: 'none',
                      marginTop: i === 0 ? 0 : '0.85rem',
                      marginBottom: '0.15rem',
                      fontSize: '0.62rem',
                      fontWeight: 700,
                      letterSpacing: '0.18em',
                      textTransform: 'uppercase',
                      color: isRec ? 'var(--green-pastel)' : 'var(--teal)',
                    }}
                  >
                    {trimmed.slice(0, -1)}
                  </li>
                )
              }
              return (
                <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
                  <div style={{
                    width: '16px', height: '16px', borderRadius: '50%', flexShrink: 0, marginTop: '1px',
                    background: isRec ? 'rgba(184,212,208,0.08)' : 'rgba(139,183,175,0.06)',
                    border: isRec ? '1px solid rgba(184,212,208,0.2)' : '1px solid rgba(139,183,175,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Check size={8} style={{ color: isRec ? 'var(--green-pastel)' : 'var(--teal)' }} />
                  </div>
                  <span style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{f}</span>
                </li>
              )
            })}
          </ul>
        </div>

      </div>

      {/* ── CARD INFERIOR — Investimento + CTA ── */}
      <div
        className={`mt-[3px] ${isSingle ? 'md:mt-0 md:ml-[3px] md:w-[340px] md:flex-shrink-0 md:flex md:flex-col md:justify-start' : ''}`}
        style={{
        borderRadius: '24px',
        position: 'relative',
        overflow: 'hidden',
        background: isRec
          ? 'linear-gradient(160deg, #082828 0%, #051A1A 100%)'
          : 'rgba(15,57,58,0.55)',
        border: isRec
          ? '1px solid rgba(184,212,208,0.28)'
          : '1px solid rgba(139,183,175,0.1)',
        backdropFilter: 'blur(24px)',
        boxShadow: isRec
          ? 'inset 0 1px 0 rgba(184,212,208,0.18), 0 16px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(184,212,208,0.06)'
          : 'none',
        padding: 'clamp(1.25rem, 3vw, 1.75rem)',
        textAlign: 'center',
      }}>
        {/* Shimmer top line for recommended */}
        {isRec && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
            background: 'linear-gradient(90deg, transparent 0%, rgba(244,249,157,0.5) 30%, rgba(184,212,208,0.8) 50%, rgba(244,249,157,0.5) 70%, transparent 100%)',
          }} />
        )}
        {/* Subtle radial glow behind price */}
        {isRec && (
          <div style={{
            position: 'absolute', top: '-20px', left: '50%', transform: 'translateX(-50%)',
            width: '200px', height: '120px', borderRadius: '50%',
            background: 'radial-gradient(ellipse, rgba(184,212,208,0.07) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />
        )}

        {/* INVESTIMENTO label */}
        <p style={{
          fontSize: '0.6rem',
          fontWeight: 700,
          letterSpacing: '0.25em',
          textTransform: 'uppercase',
          color: isRec ? 'rgba(184,212,208,0.55)' : 'var(--text-muted)',
          marginBottom: '0.75rem',
        }}>
          Investimento
        </p>

        {/* Price */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
          <span style={{
            fontSize: '1rem',
            fontWeight: 300,
            color: isRec ? 'var(--green-pastel)' : 'var(--text-secondary)',
            fontFamily: '"ivypresto-display", Georgia, serif',
          }}>{symbol}</span>
          <span style={{
            fontFamily: '"ivypresto-display", Georgia, serif',
            fontWeight: 300,
            fontSize: isRec ? 'clamp(3.5rem, 6.5vw, 4.5rem)' : 'clamp(2.75rem, 5vw, 3.5rem)',
            lineHeight: 1,
            letterSpacing: '-0.03em',
            color: isRec ? 'var(--green-pastel)' : 'var(--text-primary)',
            textShadow: isRec ? '0 0 40px rgba(184,212,208,0.25)' : 'none',
          }}>
            {formatNumber(convertFromBRL(plan.price_cash, currency, exchangeRate))}
          </span>
        </div>

        {plan.price_installments_count > 0 && plan.price_installment_value > 0 ? (
          <p style={{
            fontSize: '0.6rem',
            fontWeight: 600,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: isRec ? 'rgba(139,183,175,0.5)' : 'var(--text-muted)',
            marginBottom: '1.25rem',
          }}>
            ou {plan.price_installments_count}× de {symbol}{' '}
            {formatNumber(convertFromBRL(plan.price_installment_value, currency, exchangeRate))} no cartão
          </p>
        ) : (
          <div style={{ marginBottom: '1.25rem' }} />
        )}

        {/* CTA */}
        <button
          onClick={() => onAccept(plan.id)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.6rem',
            padding: isRec ? '1.1rem 1.5rem' : '1rem 1.5rem',
            borderRadius: '999px',
            background: isRec
              ? 'linear-gradient(135deg, #C8E6E0 0%, var(--green-pastel) 50%, #A8D4CC 100%)'
              : 'linear-gradient(135deg, #C3E0DB 0%, #A8D4CC 100%)',
            color: '#071F20',
            border: 'none',
            fontFamily: 'var(--font-inter)',
            fontWeight: 700,
            fontSize: isRec ? '0.75rem' : '0.72rem',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            transition: 'all 0.25s ease',
            boxShadow: isRec ? '0 4px 24px rgba(184,212,208,0.3), 0 0 0 1px rgba(184,212,208,0.15) inset' : '0 4px 16px rgba(195,224,219,0.18)',
          }}
          onMouseEnter={e => {
            const el = e.currentTarget
            if (isRec) { el.style.boxShadow = '0 8px 40px rgba(184,212,208,0.5), 0 0 0 1px rgba(184,212,208,0.2) inset'; el.style.transform = 'translateY(-2px)' }
            else { el.style.boxShadow = '0 8px 28px rgba(195,224,219,0.32)'; el.style.transform = 'translateY(-2px)' }
          }}
          onMouseLeave={e => {
            const el = e.currentTarget
            if (isRec) { el.style.boxShadow = '0 4px 24px rgba(184,212,208,0.3), 0 0 0 1px rgba(184,212,208,0.15) inset'; el.style.transform = 'none' }
            else { el.style.boxShadow = '0 4px 16px rgba(195,224,219,0.18)'; el.style.transform = 'none' }
          }}
        >
          Escolher plano
          <ArrowRight size={14} />
        </button>

        <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
          <span style={{ marginRight: '0.35rem', opacity: 0.5 }}>✦</span>
          {plan.highlight_phrase}
        </p>
      </div>
    </motion.div>
  )
}

export function PlansSection({
  plans,
  items,
  onAccept,
  projectType,
  currency = 'BRL',
  exchangeRate = 1,
  scopeLayout = 'card',
}: PlansSectionProps) {
  const isOrcamento = projectType === 'orcamento' && !!items && items.length > 0
  const isCustom = projectType === 'custom'
  // Para custom: cada card horizontal (escopo/preço lado a lado), empilhados.
  const isSingle = plans.length === 1 || isCustom
  // Qualquer proposta com UM só plano (inclusive custom) → layout dedicado
  // minimalista (escopo primeiro, preço depois). Orçamento tem bloco próprio.
  const single = plans.length === 1 && !isOrcamento
  // escopo como seção própria (sem card) + preço único — só onde foi ligado
  const sectionLayout = single && scopeLayout === 'section'
  const gridCols = isCustom
    ? 'grid-cols-1 max-w-5xl mx-auto'
    : plans.length === 3
    ? 'grid-cols-1 md:grid-cols-3'
    : plans.length === 2
    ? 'grid-cols-1 md:grid-cols-2 max-w-2xl mx-auto'
    : 'grid-cols-1 max-w-3xl mx-auto'

  return (
    <section
      className="section relative"
      style={{ background: 'var(--bg-void)', overflow: 'visible' }}
    >
      {/* Radial glow — topo centro */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle 800px at 50% 0%, rgba(139,183,175,0.12), transparent 70%), radial-gradient(circle 400px at 50% 0%, rgba(244,249,157,0.06), transparent 50%)',
          zIndex: 0,
        }}
      />
      {/* Section header (o layout de seção tem cabeçalho próprio no escopo) */}
      {!sectionLayout && (
        <div
          className={`max-w-6xl mx-auto px-4 ${single ? 'text-left md:px-6' : 'text-center'}`}
          style={{ marginBottom: single ? '2.5rem' : '3.5rem', maxWidth: single ? 660 : undefined }}
        >
          <motion.h1
            style={{
              fontFamily: '"ivypresto-display", "ivypresto-headline", Georgia, serif',
              fontStyle: 'italic',
              fontWeight: 300,
              fontSize: single ? 'clamp(2.5rem, 6vw, 4rem)' : 'clamp(2.25rem, 5vw, 3.5rem)',
              lineHeight: 1.08,
              letterSpacing: '-0.01em',
              color: 'var(--text-primary)',
            }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55 }}
          >
            {single ? 'O investimento' : 'Um investimento que traz resultados'}
          </motion.h1>

          <motion.p
            className={`${single ? '' : 'mx-auto'} text-lg`}
            style={{ color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: '38ch', marginTop: '1.25rem' }}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            {single
              ? 'Tudo o que está incluído no seu projeto — e o investimento pra tirar do papel.'
              : 'Seu projeto precisa de um visual que passe credibilidade e gere resultado. Escolha o plano ideal para o seu momento.'}
          </motion.p>
        </div>
      )}

      {/* Cards grid */}
      <div
        className={`max-w-6xl mx-auto px-4 ${sectionLayout ? 'md:px-6' : ''}`}
        style={{ paddingBottom: '2rem' }}
      >
        {isOrcamento ? (
          <OrcamentoBlock
            items={items!}
            plan={plans[0]}
            onAccept={onAccept}
            currency={currency}
            exchangeRate={exchangeRate}
          />
        ) : sectionLayout ? (
          <SinglePlanLayout
            plan={plans[0]}
            onAccept={onAccept}
            currency={currency}
            exchangeRate={exchangeRate}
          />
        ) : single ? (
          <SinglePlanCard
            plan={plans[0]}
            onAccept={onAccept}
            currency={currency}
            exchangeRate={exchangeRate}
          />
        ) : (
        <div className={`grid gap-4 items-start md:items-end ${gridCols}`}>
          {plans.map((plan, i) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              index={i}
              onAccept={onAccept}
              isSingle={isSingle}
              currency={currency}
              exchangeRate={exchangeRate}
            />
          ))}
        </div>
        )}
      </div>
    </section>
  )
}
