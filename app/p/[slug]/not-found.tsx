import Link from 'next/link'

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-void)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '1.5rem',
        textAlign: 'center',
        padding: '2rem',
        fontFamily: '"Inter", sans-serif',
      }}
    >
      <div
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: 'rgba(139,183,175,0.09)',
          border: '1px solid rgba(139,183,175,0.22)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.5rem',
        }}
      >
        ◈
      </div>
      <div>
        <p
          style={{
            fontSize: '0.7rem',
            fontWeight: 700,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: 'var(--teal)',
            marginBottom: '0.75rem',
          }}
        >
          Proposta não encontrada
        </p>
        <h1
          style={{
            fontSize: '1.75rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginBottom: '0.5rem',
          }}
        >
          Este link não existe ou expirou.
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Verifique o link recebido ou entre em contato com a Fysi Lab.
        </p>
      </div>
      <a
        href="https://wa.me/5511999999999"
        target="_blank"
        rel="noopener noreferrer"
        className="btn-neon"
        style={{
          background: 'var(--neon)',
          color: '#071F20',
          fontWeight: 700,
          fontSize: '0.875rem',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          padding: '0.875rem 2rem',
          borderRadius: '12px',
          textDecoration: 'none',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}
      >
        Falar com a Fysi
      </a>
    </div>
  )
}
