'use client'

import { motion } from 'framer-motion'
import { ArrowRight, ChevronDown } from 'lucide-react'
import { Proposal } from '@/lib/types'
import { RadialGlowBackground } from '@/components/ui/radial-glow-background'

interface HeroSectionProps {
  proposal: Proposal
  onSeeProposal: () => void
}

export function HeroSection({ proposal, onSeeProposal }: HeroSectionProps) {
  const { hero_title, hero_subtitle, hero_description, client_name, agency_settings } = proposal

  return (
    <section
      className="relative overflow-hidden min-h-[92vh] flex items-center hero-section"
      style={{ paddingTop: '4rem', paddingBottom: '4rem', background: 'var(--bg-void)' }}
    >
      <style>{`
        @media (max-width: 768px) {
          .hero-section {
            padding-top: 2rem !important;
            padding-bottom: 2.5rem !important;
            min-height: auto !important;
            align-items: flex-start !important;
          }
        }
      `}</style>

      {/* Elegant teal gradient — primary atmosphere */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 70% 60% at 82% 18%, rgba(107,168,158,0.30) 0%, rgba(107,168,158,0.08) 45%, transparent 65%),
            radial-gradient(ellipse 45% 55% at 88% 78%, rgba(139,183,175,0.14) 0%, transparent 55%),
            radial-gradient(ellipse 60% 50% at 8% 88%, rgba(7,31,32,0.7) 0%, transparent 60%),
            radial-gradient(ellipse 100% 50% at 50% 0%, rgba(11,44,46,0.35) 0%, transparent 50%)
          `,
          zIndex: 1,
        }}
      />

      {/* Background image — hidden on mobile */}
      <img
        src="/Banner/backgroundbanner.webp"
        alt=""
        className="absolute inset-0 w-full h-full hero-bg-img"
        style={{ zIndex: 2, objectFit: 'cover', objectPosition: 'center' }}
      />
      <style>{`
        @media (max-width: 768px) {
          .hero-bg-img {
            display: none !important;
          }
        }
      `}</style>

      {/* Dark overlay sobre a imagem */}
      <div
        className="absolute inset-0 hero-overlay"
        style={{
          background: 'linear-gradient(180deg, rgba(7,31,32,0.88) 0%, rgba(7,31,32,0.95) 70%, rgba(7,31,32,1) 100%)',
          zIndex: 3,
        }}
      />
      <style>{`
        @media (max-width: 768px) {
          .hero-overlay {
            background: transparent !important;
          }
        }
      `}</style>

      {/* Grid dot pattern */}
      <div className="absolute inset-0 bg-dots opacity-20" style={{ zIndex: 4 }} />

      {/* Radial glow teal — topo centro */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle 700px at 50% -60px, rgba(139,183,175,0.18), transparent)',
          zIndex: 4,
        }}
      />


      <div className="relative max-w-6xl mx-auto px-4 w-full" style={{ zIndex: 10 }}>
        <div className="max-w-2xl">
          <div>
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div
                className="mb-5 inline-flex items-center gap-2"
                style={{
                  background: 'rgba(15,40,42,0.7)',
                  borderRadius: '10px',
                  padding: '4px 12px 4px 4px',
                  border: '1px solid rgba(139,183,175,0.15)',
                  backdropFilter: 'blur(8px)',
                  fontFamily: 'var(--font-inter), "Inter", sans-serif',
                }}
              >
                <span
                  style={{
                    background: 'var(--green-pastel)',
                    color: '#071F20',
                    borderRadius: '6px',
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    padding: '0.3rem 0.7rem',
                  }}
                >
                  Proposta
                </span>
                <span
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    color: 'var(--text-secondary)',
                    letterSpacing: '0.01em',
                  }}
                >
                  {client_name}
                </span>
              </div>
            </motion.div>

            {/* Main headline */}
            <motion.h1
              className="text-gradient-hero font-display"
              style={{
                fontSize: 'clamp(2.5rem, 5vw, 3.75rem)',
                lineHeight: 1.1,
                fontWeight: 300,
                marginBottom: '1.25rem',
              }}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              {hero_title}
            </motion.h1>

            {/* Description */}
            <motion.p
              style={{
                color: 'var(--text-secondary)',
                fontSize: 'clamp(0.9rem, 2.5vw, 1.0625rem)',
                lineHeight: 1.75,
                marginBottom: '1.75rem',
                maxWidth: '520px',
                width: '100%',
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              {hero_description}
            </motion.p>

            {/* CTAs */}
            <motion.div
              className="flex flex-wrap gap-3 mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <button className="btn-neon" onClick={onSeeProposal}>
                Ver proposta
                <ArrowRight size={15} />
              </button>
              <button className="btn-ghost">
                Nossos cases
                <ChevronDown size={15} />
              </button>
            </motion.div>

            {/* Social proof */}
            <motion.div
              className="flex items-center gap-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.45 }}
            >
              <img
                src="/atendidos.png"
                alt="Clientes atendidos"
                className="h-10 w-auto"
              />
              <div>
                <div
                  className="text-sm font-bold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {agency_settings.social_proof_text}
                </div>
                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  com presença digital de alto padrão
                </div>
              </div>
            </motion.div>

            {/* Client logos — auto-scroll marquee */}
            <motion.div
              className="mt-6 pt-6"
              style={{ borderTop: '1px solid var(--border-subtle)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.55 }}
            >
              <p className="text-xs uppercase tracking-widest mb-5" style={{ color: 'var(--text-muted)' }}>
                Clientes que confiam
              </p>

              {/* Marquee track */}
              <div
                style={{
                  overflow: 'hidden',
                  maxWidth: '100%',
                  maskImage: 'linear-gradient(to right, transparent 0%, black 6%, black 90%, transparent 100%)',
                  WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 6%, black 90%, transparent 100%)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    gap: '40px',
                    width: 'max-content',
                    animation: 'logos-scroll 50s linear infinite',
                    alignItems: 'center',
                  }}
                >
                  {[...agency_settings.logos_clients, ...agency_settings.logos_clients].map((logo, i) => (
                    <img
                      key={i}
                      src={logo.url}
                      alt={logo.name}
                      style={{
                        height: '52px',
                        width: 'auto',
                        objectFit: 'contain',
                        flexShrink: 0,
                        opacity: 0.65,
                        filter: 'brightness(0) invert(1)',
                      }}
                      onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                    />
                  ))}
                </div>
              </div>

              <style>{`
                @keyframes logos-scroll {
                  0%   { transform: translateX(0); }
                  100% { transform: translateX(-50%); }
                }
              `}</style>
            </motion.div>
          </div>

        </div>
      </div>

      {/* Bottom fade para fundir com a próxima seção */}
      <div
        className="absolute bottom-0 left-0 right-0 pointer-events-none"
        style={{
          height: '120px',
          background: 'linear-gradient(to bottom, transparent, #071F20)',
          zIndex: 8,
        }}
      />

      {/* Scroll indicator — desktop only */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 items-center gap-2 hidden md:flex md:flex-col"
        style={{ zIndex: 20 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        <span className="text-xs uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
          scroll
        </span>
        <ChevronDown
          size={16}
          style={{ color: 'var(--text-muted)' }}
          className="animate-bounce"
        />
      </motion.div>
    </section>
  )
}
