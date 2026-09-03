'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { MousePointerClick, Video, MoveVertical } from 'lucide-react'

/* ── Seção "Mapa de calor incluso" (Microsoft Clarity) ──
   Mostra que o site sai com o Clarity instalado: mapa de calor, gravação de
   sessões e rolagem. À direita, uma ilustração animada de um wireframe com
   manchas de calor pulsando nos pontos de clique. Respeita reduced-motion. */

const HEAT = [
  // pontos de calor no wireframe — posição (%) e tamanho (px) e atraso (s)
  { left: '50%', top: '44%', size: 150, delay: 0 }, // botão principal
  { left: '32%', top: '25%', size: 110, delay: 0.9 }, // título do hero
  { left: '78%', top: '9%', size: 70, delay: 1.7 }, // item do menu
  { left: '40%', top: '70%', size: 95, delay: 2.4 }, // card de conteúdo
]

const BENEFITS = [
  { icon: MousePointerClick, title: 'Mapa de calor', text: 'Onde as pessoas clicam — e o que ignoram.' },
  { icon: Video, title: 'Gravação de sessões', text: 'A navegação real, tela a tela, como aconteceu.' },
  { icon: MoveVertical, title: 'Profundidade de rolagem', text: 'Até onde cada visitante chega na página.' },
]

function HeatBlob({ left, top, size, delay, still }: { left: string; top: string; size: number; delay: number; still: boolean }) {
  return (
    <motion.div
      aria-hidden
      style={{
        position: 'absolute',
        left,
        top,
        width: size,
        height: size,
        marginLeft: -size / 2,
        marginTop: -size / 2,
        borderRadius: '50%',
        background:
          'radial-gradient(circle, rgba(244,249,157,0.95) 0%, rgba(255,176,64,0.6) 32%, rgba(255,96,64,0.28) 58%, transparent 74%)',
        filter: 'blur(7px)',
        mixBlendMode: 'screen',
        pointerEvents: 'none',
      }}
      initial={{ scale: 0.9, opacity: 0.8 }}
      animate={still ? { scale: 1, opacity: 0.9 } : { scale: [0.85, 1.12, 0.85], opacity: [0.65, 1, 0.65] }}
      transition={still ? { duration: 0 } : { duration: 3.2, repeat: Infinity, ease: 'easeInOut', delay }}
    />
  )
}

