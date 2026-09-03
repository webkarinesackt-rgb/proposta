import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next({ request: req })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value))
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const path = req.nextUrl.pathname

  // Autenticação via getClaims(): verifica o JWT LOCALMENTE (assinatura + exp)
  // quando o projeto tem JWKS assimétrico — sem round-trip de rede a cada
  // navegação (getUser batia no Auth server em toda troca de aba). Continua
  // uma verificação real do token, não só "tem cookie".
  // Resiliência: se o Auth ficar lento/fora do ar, damos no máximo 4s; se
  // estourar, NÃO derruba o site — deixa passar quem já tem cookie de sessão.
  let authed = false
  let authTimedOut = false
  try {
    const result = await Promise.race([
      supabase.auth.getClaims(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('auth-timeout')), 4000)
      ),
    ])
    authed = !!(result && result.data && result.data.claims)
  } catch {
    authTimedOut = true
  }

  const hasSessionCookie = req.cookies
    .getAll()
    .some((c) => c.name.startsWith('sb-') && c.name.includes('auth-token'))

  // /admin/* protegido — sem sessão válida → manda pro /login.
  // Exceção: se o Auth deu timeout MAS existe cookie de sessão, deixa passar
  // (o usuário provavelmente está logado; evita outage por lentidão do Auth).
  if (path.startsWith('/admin') && !authed) {
    if (authTimedOut && hasSessionCookie) return res
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', path)
    return NextResponse.redirect(url)
  }

  // logado entrando em /login → manda pro dashboard
  if (path === '/login' && authed) {
    const url = req.nextUrl.clone()
    url.pathname = '/admin/dashboard'
    return NextResponse.redirect(url)
  }

  return res
}

export const config = {
  matcher: ['/admin/:path*', '/login'],
}
