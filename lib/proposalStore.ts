import { Proposal } from './types'
import { supabase } from './supabase'

function genSlug() {
  return Math.random().toString(36).slice(2, 9)
}

interface Row {
  id: string
  slug: string
  data: Proposal
  status: Proposal['status']
}

function rowToProposal(row: Row): Proposal {
  return { ...row.data, id: row.id, slug: row.slug, status: row.status }
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
    const slug = proposal.slug || genSlug()
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
