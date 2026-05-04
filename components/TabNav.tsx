'use client'

import { useEffect, useState } from 'react'

interface TabNavProps {
  activeTab: 'cliente' | 'proposta'
  onTabChange: (tab: 'cliente' | 'proposta') => void
  clientName?: string
}

export function TabNav({ activeTab, onTabChange, clientName }: TabNavProps) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <div
      className="sticky top-0 z-50 w-full flex items-center justify-center py-3"
      style={{
        background: scrolled ? 'rgba(7,31,32,0.85)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        transition: 'background 0.3s ease',
      }}
    >
      {/* Pill switcher */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          background: 'rgba(15,30,32,0.85)',
          borderRadius: '12px',
          padding: '4px',
          gap: '2px',
          border: '1px solid rgba(139,183,175,0.12)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <button
          onClick={() => onTabChange('cliente')}
          style={{
            fontFamily: 'var(--font-inter), "Inter", sans-serif',
            fontWeight: 700,
            fontSize: '0.72rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            padding: '0.45rem 1.25rem',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            background: activeTab === 'cliente' ? 'var(--green-pastel)' : 'transparent',
            color: activeTab === 'cliente' ? '#071F20' : 'var(--text-secondary)',
          }}
        >
          Cliente
        </button>
        <button
          onClick={() => onTabChange('proposta')}
          style={{
            fontFamily: 'var(--font-inter), "Inter", sans-serif',
            fontWeight: 700,
            fontSize: '0.72rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            padding: '0.45rem 1.25rem',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            background: activeTab === 'proposta' ? 'var(--green-pastel)' : 'transparent',
            color: activeTab === 'proposta' ? '#071F20' : 'var(--text-secondary)',
          }}
        >
          Proposta
        </button>
      </div>
    </div>
  )
}
