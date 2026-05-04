'use client'

import { motion } from 'framer-motion'
import { DifferentiatorBlock } from '@/lib/types'

interface DiferenciaisSectionProps {
  blocks: DifferentiatorBlock[]
}

export function DiferenciaisSection({ blocks }: DiferenciaisSectionProps) {
  return (
    <section className="section" style={{ background: 'var(--bg-base)' }}>
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-14 max-w-2xl">
          <motion.span
            className="badge-teal mb-4 inline-block"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            Diferenciais
          </motion.span>
          <motion.h2
            className="text-3xl lg:text-4xl font-bold"
            style={{ color: 'var(--text-primary)' }}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            Ser bom não basta.
          </motion.h2>
          <motion.p
            className="text-xl lg:text-2xl font-medium mt-2"
            style={{ color: 'var(--text-secondary)' }}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.08 }}
          >
            Você precisa <em className="font-display italic" style={{ color: 'var(--teal)' }}>passar bem</em>,{' '}
            parecer confiável e parecer caro.
          </motion.p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {blocks.map((block, i) => (
            <motion.div
              key={i}
              className="diff-card"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
            >
              <div className="flex items-start gap-4">
                <div
                  className="text-2xl flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg"
                  style={{
                    background: 'rgba(139,183,175,0.09)',
                    border: '1px solid rgba(139,183,175,0.18)',
                    color: 'var(--teal)',
                  }}
                >
                  {block.icon}
                </div>
                <div>
                  <h3 className="mb-2" style={{
                    color: 'var(--text-primary)',
                    fontFamily: '"ivypresto-display", Georgia, serif',
                    fontWeight: 300,
                    fontStyle: 'italic',
                    fontSize: 'clamp(1.2rem, 2vw, 1.5rem)',
                    lineHeight: 1.2,
                  }}>
                    {block.title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {block.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
