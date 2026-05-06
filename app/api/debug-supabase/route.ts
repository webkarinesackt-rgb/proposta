import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const diag: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    env: {
      url_present: !!url,
      url_value: url ?? null,
      key_present: !!key,
      key_length: key?.length ?? 0,
      key_first10: key?.slice(0, 10) ?? null,
      key_last8: key?.slice(-8) ?? null,
    },
  }

  if (!url || !key) {
    diag.error = 'env vars missing'
    return NextResponse.json(diag, { status: 200 })
  }

  try {
    const res = await fetch(`${url}/rest/v1/proposals?select=slug,status&limit=3`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    })
    const body = await res.text()
    diag.supabase_request = {
      status: res.status,
      statusText: res.statusText,
      body: body.slice(0, 500),
    }
  } catch (err) {
    diag.fetch_error = err instanceof Error ? err.message : String(err)
  }

  return NextResponse.json(diag, { status: 200 })
}
