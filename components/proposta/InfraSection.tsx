'use client'

import { motion } from 'framer-motion'
import { InfraBlock } from '@/lib/types'

interface InfraSectionProps {
  blocks: InfraBlock[]
}

export function InfraSection({ blocks }: InfraSectionProps) {
  const inclusos = blocks.filter(b => b.category === 'incluso')
  const suporte = blocks.filter(b => b.category === 'suporte')

  return (
    <section
      className="relative overflow-hidden"
      style={{
        padding: '5rem 0',
        background: 'linear-gradient(180deg, var(--bg-base) 0%, var(--bg-void) 100%)',
      }}
    >
      {/* Ambient glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse, rgba(139,183,175,0.06) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />

      <div className="relative z-10 max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-14">
          <motion.span
            className="badge-teal mb-4 inline-block"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            Bônus inclusos
          </motion.span>
          <motion.h2
            className="text-3xl font-bold mb-3"
            style={{ color: 'var(--text-primary)' }}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            Você também recebe a{' '}
            <span className="text-gradient-teal font-display italic">
              Infraestrutura Fysilab™
            </span>
          </motion.h2>
          <motion.p
            className="text-sm"
            style={{ color: 'var(--text-secondary)' }}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            Extras que todo cliente Fysilab recebe — sem custo adicional.
          </motion.p>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Incluso */}
          <motion.div
            className="card-glass p-6"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h3 className="text-xl font-bold tracking-widest mb-5" style={{ color: 'var(--teal)' }}>
              ◈ Incluso no projeto
            </h3>
            <div className="space-y-4">
              {inclusos.map((block, i) => (
                <motion.div
                  key={i}
                  className="flex items-start gap-3"
                  initial={{ opacity: 0, x: -12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.06 }}
                >
                  <span style={{ color: 'var(--teal)', fontSize: '1rem' }}>{block.icon}</span>
                  <div>
                    <p className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {block.title}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                      {block.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Suporte */}
          <motion.div
            className="card-glass p-6"
            style={{ borderColor: 'rgba(139,183,175,0.14)' }}
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <h3 className="text-xl font-bold tracking-widest mb-5" style={{ color: 'var(--neon)' }}>
              ✧ Suporte pós-entrega incluído
            </h3>
            <div className="space-y-4">
              {suporte.map((block, i) => (
                <motion.div
                  key={i}
                  className="flex items-start gap-3"
                  initial={{ opacity: 0, x: 12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.06 }}
                >
                  <span style={{ color: 'var(--neon)', fontSize: '1rem' }}>{block.icon}</span>
                  <div>
                    <p className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {block.title}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                      {block.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
