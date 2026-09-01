import { supabase } from './supabase'
import { isTableMissing } from './supabaseTableHelpers'

/** Um serviço dentro de um orçamento base. */
export interface BudgetItem {
  id: string
  name: string
  /** escopo — o que inclui esse serviço. */
  subtitle: string
  price: number
}

/** Um orçamento base (modelo reutilizável), organizado por tipo de projeto. */
export interface BudgetTemplate {
  id: string
  name: string
  /** tipo de projeto (categoria pra agrupar: Landing, Site, Social…). */
  category: string
  items: BudgetItem[]
  created_at?: string
}

export class BudgetTableMissingError extends Error {
  constructor() {
    super('A tabela budget_templates ainda não existe no Supabase.')
    this.name = 'BudgetTableMissingError'
  }
}

interface Row {
  id: string
  name: string
  category: string
  items: BudgetItem[] | null
  created_at?: string
}

function toTemplate(row: Row): BudgetTemplate {
  return {
    id: row.id,
    name: row.name ?? '',
    category: row.category ?? '',
    items: Array.isArray(row.items) ? row.items : [],
    created_at: row.created_at,
  }
}

type Patch = Partial<Omit<BudgetTemplate, 'id' | 'created_at'>>

export const budgetStore = {
  async getAll(): Promise<BudgetTemplate[]> {
    const { data, error } = await supabase
      .from('budget_templates')
      .select('*')
      .order('category', { ascending: true })
      .order('created_at', { ascending: true })
    if (error) {
      if (isTableMissing(error)) throw new BudgetTableMissingError()
      console.error('[budgetStore.getAll]', error)
      return []
    }
    return (data as Row[]).map(toTemplate)
  },

  async create(patch: Patch): Promise<BudgetTemplate> {
    const insert = {
      name: patch.name ?? '',
      category: patch.category ?? '',
      items: patch.items ?? [],
    }
    const { data, error } = await supabase
      .from('budget_templates')
      .insert(insert)
      .select()
      .single()
    if (error) {
      if (isTableMissing(error)) throw new BudgetTableMissingError()
      throw error
    }
    return toTemplate(data as Row)
  },

  async update(id: string, patch: Patch): Promise<void> {
    const { error } = await supabase
      .from('budget_templates')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('budget_templates').delete().eq('id', id)
    if (error) throw error
  },
}
