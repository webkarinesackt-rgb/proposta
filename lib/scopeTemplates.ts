import { Plan } from './types'

function pid(n: number) {
  return `tpl_${n}`
}

/* ── Landing Page ─────────────────────────────────────── */

const LP_START: Plan = {
  id: pid(1),
  name: 'Fysilab Start',
  tagline: 'Você fornece textos',
  description:
    'Ideal para quem já tem o conteúdo definido e precisa de uma presença digital de alto impacto com rapidez.',
  delivery_days: 6,
  price_cash: 1800,
  price_installments_count: 6,
  price_installment_value: 315,
  highlight_phrase: 'Escolhido por quem quer começar rápido e bem',
  features: [
    'Design exclusivo responsivo',
    'Você fornece textos',
    'Integração pixel Facebook/Google',
    'SEO técnico básico',
    'Até 2 revisões',
    'Até 10 dobras',
  ],
}

const LP_PERSUASIVO: Plan = {
  id: pid(2),
  name: 'Fysilab Persuasivo',
  tagline: 'Landing Page + Textos Inclusos',
  description:
    'Nós cuidamos de tudo: estratégia, copy persuasivo, design e performance. Você só aprova.',
  delivery_days: 12,
  price_cash: 2300,
  price_installments_count: 8,
  price_installment_value: 300,
  highlight_phrase: 'Escolhido por quem leva a presença digital a sério',
  is_recommended: true,
  features: [
    'Copywriting persuasivo incluído',
    'Estratégia de conversão',
    'Design exclusivo responsivo',
    'Integração pixel Facebook/Google',
    'SEO Premium completo',
    'Até 4 revisões',
    'Até 10 dobras',
  ],
}

const LP_SCALE: Plan = {
  id: pid(3),
  name: 'Fysilab Scale',
  tagline: 'Funil Completo de Captação',
  description:
    'Para negócios que querem escalar: funil completo, múltiplas páginas e acompanhamento estratégico de 30 dias.',
  delivery_days: 21,
  price_cash: 4800,
  price_installments_count: 6,
  price_installment_value: 840,
  highlight_phrase: 'Escolhido por quem pensa em crescimento real',
  features: [
    'Funil de captação completo',
    'Landing page + obrigado + upsell',
    'Copywriting para todas as páginas',
    'Integração CRM e automações',
    'SEO Premium + Google Ads setup',
    'Suporte estratégico 30 dias',
  ],
}

/* ── Site Completo ────────────────────────────────────── */

function sitePlan(pages: '3-5' | '6-10' | '10+'): Plan[] {
  const configs = {
    '3-5': {
      basic: { price: 3500, installment: 615, days: 15, name: 'Site Essencial', tagline: 'Até 5 páginas' },
      premium: { price: 5200, installment: 915, days: 21, name: 'Site Profissional', tagline: 'Até 5 págs + copy + SEO', rec: true },
    },
    '6-10': {
      basic: { price: 5500, installment: 970, days: 25, name: 'Site Completo', tagline: 'Até 10 páginas' },
      premium: { price: 7800, installment: 1380, days: 35, name: 'Site Premium', tagline: 'Até 10 págs + copy + SEO', rec: true },
    },
    '10+': {
      basic: { price: 8500, installment: 1500, days: 40, name: 'Site Robusto', tagline: '10+ páginas' },
      premium: { price: 12000, installment: 2100, days: 60, name: 'Site Autoridade', tagline: '10+ págs + copy + estratégia', rec: true },
    },
  }
  const c = configs[pages]
  return [
    {
      id: pid(10),
      name: c.basic.name,
      tagline: c.basic.tagline,
      description: 'Design responsivo e profissional para cada página do seu site. Você fornece os textos e imagens.',
      delivery_days: c.basic.days,
      price_cash: c.basic.price,
      price_installments_count: 6,
      price_installment_value: c.basic.installment,
      highlight_phrase: 'Ideal para quem tem o conteúdo pronto',
      features: [
        `Até ${pages === '3-5' ? '5' : pages === '6-10' ? '10' : '15'} páginas`,
        'Design exclusivo responsivo',
        'Você fornece textos',
        'Integração Google Analytics',
        'SEO técnico básico',
        'Até 3 revisões',
      ],
    },
    {
      id: pid(11),
      name: c.premium.name,
      tagline: c.premium.tagline,
      description: 'Site completo com copy estratégico, SEO avançado e presença digital de autoridade.',
      delivery_days: c.premium.days,
      price_cash: c.premium.price,
      price_installments_count: 6,
      price_installment_value: c.premium.installment,
      highlight_phrase: 'Tudo incluso — você só aprova',
      is_recommended: true,
      features: [
        `Até ${pages === '3-5' ? '5' : pages === '6-10' ? '10' : '15'} páginas`,
        'Copywriting para todas as páginas',
        'Design exclusivo responsivo',
        'SEO Premium + Google Search Console',
        'Integração CRM e analytics',
        'Até 5 revisões',
        'Suporte pós-entrega 15 dias',
      ],
    },
  ]
}

