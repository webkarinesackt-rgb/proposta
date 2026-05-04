'use client'

export function LiveProjectButton() {
  return (
    <button
      style={{
        borderRadius: '9999px',
        border: '2px solid #D7E2EA',
        background: 'transparent',
        color: '#D7E2EA',
        fontFamily: 'var(--font-kanit), Kanit, sans-serif',
        fontWeight: 500,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        cursor: 'pointer',
        transition: 'background 0.2s',
      }}
      className="px-8 py-3 sm:px-10 sm:py-3.5 text-sm sm:text-base hover:bg-[#D7E2EA]/10"
    >
      Live Project
    </button>
  )
}
