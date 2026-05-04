'use client'

import { motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import { PageItem } from '@/lib/types'

interface PagePricingSectionProps {
  items: PageItem[]
  priceCash: number
  priceInstallmentsCount: number
  priceInstallmentValue: number
  contactWhatsapp: string
  onAccept: () => void
}

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export function PagePricingSection({
  items,
  priceCash,
  priceInstallmentsCount,
  priceInstallmentValue,
  contactWhatsapp,
  onAccept,
}: PagePricingSectionProps) {
  const total = items.reduce<number>((sum, item) => {
    return sum + (item.price === 'incluso' ? 0 : item.price)
  }, 0)

  const cashPrice = priceCash || total
  const cashDiscount = total > cashPrice ? total - cashPrice : 0

  return (
    <section
      className="section"
      style={{ background: 'linear-gradient(160deg, #042B30 0%, #071F20 100%)' }}
    >
      <div className="max-w-2xl mx-auto px-4">

        {/* Header */}
        <motion.div
          className="mb-10 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
            style={{
              border: '1px solid rgba(139,183,175,0.2)',
              color: 'rgba(139,183,175,0.7)',
              fontSize: '11px',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
          >
            <span style={{ color: 'var(--neon)' }}>◈</span>
            Bora para o que mais interessa?
          </div>

          <h2 style={{ color: 'var(--text-primary)' }}>
            Investimento para
            <br />
            <span style={{
              background: 'linear-gradient(135deg, var(--neon) 0%, var(--teal) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              o projeto:
            </span>
          </h2>
        </motion.div>

        {/* Page items */}
        <div className="space-y-3 mb-10">
          {items.map((item, i) => (
            <motion.div
              key={item.id}
              className="flex items-center gap-4 px-5 py-4 rounded-2xl"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(139,183,175,0.1)',
              }}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.07 }}
            >
              <ChevronRight size={14} style={{ color: 'var(--teal)', flexShrink: 0 }} />

              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                  {item.name}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {item.subtitle}
                </p>
              </div>

              {item.price === 'incluso' ? (
                <span
                  className="flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider"
                  style={{
                    background: 'rgba(139,183,175,0.15)',
                    color: 'var(--teal)',
                    border: '1px solid rgba(139,183,175,0.2)',
                  }}
                >
                  Incluso
                </span>
              ) : (
                <span
                  className="flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-bold"
                  style={{
                    background: 'linear-gradient(135deg, rgba(13,70,72,0.9), rgba(13,56,57,0.9))',
                    color: 'var(--neon)',
                    border: '1px solid rgba(139,183,175,0.25)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  R$ {fmt(item.price)}
                </span>
              )}
            </motion.div>
          ))}
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px solid rgba(139,183,175,0.1)', marginBottom: '2.5rem' }} />

        {/* Formas de pagamento */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          <h2 className="mb-6" style={{ color: 'var(--text-primary)', textAlign: 'left' }}>
            Formas de{' '}
            <span style={{
              background: 'linear-gradient(135deg, var(--neon) 0%, var(--teal) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              pagamento
            </span>
          </h2>

          <div className="space-y-3">
            {/* À vista */}
            <div
              className="flex items-center gap-4 px-5 py-4 rounded-2xl"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(139,183,175,0.1)',
              }}
            >
              <ChevronRight size={14} style={{ color: 'var(--teal)', flexShrink: 0 }} />
              <div className="flex-1">
                <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                  Integral (à vista)
                </p>
                {cashDiscount > 0 && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    Economia de R$ {fmt(cashDiscount)}
                  </p>
                )}
              </div>
              <span
                className="flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-bold"
                style={{
                  background: cashDiscount > 0
                    ? 'linear-gradient(135deg, var(--neon), var(--teal))'
                    : 'linear-gradient(135deg, rgba(13,70,72,0.9), rgba(13,56,57,0.9))',
                  color: cashDiscount > 0 ? '#071F20' : 'var(--neon)',
                  border: cashDiscount > 0 ? 'none' : '1px solid rgba(139,183,175,0.25)',
                  whiteSpace: 'nowrap',
                }}
              >
                {cashDiscount > 0 ? `R$${fmt(cashDiscount)} OFF` : `R$ ${fmt(cashPrice)}`}
              </span>
            </div>

            {/* Parcelado */}
            {priceInstallmentsCount > 0 && (
              <div
                className="flex items-center gap-4 px-5 py-4 rounded-2xl"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(139,183,175,0.1)',
                }}
              >
                <ChevronRight size={14} style={{ color: 'var(--teal)', flexShrink: 0 }} />
                <div className="flex-1">
                  <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                    Parcelado em {priceInstallmentsCount}x
                  </p>
                </div>
                <span
                  className="flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-bold"
                  style={{
                    background: 'linear-gradient(135deg, rgba(13,70,72,0.9), rgba(13,56,57,0.9))',
                    color: 'var(--neon)',
                    border: '1px solid rgba(139,183,175,0.25)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {priceInstallmentsCount}x R$ {fmt(priceInstallmentValue)}
                </span>
              </div>
            )}
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          className="mt-10 text-center"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <button className="btn-neon w-full justify-center py-4 text-base" onClick={onAccept}>
            Quero começar meu projeto
          </button>
          <p className="text-xs mt-4" style={{ color: 'var(--text-muted)' }}>
            Ou{' '}
            <a
              href={`https://wa.me/${contactWhatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--teal)', textDecoration: 'underline' }}
            >
              fale diretamente no WhatsApp
            </a>
            {' '}para tirar dúvidas.
          </p>
        </motion.div>
      </div>
    </section>
  )
}
