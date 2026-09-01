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

  // Resiliência: se o Supabase Auth ficar lento/fora do ar, o getUser trava e
  // a Vercel corta o middleware com 504 (site inteiro fora). Então damos no
  // máximo 4s; se estourar, NÃO derruba o site — deixa passar quem já tem
  // cookie de sessão e só manda pro login quem não tem cookie nenhum.
  let user: Awaited<ReturnType<typeof supabase.auth.getUser>>['data']['user'] = null
  let authTimedOut = false
  try {
    const result = await Promise.race([
      supabase.auth.getUser(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('auth-timeout')), 4000)
      ),
    ])
    user = result.data.user
  } catch {
    authTimedOut = true
  }

  const hasSessionCookie = req.cookies
    .getAll()
    .some((c) => c.name.startsWith('sb-') && c.name.includes('auth-token'))

  // /admin/* protegido — sem user → manda pro /login.
  // Exceção: se o Auth deu timeout MAS existe cookie de sessão, deixa passar
  // (o usuário provavelmente está logado; evita outage por lentidão do Auth).
  if (path.startsWith('/admin') && !user) {
    if (authTimedOut && hasSessionCookie) return res
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', path)
    return NextResponse.redirect(url)
  }

  // logado entrando em /login → manda pro dashboard
  if (path === '/login' && user) {
    const url = req.nextUrl.clone()
    url.pathname = '/admin/dashboard'
    return NextResponse.redirect(url)
  }

  return res
}

export const config = {
  matcher: ['/admin/:path*', '/login'],
}
