// Mesmo projeto Supabase do resto do CRM (propostas, inbox, leads).
import { supabase } from './supabase'

export type ContractStatus = 'negociacao' | 'fechado' | 'cancelado'
export type PaymentMethod =
  | 'nao_efetuado'
  | 'pix'
  | 'parcelado'
  | 'meio_pago'
  | 'pago'
export type UrgencyLevel = 'alta' | 'media' | 'baixa'

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
  urgency: UrgencyLevel
  /** contrato (documento) assinado/feito? */
  contract_done: boolean
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

// Se o erro for "coluna X não existe ainda" (ex: 'urgency'/'contract_done'
// antes de rodar o ALTER), retorna o nome da coluna. Assim o app remove esse
// campo e tenta de novo — não quebra enquanto a coluna nova não existe.
function missingColName(
  error: { code?: string; message?: string } | null,
): string | null {
  if (!error) return null
  if (error.code !== 'PGRST204' && error.code !== '42703') return null
  const m = (error.message || '').match(/'([^']+)' column/)
  return m ? m[1] : null
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
    urgency: (row.urgency as UrgencyLevel) || 'media',
    contract_done: !!row.contract_done,
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
      urgency: patch.urgency ?? 'media',
      contract_done: patch.contract_done ?? false,
      value: patch.value ?? 0,
      responsavel: patch.responsavel ?? '',
      proposal_id: patch.proposal_id ?? null,
      notes: patch.notes ?? '',
    }
    const payload: Record<string, unknown> = { ...insert }
    // remove colunas que ainda não existem no banco e tenta de novo
    for (let i = 0; i < 4; i++) {
      const { data, error } = await supabase
        .from('closed_projects')
        .insert(payload)
        .select()
        .single()
      if (!error) return rowToProject(data as Row)
      if (isTableMissing(error)) throw new TableMissingError()
      const col = missingColName(error)
      if (col && col in payload) {
        delete payload[col]
        continue
      }
      throw error
    }
    throw new Error('closed_projects: falha ao inserir')
  },

  async update(id: string, patch: Patch): Promise<void> {
    const clean: Record<string, unknown> = { ...patch, updated_at: new Date().toISOString() }
    // coluna date não aceita string vazia
    if ('closed_date' in clean && !clean.closed_date) clean.closed_date = null
    // remove colunas que ainda não existem no banco e tenta de novo
    for (let i = 0; i < 4; i++) {
      const { error } = await supabase.from('closed_projects').update(clean).eq('id', id)
      if (!error) return
      const col = missingColName(error)
      if (col && col in clean) {
        delete clean[col]
        continue
      }
      throw error
    }
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('closed_projects').delete().eq('id', id)
    if (error) throw error
  },
}
