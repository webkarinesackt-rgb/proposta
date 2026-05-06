-- ============================================================
-- QUICK FIX — destrava o app HOJE
-- ============================================================
-- O QUE FAZ: deixa anon (qualquer pessoa com a chave publishable)
--            fazer SELECT, INSERT, UPDATE e DELETE em proposals.
--
-- RISCO: a chave publishable está exposta no JS do browser. Qualquer
--        pessoa que descubra a URL /admin consegue mexer nas suas
--        propostas. Use SÓ enquanto não tem cliente real publicado.
--
-- COMO USAR:
--   1. Abra https://supabase.com/dashboard/project/ookpbnwhylacrstteiah/sql/new
--   2. Cole TUDO abaixo
--   3. Clique em "Run"
-- ============================================================

-- garante que RLS está ligado (defesa em profundidade)
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

-- limpa policies antigas que possam estar pela metade
DROP POLICY IF EXISTS "anon_all"           ON public.proposals;
DROP POLICY IF EXISTS "public_read"        ON public.proposals;
DROP POLICY IF EXISTS "authenticated_all"  ON public.proposals;

-- policy única: anon pode tudo
CREATE POLICY "anon_all"
  ON public.proposals
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- confirma
SELECT
  schemaname, tablename, policyname, roles, cmd
FROM pg_policies
WHERE tablename = 'proposals';
