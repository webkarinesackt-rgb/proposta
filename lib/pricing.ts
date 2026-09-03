// Modelo de precificação Fysi (spec 02/09/2026). Implementado fiel ao doc.
// A unidade é a "vaga": uma unidade de trabalho de estúdio.

export type Item = { tipo: string; qtd: number }
export type LinhaMes = {
  qtd: number
  preco: number
  vagasUnit: number
  custoDiretoUnit: number
}

export interface PricingParams {
  custoFixoMensal: number
  vagasPorMes: number
  imposto: number
  margemAlvo: number
  // margem quando o job vem por um parceiro que revende (menor que a cheia)
  margemParceiro: number
  // quanto a copy da Karine agrega no preço de tabela, por página
  copyPremio: number
}

export const DEFAULT_PARAMS: PricingParams = {
  custoFixoMensal: 15245.99,
  vagasPorMes: 15,
  imposto: 0.0747,
  margemAlvo: 0.3,
  margemParceiro: 0.15,
  copyPremio: 200,
}

export const DEFAULT_PESOS: Record<string, number> = {
  'landing page': 1.0,
  'home de site': 1.0,
  'pagina de site unica': 0.6,
  'pagina de site leve': 0.4,
  blog: 0.5,
  'template reaproveitavel': 0.8,
  'pagina duplicada': 0.0,
  'revisao de bloco': 0.5,
  'setup de conteudo ia': 0.25,
  'material em pdf ate 8 pag': 0.8,
  'adaptacao de modelo existente': 1.1,
}

// ── Capacidade calculada pela equipe (spec §2.1) ──────────────────────
// vagasPorMes NÃO é digitado: sai da soma das páginas/semana × 4,33.
export interface TeamMember {
  nome: string
  paginasPorSemana: number
}
export const SEMANAS_MES = 4.33
export const DEFAULT_EQUIPE: TeamMember[] = [
  { nome: 'Valéria', paginasPorSemana: 2.75 },
  { nome: 'Andrei', paginasPorSemana: 0.75 },
  // Karine fica em ZERO de propósito: o que ela produz é folga, não base.
  { nome: 'Karine', paginasPorSemana: 0.0 },
]
/** Capacidade do mês em vagas, a partir da equipe. */
export function vagasPorMes(equipe: TeamMember[] = DEFAULT_EQUIPE) {
  return equipe.reduce((a, p) => a + (p.paginasPorSemana || 0), 0) * SEMANAS_MES
}

// custos diretos de referência (entrada é livre no orçamento)
export const DIRETOS = {
  danielPaginaAvulsa: 350,
  danielSiteAte5: 600,
  danielSitePorPagina: 120,
  leonardoTrafego: 300,
}

export const custoPorVaga = (p: PricingParams = DEFAULT_PARAMS) =>
  p.custoFixoMensal / p.vagasPorMes

/** Orça um projeto. custoDireto é entrada livre do usuário. */
export function orcar(
  itens: Item[],
  custoDireto: number,
  p: PricingParams = DEFAULT_PARAMS,
  pesos: Record<string, number> = DEFAULT_PESOS
) {
  const vagas = itens.reduce((a, i) => a + i.qtd * (pesos[i.tipo] ?? 0), 0)
  const indireto = vagas * custoPorVaga(p)
  const custo = indireto + custoDireto
  const denom = 1 - p.imposto - p.margemAlvo

  return {
    vagas,
    indireto,
    custoDireto,
    custo,
    precoMinimo: custo / (1 - p.imposto),
    // guarda de denominador: margem inviável → null
    precoAlvo: denom > 0.02 ? custo / denom : null,
    ocupacaoDoMes: vagas / p.vagasPorMes,
  }
}

/** Testa um preço já negociado contra o custo do projeto. */
export function margemDoPreco(preco: number, custo: number, p: PricingParams = DEFAULT_PARAMS) {
  const imposto = preco * p.imposto
  const sobra = preco - imposto - custo
  return { imposto, sobra, margem: preco ? sobra / preco : 0 }
}

/** Fecha o mês inteiro. */
export function fecharMes(linhas: LinhaMes[], p: PricingParams = DEFAULT_PARAMS) {
  const soma = (f: (l: LinhaMes) => number) => linhas.reduce((a, l) => a + f(l), 0)

  const qtd = soma((l) => l.qtd)
  const faturamento = soma((l) => l.qtd * l.preco)
  const vagas = soma((l) => l.qtd * l.vagasUnit)
  const direto = soma((l) => l.qtd * l.custoDiretoUnit)
  const imposto = faturamento * p.imposto
  const sobra = faturamento - imposto - direto - p.custoFixoMensal

  const precoMedio = qtd ? faturamento / qtd : 0
  const diretoMedio = qtd ? direto / qtd : 0
  const contribuicao = precoMedio - precoMedio * p.imposto - diretoMedio

  return {
    qtd,
    faturamento,
    imposto,
    direto,
    sobra,
    margem: faturamento ? sobra / faturamento : 0,
    vagas,
    ocupacao: vagas / p.vagasPorMes,
    contribuicao,
    pecasParaEmpatar: contribuicao > 0 ? p.custoFixoMensal / contribuicao : Infinity,
  }
}

/** Preço pra uma margem qualquer (o imposto divide, não multiplica). null se inviável. */
export function precoComMargem(custo: number, margem: number, p: PricingParams = DEFAULT_PARAMS) {
  const denom = 1 - p.imposto - margem
  return denom > 0.02 ? custo / denom : null
}

/** Arredonda pra cima no múltiplo de 100 mais próximo (colchão, nunca desconto). */
export function roundUp100(v: number) {
  return Math.ceil(v / 100) * 100
}
