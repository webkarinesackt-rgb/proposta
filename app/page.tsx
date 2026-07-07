import { redirect } from 'next/navigation'

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>
}) {
  const { code } = await searchParams

  // O link de redefinição de senha do Supabase cai na raiz (Site URL = "/").
  // Se houver um ?code=, encaminha pro callback que troca por uma sessão
  // em vez de descartar e ir direto pra proposta demo.
  if (code) {
    redirect(`/auth/callback?code=${code}`)
  }

  redirect('/p/demo')
}
