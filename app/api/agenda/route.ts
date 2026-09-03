import { NextRequest, NextResponse } from 'next/server'
import * as ical from 'node-ical'
import { createServerClient } from '@supabase/ssr'

// Só usuário logado no /admin lê a agenda.
async function isAuthed(request: NextRequest): Promise<boolean> {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => request.cookies.getAll(), setAll: () => {} } }
    )
    const result = await Promise.race([
      supabase.auth.getUser(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000)),
    ])
    return !!(result && 'data' in result && result.data.user)
  } catch {
    return false
  }
}

// só calendários do Google (evita SSRF — o servidor não busca URL arbitrária)
const ALLOWED_HOSTS = ['calendar.google.com']

// serviços de chamada conhecidos — pega o link da reunião de dentro do evento
const CONF_RE =
  /https?:\/\/(?:[a-z0-9-]+\.)*(?:meet\.google\.com|zoom\.us|teams\.microsoft\.com|teams\.live\.com|whereby\.com|meet\.jit\.si|webex\.com|around\.co|gather\.town|chime\.aws|bluejeans\.com|8x8\.vc)\/[^\s"'<>]+/i

/** Descobre o link da chamada: X-GOOGLE-CONFERENCE, location/description ou url. */
function meetingLink(e: Record<string, unknown>): string {
  const xg = e['X-GOOGLE-CONFERENCE']
  const xgVal = typeof xg === 'string' ? xg : (xg as { val?: string })?.val
  if (xgVal) return String(xgVal)

  const loc = String(e.location || '')
  const rawUrl = e.url
  const url = typeof rawUrl === 'string' ? rawUrl : String((rawUrl as { val?: string })?.val || '')
  const hay = `${loc}\n${String(e.description || '')}\n${url}`
  const m = hay.match(CONF_RE)
  if (m) return m[0]

  const locT = loc.trim()
  if (/^https?:\/\//i.test(locT)) return locT
  const urlT = url.trim()
  if (/^https?:\/\//i.test(urlT)) return urlT
  return ''
}

export async function GET(request: NextRequest) {
  if (!(await isAuthed(request))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }
  const url = request.nextUrl.searchParams.get('url') || ''
  let u: URL
  try {
    u = new URL(url)
  } catch {
    return NextResponse.json({ error: 'URL inválida' }, { status: 400 })
  }
  if (u.protocol !== 'https:' || !ALLOWED_HOSTS.includes(u.hostname)) {
    return NextResponse.json({ error: 'Só calendários do Google (calendar.google.com)' }, { status: 400 })
  }

  let text: string
  try {
    const r = await fetch(url, { next: { revalidate: 300 } }) // cache 5min
    if (!r.ok) {
      return NextResponse.json(
        {
          error:
            r.status === 404
              ? 'Calendário não encontrado (verifique se está público ou use o endereço secreto do iCal).'
              : `Erro ao buscar o calendário (${r.status}).`,
        },
        { status: r.status === 404 ? 404 : 502 }
      )
    }
    text = await r.text()
  } catch {
    return NextResponse.json({ error: 'Falha ao acessar o calendário' }, { status: 502 })
  }

  try {
    const data = ical.sync.parseICS(text)
    const now = new Date()
    const horizon = new Date(Date.now() + 60 * 86400000) // próximos 60 dias
    type Ev = { title: string; start: string; end: string | null; allDay: boolean; location: string; url: string }
    const out: Ev[] = []
    for (const k of Object.keys(data)) {
      const e = data[k] as ical.VEvent
      if (!e || e.type !== 'VEVENT' || !e.start) continue
      const title = String(e.summary || '(sem título)')
      const location = String(e.location || '')
      const url = meetingLink(e as unknown as Record<string, unknown>)
      const allDay = (e as { datetype?: string }).datetype === 'date'
      const durMs = e.end ? +new Date(e.end) - +new Date(e.start) : 0
      const exdates = Object.values((e as { exdate?: Record<string, Date> }).exdate || {}).map(
        (d) => +new Date(d)
      )
      if (e.rrule) {
        for (const d of e.rrule.between(now, horizon, true)) {
          if (exdates.includes(+d)) continue
          out.push({
            title,
            start: new Date(d).toISOString(),
            end: durMs ? new Date(+d + durMs).toISOString() : null,
            allDay,
            location,
            url,
          })
        }
      } else {
        const s = new Date(e.start)
        if (s >= now && s <= horizon) {
          out.push({
            title,
            start: s.toISOString(),
            end: e.end ? new Date(e.end).toISOString() : null,
            allDay,
            location,
            url,
          })
        }
      }
    }
    out.sort((a, b) => (a.start < b.start ? -1 : 1))
    return NextResponse.json({ events: out.slice(0, 120) })
  } catch {
    return NextResponse.json({ error: 'Não consegui ler o formato do calendário' }, { status: 500 })
  }
}
