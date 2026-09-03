'use client'

import { motion } from 'framer-motion'
import { InfraBlock } from '@/lib/types'

interface InfraSectionProps {
  blocks: InfraBlock[]
}

/* ── Infraestrutura Fysilab™ — o que todo cliente recebe ──
   Versão minimalista: dois painéis planos com linhas finas de ponta a ponta,
   tipografia mais leve, um marcador só (ponto), sem glow nem glyphs. */

const hairline = '1px solid rgba(184,212,208,0.12)'
const PADX = 'clamp(1.5rem, 4vw, 2.5rem)'

function Group({ title, items, delay = 0 }: { title: string; items: InfraBlock[]; delay?: number }) {
  return (
    <motion.div
      style={{
        borderRadius: 24,
        overflow: 'hidden',
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(184,212,208,0.12)',
      }}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay }}
    >
      {/* título do grupo */}
      <div style={{ padding: `clamp(1.5rem, 4vw, 2rem) ${PADX} 1.1rem` }}>
        <h3
          style={{
            fontFamily: '"ivypresto-display", "ivypresto-headline", Georgia, serif',
            fontStyle: 'italic',
            fontWeight: 300,
            fontSize: 'clamp(1.35rem, 2.4vw, 1.7rem)',
            lineHeight: 1.15,
            letterSpacing: '-0.01em',
            color: 'var(--text-primary)',
          }}
        >
          {title}
        </h3>
      </div>

      {/* itens — cada um numa faixa separada por linha fina */}
      {items.map((block, i) => (
        <div
          key={i}
          className="flex items-start gap-3.5"
          style={{ borderTop: hairline, padding: `1.15rem ${PADX}` }}
        >
          <span
            aria-hidden
            style={{
              width: 4,
              height: 4,
              borderRadius: '50%',
              flexShrink: 0,
              marginTop: '0.55rem',
              background: 'var(--teal)',
            }}
          />
          <div>
            <p style={{ fontSize: '0.98rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.35 }}>
              {block.title}
            </p>
            {block.description && (
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 3, lineHeight: 1.55 }}>
                {block.description}
              </p>
            )}
          </div>
        </div>
      ))}
    </motion.div>
  )
}

export function InfraSection({ blocks }: InfraSectionProps) {
  const inclusos = blocks.filter((b) => b.category === 'incluso')
  const suporte = blocks.filter((b) => b.category === 'suporte')

  return (
    <section className="relative" style={{ padding: 'clamp(4rem, 8vw, 6.5rem) 0', background: 'var(--bg-void)' }}>
      <div className="relative max-w-5xl mx-auto px-4">
        {/* cabeçalho */}
        <div className="text-center" style={{ marginBottom: 'clamp(2.5rem, 5vw, 3.5rem)' }}>
          <motion.p
            style={{
              fontSize: '0.62rem',
              fontWeight: 700,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'var(--teal)',
              marginBottom: '1.1rem',
            }}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            Bônus inclusos
          </motion.p>
          <motion.h2
            style={{
              fontFamily: '"ivypresto-display", "ivypresto-headline", Georgia, serif',
              fontStyle: 'italic',
              fontWeight: 300,
              fontSize: 'clamp(2rem, 4.5vw, 3.1rem)',
              lineHeight: 1.08,
              letterSpacing: '-0.01em',
              color: 'var(--text-primary)',
            }}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            Você também recebe a{' '}
            <span className="text-gradient-teal">Infraestrutura Fysilab™</span>
          </motion.h2>
          <motion.p
            style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginTop: '1rem', lineHeight: 1.7 }}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            Extras que todo cliente Fysilab recebe — sem custo adicional.
          </motion.p>
        </div>

        {/* dois painéis */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Group title="Incluso no projeto" items={inclusos} />
          <Group title="Suporte pós-entrega" items={suporte} delay={0.08} />
        </div>
      </div>
    </section>
  )
}
