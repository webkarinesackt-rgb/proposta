import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

// Recebe o ?code= do link de redefinição de senha, troca por uma sessão
// (usando o code_verifier que o navegador guardou em cookie) e leva o
// usuário pra tela de definir a nova senha.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createServerSupabase()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}/nova-senha`)
    }
  }

  return NextResponse.redirect(`${origin}/login?erro=reset`)
}
