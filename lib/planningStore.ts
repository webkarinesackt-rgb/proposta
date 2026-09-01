import { supabase } from './supabase'
import { isTableMissing } from './supabaseTableHelpers'

export type PlanningKind = 'meta' | 'acao' | 'conteudo'

/** Uma entrada do planejamento mensal (meta, ação ou conteúdo). */
export interface PlanningEntry {
  id: string
  /** 'YYYY-MM' */
  month: string
  kind: PlanningKind
  title: string
  /** valor-alvo (só metas). */
  target: number
  /** ações: '' | 'done'. conteúdo: 'ideia' | 'produzindo' | 'publicado'. */
  status: string
  sort: number
  created_at?: string
}

export class PlanningTableMissingError extends Error {
  constructor() {
    super('A tabela planning_entries ainda não existe no Supabase.')
    this.name = 'PlanningTableMissingError'
  }
}

type Row = Omit<PlanningEntry, 'target' | 'sort'> & {
  target: number | string
  sort: number | string
}

function toEntry(row: Row): PlanningEntry {
  return {
    id: row.id,
    month: row.month ?? '',
    kind: (row.kind as PlanningKind) || 'acao',
    title: row.title ?? '',
    target: Number(row.target) || 0,
    status: row.status ?? '',
    sort: Number(row.sort) || 0,
    created_at: row.created_at,
  }
}

type Patch = Partial<Omit<PlanningEntry, 'id' | 'created_at'>>

export const planningStore = {
  async getMonth(month: string): Promise<PlanningEntry[]> {
    const { data, error } = await supabase
      .from('planning_entries')
      .select('*')
      .eq('month', month)
      .order('sort', { ascending: true })
      .order('created_at', { ascending: true })
    if (error) {
      if (isTableMissing(error)) throw new PlanningTableMissingError()
      console.error('[planningStore.getMonth]', error)
      return []
    }
    return (data as Row[]).map(toEntry)
  },

  async create(patch: Patch): Promise<PlanningEntry> {
    const insert = {
      month: patch.month ?? '',
      kind: patch.kind ?? 'acao',
      title: patch.title ?? '',
      target: patch.target ?? 0,
      status: patch.status ?? '',
      sort: patch.sort ?? Date.now(),
    }
    const { data, error } = await supabase
      .from('planning_entries')
      .insert(insert)
      .select()
      .single()
    if (error) {
      if (isTableMissing(error)) throw new PlanningTableMissingError()
      throw error
    }
    return toEntry(data as Row)
  },

  async update(id: string, patch: Patch): Promise<void> {
    const { error } = await supabase
      .from('planning_entries')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('planning_entries').delete().eq('id', id)
    if (error) throw error
  },
}