/* ── Mensal ───────────────────────────────────────────── */

const MENSAL_PLANS: Plan[] = [
  {
    id: pid(20),
    name: 'Gestão Básica',
    tagline: 'Manutenção + atualizações',
    description: 'Manutenção mensal, atualizações de conteúdo e suporte técnico para seu site ou landing page.',
    delivery_days: 0,
    price_cash: 800,
    price_installments_count: 1,
    price_installment_value: 800,
    highlight_phrase: 'Ideal para manter sua presença sempre atualizada',
    features: [
      'Até 4 atualizações de conteúdo/mês',
      'Suporte técnico via WhatsApp',
      'Monitoramento de performance',
      'Backup mensal',
    ],
  },
  {
    id: pid(21),
    name: 'Gestão Premium',
    tagline: 'Estratégia + copy + performance',
    description: 'Gestão estratégica completa: conteúdo, copy, otimização e acompanhamento de resultados.',
    delivery_days: 0,
    price_cash: 1500,
    price_installments_count: 1,
    price_installment_value: 1500,
    highlight_phrase: 'Para quem quer crescer de forma consistente',
    is_recommended: true,
    features: [
      'Até 10 atualizações de conteúdo/mês',
      'Copy estratégico mensal',
      'Relatório de performance',
      'Testes A/B contínuos',
      'Reunião mensal de estratégia',
      'Suporte prioritário 7 dias/semana',
    ],
  },
]

/* ── Posicionamento online ────────────────────────────── */

const POSICIONAMENTO_PLANS: Plan[] = [
  {
    id: pid(30),
    name: 'Identidade Essencial',
    tagline: 'Marca + base digital',
    description:
      'Construção da identidade visual e dos fundamentos da sua presença online — pra você ter uma marca clara e profissional pra começar.',
    delivery_days: 15,
    price_cash: 2800,
    price_installments_count: 6,
    price_installment_value: 490,
    highlight_phrase: 'Pra quem está começando agora',
    features: [
      'Logo + paleta + tipografia',
      'Manual de marca enxuto',
      'Templates de post (Instagram)',
      'Configuração de Bio + Linktree',
      'Sessão de definição de público',
    ],
  },
  {
    id: pid(31),
    name: 'Posicionamento Completo',
    tagline: 'Estratégia + identidade + conteúdo',
    description:
      'Tudo do plano essencial mais estratégia de posicionamento, calendário editorial inicial e mentoria pra você executar com clareza.',
    delivery_days: 25,
    price_cash: 4900,
    price_installments_count: 10,
    price_installment_value: 520,
    highlight_phrase: 'Pra quem quer crescer com direção',
    is_recommended: true,
    features: [
      'Tudo do Identidade Essencial',
      'Diagnóstico de marca + concorrência',
      'Definição de pilares e tom de voz',
      'Calendário editorial dos primeiros 30 dias',
      'Estratégia de aquisição (orgânico + ads)',
      '2 sessões de mentoria 1:1',
    ],
  },
]

/* ── Export ───────────────────────────────────────────── */

