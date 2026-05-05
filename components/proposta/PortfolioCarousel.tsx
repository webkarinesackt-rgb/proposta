'use client'

import { useRef } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const PORTFOLIO = [
  { src: '/cases/imgi_26_LAYOUT-COM-ALTERACOES-1-1-scaled.jpg',         title: 'Layout Premium',       tag: 'Landing Page' },
  { src: '/cases/imgi_27_HOME-3-1-scaled.jpg',                          title: 'Home Profissional',    tag: 'Site Completo' },
  { src: '/cases/imgi_33_PAGINA-GASPARINO-1-1-scaled-1.jpg',            title: 'Gasparino',             tag: 'Landing Page' },
  { src: '/cases/imgi_34_Mendes-Advocacia-Video-a-Direita-1-1-scaled-1.jpg', title: 'Mendes Advocacia', tag: 'Landing Page' },
  { src: '/cases/imgi_37_ChatVolt-2-1-scaled.jpg',                      title: 'ChatVolt',              tag: 'Site Completo' },
  { src: '/cases/imgi_42_Michele-Direito-de-Saude-1-scaled-1.jpg',      title: 'Direito da Saúde',      tag: 'Landing Page' },
  { src: '/cases/imgi_43_IORI-ADVOGADOS-1-scaled-1.jpg',                title: 'Iori Advogados',        tag: 'Landing Page' },
  { src: '/cases/imgi_36_Guilherme-1-1-scaled-1.jpg',                   title: 'Guilherme',             tag: 'Landing Page' },
  { src: '/cases/imgi_28_Pagina-1-scaled.jpg',                          title: 'Página de Captação',    tag: 'Landing Page' },
  { src: '/cases/imgi_30_Pagina-de-Captura-1-scaled.jpg',               title: 'Captura',               tag: 'Landing Page' },
  { src: '/cases/imgi_38_LAYOUT-10-1-scaled.jpg',                       title: 'Layout 10',             tag: 'Landing Page' },
  { src: '/cases/imgi_40_LAYOUT-6-1-scaled.jpg',                        title: 'Layout 6',              tag: 'Landing Page' },
]

export function PortfolioCarousel() {
  const trackRef = useRef<HTMLDivElement>(null)

  const scroll = (dir: 'left' | 'right') => {
    if (!trackRef.current) return
    trackRef.current.scrollBy({ left: dir === 'right' ? 420 : -420, behavior: 'smooth' })
  }

  return (
    <section
      className="relative overflow-hidden"
      style={{
        background: '#060E0F',
        paddingTop: 'clamp(3rem, 8vw, 6rem)',
        paddingBottom: 'clamp(3rem, 8vw, 6rem)',
      }}
    >
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(13,56,57,0.35) 0%, transparent 70%)',
        }}
      />

      <div className="relative max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
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
            Projetos que entregamos.{' '}
            <em
              style={{
                fontStyle: 'italic',
                fontWeight: 300,
                background: 'linear-gradient(135deg, #C3E1DB 0%, var(--teal) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Resultados reais.
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
            Uma seleção dos projetos que já criamos para profissionais e marcas que queriam se destacar.
          </motion.p>
        </div>

        {/* Navigation buttons */}
        <div className="flex justify-end gap-2 mb-6">
          <button
            onClick={() => scroll('left')}
            aria-label="Anterior"
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:opacity-80"
            style={{
              border: '1px solid rgba(139,183,175,0.2)',
              color: 'rgba(139,183,175,0.7)',
              background: 'rgba(139,183,175,0.04)',
            }}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => scroll('right')}
            aria-label="Próximo"
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:opacity-80"
            style={{
              border: '1px solid rgba(139,183,175,0.2)',
              color: 'rgba(139,183,175,0.7)',
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
        {PORTFOLIO.map((item, i) => (
          <motion.div
            key={i}
            className="flex-shrink-0 relative rounded-2xl overflow-hidden group"
            style={{
              width: '340px',
              aspectRatio: '4/3',
              border: '1px solid rgba(139,183,175,0.12)',
              background: '#0D1A1B',
            }}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5, delay: (i % 6) * 0.05 }}
          >
            <img
              src={item.src}
              alt={item.title}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              onError={e => { (e.currentTarget as HTMLImageElement).style.opacity = '0.2' }}
            />

            {/* Bottom gradient overlay */}
            <div
              className="absolute inset-x-0 bottom-0 pointer-events-none"
              style={{
                height: '50%',
                background: 'linear-gradient(to top, rgba(6,14,15,0.92) 0%, transparent 100%)',
              }}
            />

            {/* Tag */}
            <div
              className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
              style={{
                background: 'rgba(6,14,15,0.75)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(139,183,175,0.18)',
                color: 'var(--text-secondary)',
              }}
            >
              {item.tag}
            </div>

            {/* Title */}
            <div className="absolute bottom-4 left-4 right-4">
              <p
                className="text-base font-semibold leading-tight"
                style={{ color: 'var(--text-primary)' }}
              >
                {item.title}
              </p>
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
