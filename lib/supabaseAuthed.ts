import { createBrowserClient } from '@supabase/ssr'
import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Cliente Supabase que CARREGA a sessão de login (JWT do usuário logado no
 * /admin). Usado pelos stores de dados sensíveis (fechados, planejamento,
 * orçamentos base, comercial, tarefas) — assim, com RLS ligado, só quem está
 * logado acessa. O `lib/supabase.ts` (anônimo) segue pra leitura pública
 * (página /p da proposta).
 *
 * Só deve ser chamado no navegador (componentes 'use client'). A instância é
 * criada preguiçosamente pra não rodar no SSR/prerender.
 */
let _client: SupabaseClient | null = null

function getAuthedClient(): SupabaseClient {
  if (_client) return _client
  _client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  return _client
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_t, prop, receiver) {
    return Reflect.get(getAuthedClient(), prop, receiver)
  },
})
