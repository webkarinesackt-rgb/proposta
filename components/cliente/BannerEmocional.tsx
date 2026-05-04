'use client'

import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'

interface BannerEmocionalProps {
  onSeeProposal: () => void
}

export function BannerEmocional({ onSeeProposal }: BannerEmocionalProps) {
  return (
    <section
      className="relative overflow-hidden"
      style={{
        padding: '5rem 0',
        background: 'linear-gradient(135deg, #071F20 0%, #0B2C2E 50%, #071F20 100%)',
      }}
    >
      {/* Animated gradient orbs */}
      <motion.div
        className="absolute top-0 left-1/4 w-96 h-96 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(139,183,175,0.18) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
        animate={{ x: [0, 40, -20, 0], y: [0, -30, 20, 0], scale: [1, 1.1, 0.95, 1] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(244,249,157,0.12) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
        animate={{ x: [0, -30, 20, 0], y: [0, 20, -25, 0], scale: [1, 0.9, 1.1, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      />
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[200px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse, rgba(139,183,175,0.07) 0%, transparent 70%)',
          filter: 'blur(80px)',
        }}
        animate={{ scaleX: [1, 1.3, 0.8, 1], scaleY: [1, 0.8, 1.2, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      />

      <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
        <motion.p
          className="text-xs font-bold uppercase tracking-widest mb-6"
          style={{ color: 'var(--teal)' }}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          A verdade que ninguém te conta
        </motion.p>

        <motion.h2
          className="font-bold mb-6"
          style={{
            color: 'var(--text-primary)',
          }}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          Seu problema não é falta de esforço,
          <br />é falta de{' '}
          <span
            className="font-display italic"
            style={{ color: 'var(--teal)' }}
          >
            estratégia.
          </span>
        </motion.h2>

        <motion.p
          className="text-lg mb-10 max-w-xl mx-auto"
          style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          Uma presença digital de alto padrão não é luxo — é a diferença entre
          ser visto como referência ou ser ignorado no mercado.
        </motion.p>

        <motion.button
          className="btn-neon"
          onClick={onSeeProposal}
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          Ver minha proposta personalizada
          <ArrowRight size={15} />
        </motion.button>

        {/* Decorative line */}
        <motion.div
          className="mt-12 flex items-center gap-4 justify-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
        >
          <div className="h-px flex-1 max-w-24" style={{ background: 'var(--border-glow)' }} />
          <span className="text-xs tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>
            Sistema Estruturado de Conversão ™
          </span>
          <div className="h-px flex-1 max-w-24" style={{ background: 'var(--border-glow)' }} />
        </motion.div>
      </div>
    </section>
  )
}
