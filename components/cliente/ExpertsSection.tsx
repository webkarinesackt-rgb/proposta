'use client'

import { useRef } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Expert } from '@/lib/types'

interface ExpertsSectionProps {
  experts: Expert[]
}

export function ExpertsSection({ experts }: ExpertsSectionProps) {
  const trackRef = useRef<HTMLDivElement>(null)

  const scroll = (dir: 'left' | 'right') => {
    if (!trackRef.current) return
    trackRef.current.scrollBy({ left: dir === 'right' ? 320 : -320, behavior: 'smooth' })
  }

  return (
    <section
      className="relative overflow-hidden"
      style={{ background: '#060E0F', paddingTop: 'clamp(3rem, 8vw, 6rem)', paddingBottom: 'clamp(3rem, 8vw, 6rem)' }}
    >
      {/* Ambient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(13,56,57,0.3) 0%, transparent 70%)',
        }}
      />

      <div className="relative max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-14">
          <motion.div
            className="divider mx-auto mb-6"
            initial={{ width: 0 }}
            whileInView={{ width: 48 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          />

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            style={{
              fontFamily: '"ivypresto-display", Georgia, serif',
              fontWeight: 300,
              fontStyle: 'italic',
              lineHeight: 1.15,
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
            }}
          >
            Confiança não se diz.{' '}
            <em
              style={{
                fontStyle: 'italic',
                fontWeight: 300,
                background: 'linear-gradient(135deg, var(--neon) 0%, var(--teal) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Se prova.
            </em>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-5 text-sm max-w-xl mx-auto"
            style={{ color: 'var(--text-secondary)', lineHeight: 1.75 }}
          >
            Esses nomes confiaram na gente para crescer, posicionar e vender com estrutura.
            <br />
            <span style={{ color: 'var(--text-muted)' }}>
              (Marcas, empresas, especialistas e influenciadores que estão liderando seus mercados.)
            </span>
          </motion.p>
        </div>

        {/* Navigation buttons */}
        <div className="flex justify-end gap-2 mb-6">
          <button
            onClick={() => scroll('left')}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all"
            style={{
              border: '1px solid rgba(139,183,175,0.2)',
              color: 'rgba(139,183,175,0.6)',
              background: 'rgba(139,183,175,0.04)',
            }}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => scroll('right')}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all"
            style={{
              border: '1px solid rgba(139,183,175,0.2)',
              color: 'rgba(139,183,175,0.6)',
              background: 'rgba(139,183,175,0.04)',
            }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Scrollable cards — bleeds edge to edge */}
      <div
        ref={trackRef}
        className="flex gap-4 overflow-x-auto"
        style={{
          paddingLeft: 'max(1rem, calc((100vw - 1152px) / 2 + 1rem))',
          paddingRight: 'max(1rem, calc((100vw - 1152px) / 2 + 1rem))',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {experts.map((expert, i) => (
          <motion.div
            key={expert.id}
            className="flex-shrink-0 relative rounded-2xl overflow-hidden"
            style={{
              width: '260px',
              aspectRatio: '3/4',
              border: '1px solid rgba(139,183,175,0.1)',
              background: '#0D1A1B',
            }}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5, delay: i * 0.06 }}
          >
            {/* Photo */}
            <img
              src={expert.photo_url}
              alt={expert.name}
              className="absolute inset-0 w-full h-full object-cover object-top"
              onError={e => { (e.currentTarget as HTMLImageElement).style.opacity = '0.2' }}
            />


            {/* Followers badge */}
            <div
              className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full"
              style={{
                background: 'rgba(6,14,15,0.75)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(139,183,175,0.15)',
              }}
            >
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: 'var(--neon)' }}
              />
              <span
                className="text-[10px] font-bold uppercase tracking-wider"
                style={{ color: 'var(--text-secondary)' }}
              >
                {expert.followers} seguidores
              </span>
            </div>

          </motion.div>
        ))}

        <style>{`
          div::-webkit-scrollbar { display: none; }
        `}</style>
      </div>
    </section>
  )
}
