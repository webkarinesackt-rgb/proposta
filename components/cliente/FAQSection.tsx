'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Minus } from 'lucide-react'
import { FAQItem } from '@/lib/types'

interface FAQSectionProps {
  items: FAQItem[]
  contactWhatsapp: string
}

function FAQRow({ item, index }: { item: FAQItem; index: number }) {
  const [open, setOpen] = useState(false)

  return (
    <motion.div
      className="faq-item"
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.06 }}
    >
      <button className="faq-trigger" onClick={() => setOpen(!open)}>
        <span className="pr-4">{item.question}</span>
        <div
          className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300"
          style={{
            background: open ? 'rgba(139,183,175,0.15)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${open ? 'rgba(139,183,175,0.32)' : 'rgba(255,255,255,0.06)'}`,
            color: open ? 'var(--teal)' : 'var(--text-secondary)',
          }}
        >
          {open ? <Minus size={13} /> : <Plus size={13} />}
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <p
              className="pb-5 text-sm leading-relaxed"
              style={{ color: 'var(--text-secondary)' }}
            >
              {item.answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export function FAQSection({ items, contactWhatsapp }: FAQSectionProps) {
  return (
    <section className="section">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <motion.h2
            className="mb-3"
            style={{ color: 'var(--text-primary)' }}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            Perguntas que
            <span className="text-gradient-teal"> podem surgir</span>
          </motion.h2>
          <motion.p
            className="text-sm"
            style={{ color: 'var(--text-secondary)' }}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            Respondemos as dúvidas mais comuns dos nossos clientes.
          </motion.p>
        </div>

        {/* FAQ list */}
        <div>
          {items.map((item, i) => (
            <FAQRow key={i} item={item} index={i} />
          ))}
        </div>

        {/* CTA */}
        <motion.div
          className="mt-12 text-center"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
            Ainda com dúvidas? Não hesite em nos contatar!
          </p>
          <a
            href={`https://wa.me/${contactWhatsapp}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-outline inline-flex"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" style={{ color: 'var(--teal)' }}>
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Falar pelo WhatsApp
          </a>
        </motion.div>
      </div>
    </section>
  )
}
