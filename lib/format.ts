import { Currency } from './types'

/** Metadados de cada moeda suportada. */
export const CURRENCIES: Record<Currency, { symbol: string; label: string }> = {
  BRL: { symbol: 'R$', label: 'Real (R$)' },
  EUR: { symbol: '€', label: 'Euro (€)' },
  USD: { symbol: '$', label: 'Dólar ($)' },
}

/** Taxa de câmbio padrão sugerida (reais por 1 unidade da moeda). */
export const DEFAULT_RATES: Record<Currency, number> = {
  BRL: 1,
  EUR: 6.2,
  USD: 5.5,
}

export const CURRENCY_OPTIONS: Currency[] = ['BRL', 'EUR', 'USD']

/** Símbolo da moeda (R$ / € / $). */
export function currencySymbol(currency: Currency = 'BRL'): string {
  return CURRENCIES[currency]?.symbol ?? 'R$'
}

/**
 * Converte um valor armazenado em BRL para a moeda escolhida.
 * `rate` = quantos reais vale 1 unidade da moeda (ex.: 1 € = 6,2 R$).
 */
export function convertFromBRL(
  amountBRL: number,
  currency: Currency = 'BRL',
  rate = 1,
): number {
  if (currency === 'BRL' || !rate || rate <= 0) return amountBRL
  return amountBRL / rate
}

/** Formata um número no padrão pt-BR, sem símbolo de moeda. */
export function formatNumber(value: number, decimals = 0): string {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/**
 * Converte de BRL e formata com símbolo na frente (ex.: "€ 371").
 * Sempre usa o padrão numérico pt-BR.
 */
export function formatMoney(
  amountBRL: number,
  currency: Currency = 'BRL',
  rate = 1,
  decimals = 0,
): string {
  const value = convertFromBRL(amountBRL, currency, rate)
  return `${currencySymbol(currency)} ${formatNumber(value, decimals)}`
}

/** BRL compacto pra telas internas (dashboard/relatórios): "R$ 46,2k" acima
 *  de mil, "R$ 850" abaixo — não confundir com `formatMoney` (multi-moeda,
 *  usado na proposta que o cliente vê). */
export function formatMoneyCompact(v: number): string {
  if (v >= 1000) return 'R$ ' + (v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + 'k'
  return 'R$ ' + v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
}

/** Percentual arredondado de a/b, 0 quando b é 0 (evita NaN/Infinity). */
export function pct(a: number, b: number): number {
  return b > 0 ? Math.round((a / b) * 100) : 0
}