export type LpConfig = 'sem_copy_com_copy' | 'start_scale' | '3_planos' | 'so_copy'
export type SitePages = '3-5' | '6-10' | '10+'

// Pacote: um card único, preço único, com os serviços/páginas listados nos
// itens inclusos. A Karine edita nome, preço e a lista.
const PACOTE_PLAN: Plan = {
  id: pid(1),
  name: 'Pacote de serviços',
  tagline: 'Serviços combinados',
  description: 'Um pacote sob medida com tudo o que você precisa, num valor único.',
  delivery_days: 12,
  price_cash: 2200,
  price_installments_count: 6,
  price_installment_value: 420,
  highlight_phrase: 'Tudo num pacote só',
  is_recommended: true,
  features: ['Página de vendas', 'Página de obrigado'],
}

// Orçamento: proposta somada por serviços. O "plano" é só o container do
// total (preço = soma dos itens); os serviços com nome/escopo/valor ficam em
// page_items. price_cash é ajustado no editor conforme a soma.
const ORCAMENTO_PLAN: Plan = {
  id: pid(1),
  name: 'Investimento',
  tagline: 'Serviços incluídos',
  description: 'Escopo montado sob medida — cada serviço com seu valor.',
  delivery_days: 15,
  price_cash: 0,
  price_installments_count: 6,
  price_installment_value: 0,
  highlight_phrase: 'Tudo o que a sua marca precisa',
  is_recommended: true,
  features: [],
}

/** Itens-exemplo pra começar um Orçamento (a Karine edita/remove). */
export const DEFAULT_ORCAMENTO_ITEMS: { id: string; name: string; subtitle: string; price: number }[] = [
  { id: 'oi1', name: 'Link da bio', subtitle: '', price: 650 },
  { id: 'oi2', name: 'Key visual', subtitle: '', price: 500 },
  { id: 'oi3', name: 'Página de vendas', subtitle: '', price: 1800 },
]

export function getPlansForScope(
  type: string,
  lpConfig?: LpConfig,
  sitePages?: SitePages
): Plan[] {
  if (type === 'pacote') return [{ ...PACOTE_PLAN, features: [...PACOTE_PLAN.features] }]
  if (type === 'orcamento') return [{ ...ORCAMENTO_PLAN }]
  if (type === 'landing_page') {
    switch (lpConfig) {
      case 'sem_copy_com_copy': return [LP_START, LP_PERSUASIVO]
      case 'start_scale':       return [LP_START, { ...LP_SCALE, is_recommended: true }]
      case '3_planos':          return [LP_START, LP_PERSUASIVO, LP_SCALE]
      case 'so_copy':           return [{ ...LP_PERSUASIVO, is_recommended: false }, { ...LP_SCALE, is_recommended: true }]
      default:                  return [LP_START, LP_PERSUASIVO]
    }
  }
  if (type === 'site_completo')  return sitePlan(sitePages ?? '3-5')
  if (type === 'mensal')         return MENSAL_PLANS
  if (type === 'posicionamento') return POSICIONAMENTO_PLANS
  return [LP_PERSUASIVO] // custom — empty shell
}

export const LP_CONFIGS: { value: LpConfig; label: string; desc: string }[] = [
  { value: 'sem_copy_com_copy', label: 'Sem copy + Com copy', desc: '2 planos — cliente escolhe se quer copywriting' },
  { value: '3_planos',          label: 'Start + Persuasivo + Scale', desc: '3 planos — do básico ao funil completo' },
  { value: 'start_scale',       label: 'Start + Scale', desc: '2 planos — do simples ao escalável' },
  { value: 'so_copy',           label: 'Só com copy', desc: '2 planos premium — ambos incluem copywriting' },
]

export const SITE_PAGES: { value: SitePages; label: string; desc: string }[] = [
  { value: '3-5',  label: 'Até 5 páginas',   desc: 'Home, Sobre, Serviços, Contato...' },
  { value: '6-10', label: '6 a 10 páginas',  desc: 'Site completo com múltiplas seções' },
  { value: '10+',  label: '10+ páginas',     desc: 'Portal, e-commerce ou site robusto' },
]
