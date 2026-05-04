'use client'

import { motion } from 'framer-motion'
import { ExternalLink } from 'lucide-react'
import { Case } from '@/lib/types'

interface PortfolioSectionProps {
  cases: Case[]
}

const MOCK_PALETTES = [
  ['#0C1A40', '#3B82F6'],
  ['#1e2a1a', '#A8E6CF'],
  ['#1a1e2e', '#7B9EF0'],
  ['#2a1a1e', '#E88FAA'],
  ['#1e2a24', '#52C99A'],
  ['#261e1a', '#E8A87C'],
]

function CaseMockup({ c, index }: { c: Case; index: number }) {
  const palette = MOCK_PALETTES[index % MOCK_PALETTES.length]

  return (
    <motion.div
      className="group cursor-pointer"
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, delay: (index % 3) * 0.1 }}
    >
      {/* Laptop mockup */}
      <div className="relative mb-4">
        {/* Screen */}
        <div
          className="w-full rounded-xl overflow-hidden"
          style={{
            background: palette[0],
            border: '1px solid rgba(255,255,255,0.06)',
            aspectRatio: '16/10',
            position: 'relative',
          }}
        >
          {/* Mock UI inside screen */}
          <div className="absolute inset-0 p-4 flex flex-col gap-2">
            {/* Nav bar mock */}
            <div className="flex items-center justify-between">
              <div className="w-16 h-2 rounded-full opacity-40" style={{ background: palette[1] }} />
              <div className="flex gap-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="w-8 h-1.5 rounded-full opacity-20" style={{ background: palette[1] }} />
                ))}
              </div>
            </div>
            {/* Hero mock */}
            <div className="flex-1 flex items-center gap-4 pt-2">
              <div className="flex-1 flex flex-col gap-2">
                <div className="w-3/4 h-3 rounded-full opacity-60" style={{ background: palette[1] }} />
                <div className="w-1/2 h-2 rounded-full opacity-30" style={{ background: palette[1] }} />
                <div className="w-2/3 h-2 rounded-full opacity-20" style={{ background: palette[1] }} />
                <div className="mt-2 w-20 h-5 rounded opacity-50" style={{ background: palette[1] }} />
              </div>
              <div
                className="w-16 h-20 rounded-lg opacity-20"
                style={{ background: palette[1] }}
              />
            </div>
            {/* Cards mock */}
            <div className="grid grid-cols-3 gap-1">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-8 rounded opacity-10" style={{ background: palette[1] }} />
              ))}
            </div>
          </div>

          {/* Hover overlay */}
          <div
            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          >
            <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              <ExternalLink size={14} />
              Ver projeto
            </div>
          </div>
        </div>

        {/* Laptop base */}
        <div
          className="h-1.5 mx-6 rounded-b-full"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.04)' }}
        />
      </div>

      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
        {c.title}
      </p>
      <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
        {c.subtitle}
      </p>
    </motion.div>
  )
}

export function PortfolioSection({ cases }: PortfolioSectionProps) {
  return (
    <section className="section">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-12">
          <motion.div
            className="divider mb-4"
            initial={{ width: 0 }}
            whileInView={{ width: 48 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          />
          <motion.h2
            className="text-3xl font-bold"
            style={{ color: 'var(--text-primary)' }}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            Landing pages desenvolvidas
            <br />
            <span className="text-gradient-teal">de alto padrão</span>
          </motion.h2>
          <motion.p
            className="mt-3 text-sm"
            style={{ color: 'var(--text-secondary)' }}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Cada projeto com estratégia, copy e design pensados para converter.
          </motion.p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {cases.map((c, i) => (
            <CaseMockup key={c.id} c={c} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}
