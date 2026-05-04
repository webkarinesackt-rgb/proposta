'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, ArrowRight, MessageCircle, Shield, Clock } from 'lucide-react'

interface CTASectionProps {
  contactWhatsapp: string
  validUntil: string
  onAccept: () => void
}

export function CTASection({ contactWhatsapp, validUntil, onAccept }: CTASectionProps) {
  const [accepted, setAccepted] = useState(false)

  const daysLeft = Math.max(
    0,
    Math.ceil((new Date(validUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  )

  const handleAccept = () => {
    setAccepted(true)
    onAccept()
  }

  return (
    <section
      className="relative overflow-hidden"
      style={{ padding: '2rem 0 5rem', background: 'var(--bg-void)' }}
    >
      {/* Spinning logo — canto direito */}
      <img
        src="/logo_fysi.png"
        alt=""
        aria-hidden
        className="spin-slow absolute pointer-events-none select-none"
        style={{
          width: '260px',
          height: '260px',
          objectFit: 'contain',
          bottom: '-40px',
          right: '-40px',
          opacity: 0.05,
          filter: 'brightness(0) invert(1)',
          zIndex: 0,
        }}
      />

      {/* Ambient glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse, rgba(244,249,157,0.05) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />

      <div className="relative z-10 max-w-2xl mx-auto px-4 text-center">
        <AnimatePresence mode="wait">
          {!accepted ? (
            <motion.div
              key="cta"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
            >
              {/* Urgency badge */}
              {daysLeft > 0 && daysLeft <= 7 && (
                <div
                  className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full text-xs font-bold"
                  style={{
                    background: 'rgba(244,249,157,0.08)',
                    border: '1px solid rgba(244,249,157,0.28)',
                    color: 'var(--neon)',
                  }}
                >
                  <Clock size={12} />
                  Proposta válida por mais {daysLeft} dia{daysLeft !== 1 ? 's' : ''}
                </div>
              )}

              <h2
                className="text-3xl lg:text-4xl font-bold mb-4"
                style={{ color: 'var(--text-primary)' }}
              >
                Pronto para transformar
                <br />
                <span className="text-gradient-teal font-display italic">
                  sua presença digital?
                </span>
              </h2>

              <p className="text-sm mb-10" style={{ color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                Clique abaixo para aceitar a proposta.<br />
                Entraremos em contato em até 24h para alinhar os próximos passos.
              </p>

              {/* Trust signals */}
              <div className="flex flex-wrap justify-center gap-4 mb-10">
                {[
                  { icon: Shield, text: 'Sem compromisso de longo prazo' },
                  { icon: CheckCircle2, text: 'Processo 100% transparente' },
                  { icon: Clock, text: 'Início em até 48h' },
                ].map(({ icon: Icon, text }, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-xs"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <Icon size={13} style={{ color: 'var(--teal)' }} />
                    {text}
                  </div>
                ))}
              </div>

              {/* Primary CTA */}
              <div className="flex flex-row gap-3 justify-center flex-wrap">
                <button
                  className="btn-neon py-4 px-6 flex-1"
                  style={{ fontSize: '0.9rem', minWidth: '140px' }}
                  onClick={handleAccept}
                >
                  Aceitar proposta
                  <ArrowRight size={15} />
                </button>

                <a
                  href={`https://wa.me/${contactWhatsapp}?text=Olá! Tenho dúvidas sobre a proposta.`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-outline flex-1"
                  style={{ minWidth: '140px', justifyContent: 'center' }}
                >
                  <MessageCircle size={15} />
                  Tenho dúvidas
                </a>
              </div>

              {/* Fine print */}
              <p className="mt-6 text-xs" style={{ color: 'var(--text-muted)' }}>
                Ao aceitar, você confirma ter lido e concordado com o escopo descrito.
                Assinatura digital via Autentique.
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="py-8"
            >
              {/* Success icon */}
              <motion.div
                className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
                style={{
                  background: 'rgba(139,183,175,0.1)',
                  border: '2px solid rgba(139,183,175,0.4)',
                  boxShadow: '0 0 40px rgba(139,183,175,0.25)',
                }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              >
                <CheckCircle2 size={36} style={{ color: 'var(--teal)' }} />
              </motion.div>

              <h2 className="mb-3" style={{ color: 'var(--text-primary)' }}>
                Proposta aceita! 🎉
              </h2>
              <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                Incrível! Karine receberá uma notificação agora. Você vai receber
                um e-mail com os próximos passos em breve.
              </p>

              <a
                href={`https://wa.me/${contactWhatsapp}?text=Acabei de aceitar a proposta! Quando podemos começar?`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-neon inline-flex"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Confirmar pelo WhatsApp
              </a>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  )
}
