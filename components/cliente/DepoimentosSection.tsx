'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Testimonial } from '@/lib/types'

interface DepoimentosSectionProps {
  testimonials: Testimonial[]
}

export function DepoimentosSection({ testimonials }: DepoimentosSectionProps) {
  const [current, setCurrent] = useState(0)
  const total = testimonials.length

  const prev = () => setCurrent(i => (i - 1 + total) % total)
  const next = () => setCurrent(i => (i + 1) % total)

  const visibleCards = [
    testimonials[current % total],
    testimonials[(current + 1) % total],
  ]

  return (
    <section
      className="relative overflow-hidden"
      style={{
        background: '#072020',
        padding: 'clamp(3rem, 8vw, 6rem) 0',
      }}
    >
      {/* Ambient teal glow behind cards */}
      <div
        className="absolute pointer-events-none"
        style={{
          right: '5%',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '700px',
          height: '700px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(13,56,57,0.55) 0%, transparent 65%)',
          filter: 'blur(50px)',
        }}
      />

      <div className="max-w-7xl mx-auto px-4 lg:px-6 flex flex-col lg:flex-row items-center gap-10 lg:gap-20">

        {/* LEFT — Text */}
        <div className="lg:w-[40%] flex-shrink-0">
          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full mb-8"
            style={{
              border: '1px solid rgba(139,183,175,0.22)',
              color: 'rgba(139,183,175,0.7)',
            }}
          >
            <span className="text-[11px] tracking-[0.15em] uppercase font-medium">
              Depoimentos
            </span>
          </div>

          <h2
            style={{
              fontFamily: '"ivypresto-display", Georgia, serif',
              fontWeight: 300,
              fontStyle: 'italic',
              lineHeight: 1.15,
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
            }}
          >
            Veja o que dizem os{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, var(--neon) 0%, var(--teal) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              clientes
            </span>
            {' '}sobre nós
          </h2>

          <div
            className="mt-8 w-14 h-[2px]"
            style={{ background: 'linear-gradient(90deg, var(--neon), var(--teal))' }}
          />
        </div>

        {/* RIGHT — Image carousel */}
        <div className="flex-1 relative w-full min-w-0">
          <div className="flex items-center gap-4">
            {/* Prev */}
            <button
              onClick={prev}
              className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all"
              style={{
                border: '1px solid rgba(139,183,175,0.2)',
                color: 'rgba(139,183,175,0.6)',
                background: 'rgba(139,183,175,0.04)',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(139,183,175,0.5)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(139,183,175,0.2)')}
            >
              <ChevronLeft size={18} />
            </button>

            {/* Cards */}
            <div className="flex gap-4 flex-1 overflow-hidden">
              <AnimatePresence mode="popLayout">
                {visibleCards.map((t, i) => (
                  <motion.div
                    key={`${current}-${i}`}
                    className={`flex-1 rounded-2xl overflow-hidden${i === 1 ? ' hidden sm:block' : ''}`}
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -40 }}
                    transition={{ duration: 0.35, delay: i * 0.06, ease: [0.25, 0.1, 0.25, 1] }}
                    style={{
                      border: '1px solid rgba(139,183,175,0.1)',
                      background: '#0D1A1B',
                      aspectRatio: '9/14',
                      maxHeight: '480px',
                    }}
                  >
                    <img
                      src={t.photo_url}
                      alt={t.client_name}
                      className="w-full h-full object-cover"
                      onError={e => {
                        const el = e.currentTarget as HTMLImageElement
                        el.style.display = 'none'
                        const parent = el.parentElement!
                        parent.style.display = 'flex'
                        parent.style.alignItems = 'center'
                        parent.style.justifyContent = 'center'
                        const span = document.createElement('span')
                        span.textContent = t.client_name[0]
                        span.style.cssText = 'font-size:3rem;color:rgba(139,183,175,0.3);font-family:Georgia,serif'
                        parent.appendChild(span)
                      }}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Next */}
            <button
              onClick={next}
              className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all"
              style={{
                border: '1px solid rgba(139,183,175,0.2)',
                color: 'rgba(139,183,175,0.6)',
                background: 'rgba(139,183,175,0.04)',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(139,183,175,0.5)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(139,183,175,0.2)')}
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Dots */}
          <div className="flex justify-center gap-2 mt-6">
            {testimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className="rounded-full transition-all duration-300"
                style={{
                  width: i === current ? '24px' : '8px',
                  height: '8px',
                  background: i === current
                    ? 'var(--neon)'
                    : 'rgba(139,183,175,0.2)',
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
