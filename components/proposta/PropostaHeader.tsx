'use client'

import { motion } from 'framer-motion'

interface PropostaHeaderProps {
  clientName: string
}

export function PropostaHeader({ clientName }: PropostaHeaderProps) {
  return (
    <section
      className="relative overflow-hidden py-20"
      style={{
        background: 'linear-gradient(180deg, #071F20 0%, #0D3839 100%)',
      }}
    >
      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: 'linear-gradient(rgba(139,183,175,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(139,183,175,0.04) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* Glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse, rgba(139,183,175,0.08) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />

      <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
        <motion.span
          className="badge-teal inline-block"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          Exclusivo para {clientName}
        </motion.span>
      </div>
    </section>
  )
}
