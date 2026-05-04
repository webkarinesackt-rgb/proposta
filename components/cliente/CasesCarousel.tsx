'use client'

import { motion } from 'framer-motion'

const ALL_CASES = [
  '/cases/imgi_26_LAYOUT-COM-ALTERACOES-1-1-scaled.jpg',
  '/cases/imgi_27_HOME-3-1-scaled.jpg',
  '/cases/imgi_28_Pagina-1-scaled.jpg',
  '/cases/imgi_29_Wireframe-desktop-1920px.webp',
  '/cases/imgi_30_Pagina-de-Captura-1-scaled.jpg',
  '/cases/imgi_32_LAYOUT-5-1-scaled.jpg',
  '/cases/imgi_33_PAGINA-GASPARINO-1-1-scaled-1.jpg',
  '/cases/imgi_34_Mendes-Advocacia-Video-a-Direita-1-1-scaled-1.jpg',
  '/cases/imgi_35_wireframe-desktop-1920px-1-1-scaled.jpg',
  '/cases/imgi_36_Guilherme-1-1-scaled-1.jpg',
  '/cases/imgi_37_ChatVolt-2-1-scaled.jpg',
  '/cases/imgi_38_LAYOUT-10-1-scaled.jpg',
  '/cases/imgi_39_LAYOUT-scaled-1.jpg',
  '/cases/imgi_40_LAYOUT-6-1-scaled.jpg',
  '/cases/imgi_41_Wireframe-1920px-Desktop-1-scaled.jpg',
  '/cases/imgi_42_Michele-Direito-de-Saude-1-scaled-1.jpg',
  '/cases/imgi_43_IORI-ADVOGADOS-1-scaled-1.jpg',
]

// duplicate for seamless loop
const DOUBLED = [...ALL_CASES, ...ALL_CASES]

export function CasesCarousel() {
  return (
    <section
      className="relative overflow-hidden"
      style={{
        background: 'var(--bg-void)',
        paddingTop: '5rem',
        paddingBottom: '5rem',
      }}
    >
      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>

      {/* Group 15 spinning — canto superior direito */}
      <img
        src="/group15.png"
        alt=""
        aria-hidden
        className="absolute pointer-events-none select-none"
        style={{
          width: '180px',
          height: '180px',
          objectFit: 'contain',
          top: '30px',
          right: '80px',
          opacity: 0.45,
          zIndex: 0,
          animation: 'spin-slow 40s linear infinite',
        }}
      />


      {/* PORTFÓLIO watermark */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden"
        style={{ zIndex: 0 }}
      >
        <span
          style={{
            fontFamily: '"ivypresto-display", Georgia, serif',
            fontWeight: 700,
            fontStyle: 'italic',
            fontSize: 'clamp(6rem, 18vw, 16rem)',
            color: 'transparent',
            WebkitTextStroke: '1px rgba(139,183,175,0.06)',
            letterSpacing: '-0.02em',
            whiteSpace: 'nowrap',
            userSelect: 'none',
          }}
        >
          PORTFÓLIO
        </span>
      </div>

      {/* Carousel track */}
      <div
        className="relative"
        style={{
          zIndex: 1,
          maskImage: 'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: '16px',
            width: 'max-content',
            animation: 'carousel-scroll 50s linear infinite',
          }}
        >
          {DOUBLED.map((src, i) => (
            <div
              key={i}
              style={{
                flexShrink: 0,
                width: 'clamp(160px, 44vw, 340px)',
                borderRadius: '12px',
                overflow: 'hidden',
                border: '1px solid rgba(139,183,175,0.08)',
                background: 'var(--bg-surface)',
              }}
            >
              <img
                src={src}
                alt=""
                style={{
                  width: '100%',
                  height: 'auto',
                  display: 'block',
                  transition: 'transform 0.4s ease',
                  verticalAlign: 'top',
                }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.04)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
              />
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes carousel-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </section>
  )
}
