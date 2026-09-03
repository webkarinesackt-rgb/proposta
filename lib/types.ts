export type ProjectType =
  | 'landing_page'
  | 'site_completo'
  | 'mensal'
  | 'posicionamento'
  | 'pacote'
  | 'orcamento'
  | 'custom'
export type ProposalStatus = 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired'
export type Currency = 'BRL' | 'EUR' | 'USD'

export interface Plan {
  id: string
  name: string
  tagline: string
  description: string
  delivery_days: number
  delivery_label?: string
  price_cash: number
  price_installments_count: number
  price_installment_value: number
  highlight_phrase: string
  is_recommended?: boolean
  features: string[]
  // Escopo claro (todos opcionais). `features` segue aceitando linhas
  // terminadas em ':' como título de grupo (ex.: "Desenvolvimento:").
  /** o que NÃO entra no projeto */
  not_included?: string[]
  /** o que o cliente precisa entregar pra começar */
  client_delivers?: string[]
  /** regra de prazo/revisões em texto (ex.: "o prazo começa com o material completo") */
  terms_note?: string
  /** 2ª etapa do prazo, além de delivery_days (ex.: "Projeto completo em 30 dias") */
  delivery_full_label?: string
}

export interface Case {
  id: string
  title: string
  subtitle?: string
  image_url: string
  client_name: string
  project_type: string
}

export interface Testimonial {
  id: string
  client_name: string
  client_role: string
  photo_url: string
  text: string
}

export interface FAQItem {
  question: string
  answer: string
}

export interface DifferentiatorBlock {
  icon: string
  title: string
  description: string
}

export interface InfraBlock {
  category: 'incluso' | 'suporte'
  icon: string
  title: string
  description: string
}

export interface PageItem {
  id: string
  name: string
  subtitle: string
  price: number | 'incluso'
}

export interface Expert {
  id: string
  name: string
  handle: string
  role: string
  followers: string
  photo_url: string
}

export interface AgencySettings {
  tagline_main: string
  about_title: string
  about_bio: string
  photo_url: string
  logos_clients: { name: string; url: string }[]
  social_proof_text: string
  social_proof_count: string
  differentiator_blocks: DifferentiatorBlock[]
  faq_items: FAQItem[]
  final_cta_text: string
  contact_whatsapp: string
  infra_blocks: InfraBlock[]
  experts?: Expert[]
}

export interface Proposal {
  id: string
  slug: string
  client_name: string
  client_email: string
  client_company?: string
  client_whatsapp?: string
  project_type: ProjectType
  hero_title: string
  hero_subtitle: string
  hero_description: string
  selected_plans: Plan[]
  page_items?: PageItem[]
  /** Moeda exibida ao cliente. Valores são sempre armazenados em BRL. Default 'BRL'. */
  currency?: Currency
  /** Quantos reais vale 1 unidade de `currency`. Ignorado quando currency === 'BRL'. Default 1. */
  exchange_rate?: number
  valid_until: string
  status: ProposalStatus
  agency_settings: AgencySettings
  cases: Case[]
  testimonials: Testimonial[]
  /** ISO timestamp da criação (vindo do Supabase). Opcional pra
   *  compatibilidade com dados antigos. */
  created_at?: string
  /** ISO timestamp da última atualização (proxy da data do aceite). */
  updated_at?: string
}
