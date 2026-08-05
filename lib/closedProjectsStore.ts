import { supabase } from './supabase'

export type ContractStatus = 'negociacao' | 'fechado' | 'cancelado'
export type PaymentMethod =
  | 'nao_efetuado'
  | 'pix'
  | 'parcelado'
  | 'meio_pago'
  | 'pago'

/** Uma linha da "planilha" de projetos fechados. */
export interface ClosedProject {
  id: string
  client_name: string
  /** ISO date (YYYY-MM-DD) ou '' se não definido. */
  closed_date: string
  /** link da proposta (URL). */
  proposal_link: string
  /** qual plano foi fechado. */
  plan_name: string
  contract_status: ContractStatus
  payment_method: PaymentMethod
  value: number
  responsavel: string
  /** proposta de origem (quando puxado de uma proposta). */
  proposal_id: string | null
  notes: string
  created_at?: string
}

/** Erro específico quando a tabela ainda não foi criada no Supabase. */
export class TableMissingError extends Error {
  constructor() {
    super('A tabela closed_projects ainda não existe no Supabase.')
    this.name = 'TableMissingError'
  }
}

function isTableMissing(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  return error.code === 'PGRST205' || (error.message || '').includes('closed_projects')
}

type Row = Omit<ClosedProject, 'value'> & { value: number | string }

function rowToProject(row: Row): ClosedProject {
  return {
    id: row.id,
    client_name: row.client_name ?? '',
    closed_date: row.closed_date ?? '',
    proposal_link: row.proposal_link ?? '',
    plan_name: row.plan_name ?? '',
    contract_status: (row.contract_status as ContractStatus) || 'negociacao',
    payment_method: (row.payment_method as PaymentMethod) || 'nao_efetuado',
    value: Number(row.value) || 0,
    responsavel: row.responsavel ?? '',
    proposal_id: row.proposal_id ?? null,
    notes: row.notes ?? '',
    created_at: row.created_at,
  }
}

type Patch = Partial<Omit<ClosedProject, 'id' | 'created_at'>>

export const closedProjectsStore = {
  async getAll(): Promise<ClosedProject[]> {
    const { data, error } = await supabase
      .from('closed_projects')
      .select('*')
      .order('closed_date', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
    if (error) {
      if (isTableMissing(error)) throw new TableMissingError()
      console.error('[closedProjectsStore.getAll]', error)
      return []
    }
    return (data as Row[]).map(rowToProject)
  },

  async create(patch: Patch): Promise<ClosedProject> {
    const insert = {
      client_name: patch.client_name ?? '',
      closed_date: patch.closed_date || null,
      proposal_link: patch.proposal_link ?? '',
      plan_name: patch.plan_name ?? '',
      contract_status: patch.contract_status ?? 'negociacao',
      payment_method: patch.payment_method ?? 'nao_efetuado',
      value: patch.value ?? 0,
      responsavel: patch.responsavel ?? '',
      proposal_id: patch.proposal_id ?? null,
      notes: patch.notes ?? '',
    }
    const { data, error } = await supabase
      .from('closed_projects')
      .insert(insert)
      .select()
      .single()
    if (error) {
      if (isTableMissing(error)) throw new TableMissingError()
      throw error
    }
    return rowToProject(data as Row)
  },

  async update(id: string, patch: Patch): Promise<void> {
    const clean: Record<string, unknown> = { ...patch, updated_at: new Date().toISOString() }
    // coluna date não aceita string vazia
    if ('closed_date' in clean && !clean.closed_date) clean.closed_date = null
    const { error } = await supabase.from('closed_projects').update(clean).eq('id', id)
    if (error) throw error
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('closed_projects').delete().eq('id', id)
    if (error) throw error
  },
}
