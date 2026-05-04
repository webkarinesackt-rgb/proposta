'use client'

import { motion } from 'framer-motion'
import { CheckCircle2 } from 'lucide-react'
import { AgencySettings } from '@/lib/types'

interface QuemSectionProps {
  settings: AgencySettings
}

const achievements = [
  '500+ projetos entregues',
  'Método próprio de conversão',
  'Especialista em nichos de saúde e serviços',
  'Presença digital premium para profissionais de referência',
]

export function QuemSection({ settings }: QuemSectionProps) {
  return (
    <section
      className="section"
      style={{
        background: 'linear-gradient(180deg, var(--bg-base) 0%, var(--bg-void) 100%)',
      }}
    >
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Photo side */}
          <motion.div
            className="relative"
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            {/* Photo frame */}
            <div
              className="relative w-full max-w-[400px] mx-auto rounded-2xl overflow-hidden"
              style={{
                aspectRatio: '3/4',
                background: '#0D2324',
                border: '1px solid var(--border-glow)',
                boxShadow: '0 0 60px rgba(139,183,175,0.1)',
              }}
            >
              {/* Photo — fills frame */}
              <img
                src={settings.photo_url || '/sobre/sobre_karine.jpg'}
                alt="Karine Sackt"
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'top center',
                  display: 'block',
                  zIndex: 1,
                }}
              />

              {/* Subtle bottom gradient so bar is readable */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: '50%',
                  background: 'linear-gradient(to top, rgba(7,20,21,0.85) 0%, transparent 100%)',
                  zIndex: 2,
                }}
              />

              {/* Floating bar image */}
              <motion.div
                style={{
                  position: 'absolute',
                  bottom: '1.25rem',
                  left: '1rem',
                  right: '1rem',
                  zIndex: 3,
                }}
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              >
                <img
                  src="/barraflutuante.png"
                  alt=""
                  style={{ width: '100%', height: 'auto', display: 'block' }}
                />
              </motion.div>
            </div>

          </motion.div>

          {/* Text side */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <div className="divider mb-5" />
            <h2 className="mb-6" style={{ color: 'var(--text-primary)' }}>
              Quem será responsável
              <br />
              <span className="text-gradient-teal">pelo seu projeto?</span>
            </h2>

            <p className="text-sm leading-loose mb-8" style={{ color: 'var(--text-secondary)' }}>
              {settings.about_bio}
            </p>

            {/* Achievements */}
            <div className="space-y-3">
              {achievements.map((item, i) => (
                <motion.div
                  key={i}
                  className="flex items-start gap-3"
                  initial={{ opacity: 0, x: 16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.1 + i * 0.07 }}
                >
                  <CheckCircle2 size={16} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--teal)' }} />
                  <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{item}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
