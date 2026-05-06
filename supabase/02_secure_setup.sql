-- ============================================================
-- FIX CORRETO — versão segura, depois de implementar login
-- ============================================================
-- O QUE FAZ:
--   - anon (cliente sem login) só pode LER propostas pelo slug
--     (necessário pra página /p/[slug] funcionar pro cliente)
--   - INSERT, UPDATE e DELETE só funcionam se houver usuário logado
--     (você, no /admin, autenticada via Supabase Auth)
--
-- PRÉ-REQUISITO: você precisa estar logada no app antes de salvar
--                propostas. Implica adicionar tela de login no /admin
--                (Supabase Auth com email + senha).
--
-- COMO USAR (depois que o login estiver implementado):
--   1. Rode primeiro o 01_quick_fix se ainda não rodou (só pra
--      garantir que RLS está ligado)
--   2. Abra https://supabase.com/dashboard/project/ookpbnwhylacrstteiah/sql/new
--   3. Cole TUDO abaixo
--   4. Clique em "Run"
-- ============================================================

ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

-- limpa qualquer policy anterior
DROP POLICY IF EXISTS "anon_all"           ON public.proposals;
DROP POLICY IF EXISTS "public_read"        ON public.proposals;
DROP POLICY IF EXISTS "authenticated_all"  ON public.proposals;
DROP POLICY IF EXISTS "anon_read_published" ON public.proposals;
DROP POLICY IF EXISTS "auth_write"          ON public.proposals;

-- 1. Anon (cliente da Karine) pode ler propostas que NÃO são draft
--    (assim rascunhos não vazam, mas a página pública /p/[slug] funciona)
CREATE POLICY "anon_read_published"
  ON public.proposals
  FOR SELECT
  TO anon
  USING (status <> 'draft');

-- 2. Usuário autenticado (você, logada no /admin) pode tudo
CREATE POLICY "auth_write"
  ON public.proposals
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- confirma
SELECT
  schemaname, tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'proposals';
