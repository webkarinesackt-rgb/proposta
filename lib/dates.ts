/** Chave "YYYY-MM" de uma data — usado pra agrupar/comparar por mês. */
export function ymKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** Chave "YYYY-MM" do mês atual. */
export function currentYm(): string {
  return ymKey(new Date())
}
