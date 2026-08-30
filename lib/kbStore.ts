import { supabase } from './supabase'

export type KbSection = 'processo' | 'script'

/** Uma entrada da base de conhecimento comercial. */
export interface KbEntry {
  id: string
  section: KbSection
  /** categoria livre (ex: "Prospecção", "Objeções", "Onboarding"). */
  category: string
  title: string
  content: string
  sort: number
  created_at?: string
}

export class KbTableMissingError extends Error {
  constructor() {
    super('A tabela kb_entries ainda não existe no Supabase.')
    this.name = 'KbTableMissingError'
  }
}

function isTableMissing(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  return error.code === 'PGRST205' || (error.message || '').includes('Could not find the table')
}

type Row = Omit<KbEntry, 'sort'> & { sort: number | string }

function toEntry(row: Row): KbEntry {
  return {
    id: row.id,
    section: (row.section as KbSection) || 'processo',
    category: row.category ?? '',
    title: row.title ?? '',
    content: row.content ?? '',
    sort: Number(row.sort) || 0,
    created_at: row.created_at,
  }
}

type Patch = Partial<Omit<KbEntry, 'id' | 'created_at'>>

export const kbStore = {
  async getAll(): Promise<KbEntry[]> {
    const { data, error } = await supabase
      .from('kb_entries')
      .select('*')
      .order('sort', { ascending: true })
      .order('created_at', { ascending: true })
    if (error) {
      if (isTableMissing(error)) throw new KbTableMissingError()
      console.error('[kbStore.getAll]', error)
      return []
    }
    return (data as Row[]).map(toEntry)
  },

  async create(patch: Patch): Promise<KbEntry> {
    const insert = {
      section: patch.section ?? 'processo',
      category: patch.category ?? '',
      title: patch.title ?? '',
      content: patch.content ?? '',
      sort: patch.sort ?? Date.now(),
    }
    const { data, error } = await supabase
      .from('kb_entries')
      .insert(insert)
      .select()
      .single()
    if (error) {
      if (isTableMissing(error)) throw new KbTableMissingError()
      throw error
    }
    return toEntry(data as Row)
  },

  async update(id: string, patch: Patch): Promise<void> {
    const { error } = await supabase
      .from('kb_entries')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('kb_entries').delete().eq('id', id)
    if (error) throw error
  },
}
