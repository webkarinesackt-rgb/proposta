// Lembretes/tarefas com dono e data — mesmo projeto Supabase do resto do CRM.
import { supabase } from './supabase'
import { isTableMissing, missingColName } from './supabaseTableHelpers'

/** Uma tarefa/lembrete. */
export interface Task {
  id: string
  title: string
  /** ISO date (YYYY-MM-DD) ou '' se sem prazo. */
  due_date: string
  owner: string
  done: boolean
  /** conversa vinculada (opcional — criado a partir de um lead). */
  linked_chat_id: string | null
  linked_chat_name: string
  notes: string
  created_at?: string
}

export class TaskTableMissingError extends Error {
  constructor() {
    super('A tabela tasks ainda não existe no Supabase.')
    this.name = 'TaskTableMissingError'
  }
}

type Row = Task

function rowToTask(row: Row): Task {
  return {
    id: row.id,
    title: row.title ?? '',
    due_date: row.due_date ?? '',
    owner: row.owner ?? '',
    done: !!row.done,
    linked_chat_id: row.linked_chat_id ?? null,
    linked_chat_name: row.linked_chat_name ?? '',
    notes: row.notes ?? '',
    created_at: row.created_at,
  }
}

type Patch = Partial<Omit<Task, 'id' | 'created_at'>>

export const taskStore = {
  async getAll(): Promise<Task[]> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('done', { ascending: true })
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })
    if (error) {
      if (isTableMissing(error)) throw new TaskTableMissingError()
      console.error('[taskStore.getAll]', error)
      return []
    }
    return (data as Row[]).map(rowToTask)
  },

  async create(patch: Patch): Promise<Task> {
    const insert = {
      title: patch.title ?? '',
      due_date: patch.due_date || null,
      owner: patch.owner ?? '',
      done: patch.done ?? false,
      linked_chat_id: patch.linked_chat_id ?? null,
      linked_chat_name: patch.linked_chat_name ?? '',
      notes: patch.notes ?? '',
    }
    const payload: Record<string, unknown> = { ...insert }
    for (let i = 0; i < 4; i++) {
      const { data, error } = await supabase.from('tasks').insert(payload).select().single()
      if (!error) return rowToTask(data as Row)
      if (isTableMissing(error)) throw new TaskTableMissingError()
      const col = missingColName(error)
      if (col && col in payload) {
        delete payload[col]
        continue
      }
      throw error
    }
    throw new Error('tasks: falha ao inserir')
  },

  async update(id: string, patch: Patch): Promise<void> {
    const clean: Record<string, unknown> = { ...patch }
    if ('due_date' in clean && !clean.due_date) clean.due_date = null
    for (let i = 0; i < 4; i++) {
      const { error } = await supabase.from('tasks').update(clean).eq('id', id)
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
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (error) throw error
  },
}