function Wireframe({ still }: { still: boolean }) {
  const block = (w: string, h: number, extra?: React.CSSProperties) => (
    <div style={{ width: w, height: h, borderRadius: 6, background: 'rgba(255,255,255,0.06)', ...extra }} />
  )
  return (
    <div
      className="relative w-full overflow-hidden"
      style={{
        aspectRatio: '4 / 3',
        borderRadius: 20,
        background: 'linear-gradient(170deg, #0B3334 0%, #071F20 100%)',
        border: '1px solid rgba(184,212,208,0.14)',
      }}
    >
      {/* barra do navegador */}
      <div
        className="flex items-center gap-1.5"
        style={{ padding: '10px 14px', borderBottom: '1px solid rgba(184,212,208,0.1)' }}
      >
        {['#F87171', '#FBBF24', '#34D399'].map((c) => (
          <span key={c} style={{ width: 8, height: 8, borderRadius: '50%', background: c, opacity: 0.7 }} />
        ))}
        <span
          style={{
            marginLeft: 10,
            height: 8,
            width: '38%',
            borderRadius: 4,
            background: 'rgba(255,255,255,0.06)',
          }}
        />
      </div>

      {/* esqueleto da página */}
      <div className="absolute inset-0" style={{ top: 34, padding: '16px 18px' }}>
        {/* menu */}
        <div className="flex items-center justify-between" style={{ marginBottom: 22 }}>
          {block('18%', 9)}
          <div className="flex gap-3">
            {block('34px', 7)}
            {block('34px', 7)}
            {block('34px', 7)}
            {block('40px', 7, { background: 'rgba(244,249,157,0.35)' })}
          </div>
        </div>
        {/* hero */}
        {block('62%', 14, { marginBottom: 8 })}
        {block('48%', 14, { marginBottom: 14 })}
        {block('70%', 7, { marginBottom: 6 })}
        {block('55%', 7, { marginBottom: 18 })}
        {/* botão principal */}
        <div style={{ width: '34%', height: 22, borderRadius: 999, background: 'rgba(244,249,157,0.5)', marginBottom: 26 }} />
        {/* cards */}
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ height: 54, borderRadius: 8, background: 'rgba(255,255,255,0.05)' }} />
          ))}
        </div>
      </div>

      {/* manchas de calor */}
      {HEAT.map((h, i) => (
        <HeatBlob key={i} {...h} still={still} />
      ))}

      {/* profundidade de rolagem — quente em cima, esfria pra baixo */}
      <div
        aria-hidden
        className="absolute right-0 top-0 bottom-0"
        style={{
          width: 5,
          background:
            'linear-gradient(to bottom, rgba(244,249,157,0.85) 0%, rgba(255,176,64,0.55) 40%, rgba(139,183,175,0.25) 75%, transparent 100%)',
        }}
      />

      {/* selo do Clarity */}
      <div
        className="absolute"
        style={{
          left: 14,
          bottom: 12,
          padding: '4px 9px',
          borderRadius: 999,
          background: 'rgba(7,31,32,0.85)',
          border: '1px solid rgba(184,212,208,0.2)',
          fontSize: '0.6rem',
          fontWeight: 700,
          letterSpacing: '0.08em',
          color: 'var(--green-pastel)',
          backdropFilter: 'blur(6px)',
        }}
      >
        Microsoft Clarity
      </div>
    </div>
  )
}

export function ClaritySection() {
  const reduced = useReducedMotion()
  const still = !!reduced

  return (
    <section className="section relative" style={{ background: 'var(--bg-void)' }}>
      <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-14 items-center">
        {/* texto */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <p
            style={{
              fontSize: '0.62rem',
              fontWeight: 700,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'var(--teal)',
              marginBottom: '1.25rem',
            }}
          >
            Incluso no projeto
          </p>
          <h2
            style={{
              fontFamily: '"ivypresto-display", "ivypresto-headline", Georgia, serif',
              fontStyle: 'italic',
              fontWeight: 300,
              fontSize: 'clamp(2rem, 4.5vw, 3.1rem)',
              lineHeight: 1.08,
              letterSpacing: '-0.01em',
              color: 'var(--text-primary)',
              marginBottom: '1.25rem',
            }}
          >
            Veja onde seus clientes clicam.
          </h2>
          <p style={{ fontSize: '0.95rem', lineHeight: 1.75, color: 'var(--text-secondary)', maxWidth: '46ch' }}>
            O site já sai com o Microsoft Clarity instalado: mapa de calor, gravação de sessões e
            profundidade de rolagem — sem mensalidade. Você enxerga o que as pessoas fazem de verdade na
            página e decide com dados, não com achismo.
          </p>

          <ul className="mt-8 flex flex-col gap-4">
            {BENEFITS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex items-start gap-3.5">
                <span
                  className="flex items-center justify-center flex-shrink-0"
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    background: 'rgba(139,183,175,0.08)',
                    border: '1px solid rgba(139,183,175,0.18)',
                  }}
                >
                  <Icon size={15} style={{ color: 'var(--green-pastel)' }} />
                </span>
                <div>
                  <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>{title}</p>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 2, lineHeight: 1.5 }}>{text}</p>
                </div>
              </li>
            ))}
          </ul>

          <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '1.75rem' }}>
            Instalado e configurado por nós. Zero custo mensal.
          </p>
        </motion.div>

        {/* ilustração animada */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
        >
          <Wireframe still={still} />
        </motion.div>
      </div>
    </section>
  )
}
