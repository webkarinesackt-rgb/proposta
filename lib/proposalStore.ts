import { Proposal } from './types'
import { supabase } from './supabase'

function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

function randomSuffix() {
  return Math.random().toString(36).slice(2, 6)
}

async function uniqueSlug(base: string, ignoreId?: string): Promise<string> {
  const root = base || randomSuffix()
  let candidate = root
  for (let i = 0; i < 6; i++) {
    const { data } = await supabase
      .from('proposals')
      .select('id')
      .eq('slug', candidate)
      .maybeSingle()
    if (!data || data.id === ignoreId) return candidate
    candidate = `${root}-${randomSuffix()}`
  }
  return `${root}-${randomSuffix()}`
}

interface Row {
  id: string
  slug: string
  data: Proposal
  status: Proposal['status']
}

function rowToProposal(row: Row): Proposal {
  const data = (row.data ?? {}) as Partial<Proposal>
  return {
    ...data,
    id: row.id,
    slug: row.slug,
    status: row.status,
    // defaults defensivos: se a row antiga não tem o campo, evita crash no render
    selected_plans: data.selected_plans ?? [],
    cases: data.cases ?? [],
    testimonials: data.testimonials ?? [],
  } as Proposal
}

export const proposalStore = {
  async getAll(): Promise<Proposal[]> {
    const { data, error } = await supabase
      .from('proposals')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) {
      console.error('[proposalStore.getAll]', error)
      return []
    }
    return (data as Row[]).map(rowToProposal)
  },

  async get(id: string): Promise<Proposal | null> {
    const { data, error } = await supabase.from('proposals').select('*').eq('id', id).maybeSingle()
    if (error || !data) return null
    return rowToProposal(data as Row)
  },

  async getBySlug(slug: string): Promise<Proposal | null> {
    const { data, error } = await supabase.from('proposals').select('*').eq('slug', slug).maybeSingle()
    if (error || !data) return null
    return rowToProposal(data as Row)
  },

  async save(proposal: Proposal): Promise<Proposal> {
    const desiredSlug = slugify(proposal.client_name ?? '')
    const slug =
      proposal.slug && (!desiredSlug || proposal.slug.startsWith(desiredSlug))
        ? proposal.slug
        : await uniqueSlug(desiredSlug, proposal.id)
    const status = proposal.status || 'draft'
    const data = { ...proposal, slug, status }

    if (proposal.id) {
      const { data: row, error } = await supabase
        .from('proposals')
        .update({ slug, data, status, updated_at: new Date().toISOString() })
        .eq('id', proposal.id)
        .select()
        .single()
      if (error) throw error
      return rowToProposal(row as Row)
    }

    const { data: row, error } = await supabase
      .from('proposals')
      .insert({ slug, data, status })
      .select()
      .single()
    if (error) throw error
    return rowToProposal(row as Row)
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('proposals').delete().eq('id', id)
    if (error) throw error
  },

  async updateStatus(id: string, status: Proposal['status']): Promise<void> {
    const { error } = await supabase
      .from('proposals')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
  },
}
