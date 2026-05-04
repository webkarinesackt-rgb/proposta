'use client'

import { motion } from 'framer-motion'

const STEPS = [
  {
    label: 'Briefing / documentação',
    note: 'É aqui que você entra na jornada',
    noteArrow: true,
  },
  {
    label: 'Conteúdo',
    side: 'Aqui acontecem algumas reuniões',
  },
  {
    label: 'Protótipo',
  },
  {
    label: 'Design',
    side: 'Primeiras impressões',
  },
  {
    label: 'Design final desktop\nDesign responsivo',
  },
  {
    label: 'Entrega 🚀',
    isLast: true,
  },
]

export function ProcessoSection() {
  return (
    <section
      className="section"
      style={{ background: 'var(--bg-void)', overflow: 'hidden' }}
    >
      <div className="max-w-2xl mx-auto px-4">

        {/* Header */}
        <motion.div
          className="mb-14"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="divider mb-4" />
          <h2 style={{ color: 'var(--text-primary)' }}>
            Etapas de{' '}
            <span style={{
              background: 'linear-gradient(135deg, var(--neon) 0%, var(--teal) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              desenvolvimento
            </span>
            <br />do seu projeto
          </h2>
        </motion.div>

        {/* Timeline */}
        <div className="relative">
          {/* Vertical line */}
          <motion.div
            className="absolute top-0 bottom-0"
            style={{
              left: '140px',
              width: '1px',
              background: 'linear-gradient(to bottom, transparent, rgba(139,183,175,0.3) 8%, rgba(139,183,175,0.3) 92%, transparent)',
              transformOrigin: 'top',
            }}
            initial={{ scaleY: 0 }}
            whileInView={{ scaleY: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.2, ease: 'easeOut' }}
          />

          <div className="flex flex-col" style={{ gap: '3.5rem' }}>
            {STEPS.map((step, i) => (
              <motion.div
                key={i}
                className="relative flex items-start"
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: i * 0.08 }}
              >
                {/* Left annotation */}
                <div
                  className="flex-shrink-0 text-right pr-5"
                  style={{ width: '132px', paddingTop: '2px' }}
                >
                  {step.side && (
                    <span
                      style={{
                        fontFamily: '"ivypresto-display", Georgia, serif',
                        fontStyle: 'italic',
                        fontWeight: 300,
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                        lineHeight: 1.4,
                      }}
                    >
                      {step.side}
                    </span>
                  )}
                  {step.note && (
                    <div className="flex flex-col items-end gap-1">
                      <span
                        style={{
                          fontSize: '0.7rem',
                          color: 'var(--text-muted)',
                          lineHeight: 1.4,
                          textAlign: 'right',
                        }}
                      >
                        {step.note}
                      </span>
                      {step.noteArrow && (
                        <svg width="20" height="24" viewBox="0 0 20 24" fill="none" style={{ marginRight: '4px' }}>
                          <path d="M10 0 Q14 8 10 16 L8 14 M10 16 L12 14" stroke="rgba(139,183,175,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                        </svg>
                      )}
                    </div>
                  )}
                </div>

                {/* Dot */}
                <div
                  className="flex-shrink-0 relative"
                  style={{ width: '16px', marginTop: '3px' }}
                >
                  <div
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: step.isLast
                        ? 'linear-gradient(135deg, var(--neon), var(--teal))'
                        : 'var(--teal)',
                      boxShadow: step.isLast
                        ? '0 0 12px rgba(196,232,121,0.5)'
                        : '0 0 8px rgba(139,183,175,0.4)',
                      marginLeft: '-4px',
                    }}
                  />
                </div>

                {/* Step label */}
                <div className="flex-1 pl-4">
                  {step.label.includes('\n') ? (
                    step.label.split('\n').map((line, j) => (
                      <p
                        key={j}
                        className="font-semibold"
                        style={{
                          color: step.isLast ? 'var(--neon)' : 'var(--text-primary)',
                          fontSize: '0.9375rem',
                          lineHeight: 1.5,
                        }}
                      >
                        {line}
                      </p>
                    ))
                  ) : (
                    <p
                      className="font-semibold"
                      style={{
                        color: step.isLast ? 'var(--neon)' : 'var(--text-primary)',
                        fontSize: '0.9375rem',
                        lineHeight: 1.5,
                      }}
                    >
                      {step.label}
                    </p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Delivery badge */}
        <motion.div
          className="mt-14 rounded-2xl px-6 py-5"
          style={{
            background: 'rgba(139,183,175,0.06)',
            border: '1px solid rgba(139,183,175,0.15)',
          }}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Prazo de entrega do projeto:
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                A partir da entrega dos materiais
              </p>
            </div>
            <div
              className="font-bold"
              style={{
                fontFamily: '"ivypresto-display", Georgia, serif',
                fontStyle: 'italic',
                fontSize: '2rem',
                color: 'var(--text-primary)',
              }}
            >
              15/20 dias
            </div>
          </div>

          {/* Breakdown */}
          <div
            className="mt-4 pt-4 grid grid-cols-2 gap-3"
            style={{ borderTop: '1px solid rgba(139,183,175,0.1)' }}
          >
            {[
              { label: 'Com copy incluso', value: '12 dias úteis' },
              { label: 'Sem copy (você fornece)', value: '6 dias úteis' },
            ].map((item, i) => (
              <div key={i} className="flex flex-col gap-1">
                <span className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  {item.label}
                </span>
                <span
                  className="font-bold text-sm"
                  style={{ color: i === 0 ? 'var(--neon)' : 'var(--teal)' }}
                >
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

      </div>
    </section>
  )
}
