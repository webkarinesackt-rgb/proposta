// Detecção de "tabela ainda não existe" / "coluna ainda não existe" nas
// respostas do Supabase — compartilhado entre stores que toleram schema
// incompleto (tasks/closed_projects) até a Karine rodar o ALTER/CREATE.

export function isTableMissing(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  // PGRST205 = tabela não encontrada. NÃO usar substring com o nome da
  // tabela: o erro de "coluna faltando" (PGRST204) também cita o nome da
  // tabela e era confundido com tabela inexistente.
  return error.code === 'PGRST205' || (error.message || '').includes('Could not find the table')
}

/** Nome da coluna que falta, se o erro for "coluna X não existe ainda"
 *  (ex: antes de rodar o ALTER). Cobre tanto o formato do PostgREST
 *  ("Could not find the 'foo' column...") quanto o erro cru do Postgres
 *  pra 42703 (`column "foo" of relation "bar" does not exist`). */
export function missingColName(error: { code?: string; message?: string } | null): string | null {
  if (!error) return null
  if (error.code !== 'PGRST204' && error.code !== '42703') return null
  const msg = error.message || ''
  const postgrest = msg.match(/'([^']+)' column/)
  if (postgrest) return postgrest[1]
  const postgres = msg.match(/column "([^"]+)"/)
  return postgres ? postgres[1] : null
}
