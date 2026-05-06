'use client'

export default function DebugEnvPage() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  return (
    <div style={{ padding: '2rem', fontFamily: 'monospace', background: '#0d1a1b', color: '#fff', minHeight: '100vh' }}>
      <h1 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Diagnóstico de Env Vars</h1>

      <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#1a2e2f', borderRadius: '8px' }}>
        <div style={{ color: '#8BB7AF', fontSize: '0.875rem', marginBottom: '0.5rem' }}>NEXT_PUBLIC_SUPABASE_URL</div>
        <div style={{ wordBreak: 'break-all' }}>
          {url ? (
            <span style={{ color: '#4ade80' }}>✓ {url}</span>
          ) : (
            <span style={{ color: '#f87171' }}>✗ NÃO DEFINIDO (undefined)</span>
          )}
        </div>
      </div>

      <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#1a2e2f', borderRadius: '8px' }}>
        <div style={{ color: '#8BB7AF', fontSize: '0.875rem', marginBottom: '0.5rem' }}>NEXT_PUBLIC_SUPABASE_ANON_KEY</div>
        <div style={{ wordBreak: 'break-all' }}>
          {key ? (
            <span style={{ color: '#4ade80' }}>✓ {key.slice(0, 20)}…{key.slice(-8)} ({key.length} chars)</span>
          ) : (
            <span style={{ color: '#f87171' }}>✗ NÃO DEFINIDO (undefined)</span>
          )}
        </div>
      </div>

      <p style={{ color: '#A8B5B0', fontSize: '0.85rem', marginTop: '2rem' }}>
        Se aparecer ✗ NÃO DEFINIDO, as env vars não estão sendo enviadas pelo Vercel no momento da build.
      </p>
    </div>
  )
}
