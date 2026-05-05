'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Clock, Check, ArrowRight } from 'lucide-react'
import { Plan } from '@/lib/types'

interface PlansSectionProps {
  plans: Plan[]
  onAccept: (planId: string) => void
}

function PlanCard({
  plan,
  index,
  onAccept,
}: {
  plan: Plan
  index: number
  onAccept: (id: string) => void
}) {
  const isRec = plan.is_recommended

  return (
    <motion.div
      className="relative flex flex-col"
      initial={{ opacity: 0, y: 48 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.65, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
      style={{ zIndex: isRec ? 2 : 1, transform: isRec ? 'translateY(-12px)' : 'none' }}
    >
      {/* Outer glow for recommended */}
      {isRec && (
        <div className="absolute pointer-events-none" style={{
          inset: '-32px',
          background: 'radial-gradient(ellipse at 50% 20%, rgba(139,183,175,0.12) 0%, transparent 70%)',
          filter: 'blur(20px)',
          zIndex: 0,
        }} />
      )}

      {/* Card */}
      <div
        className="relative flex flex-col flex-1 overflow-hidden"
        style={{
          borderRadius: '28px',
          background: isRec
            ? `
              radial-gradient(ellipse 100% 55% at 50% 115%, rgba(195,225,219,0.32) 0%, transparent 60%),
              radial-gradient(ellipse 70% 50% at 15% 0%,  rgba(139,183,175,0.22) 0%, transparent 55%),
              radial-gradient(ellipse 60% 40% at 90% 10%, rgba(107,168,158,0.18) 0%, transparent 50%),
              linear-gradient(170deg, #0E3C3D 0%, #082828 45%, #051A1A 100%)
            `
            : 'linear-gradient(170deg, rgba(15,57,58,0.6) 0%, rgba(7,31,32,0.8) 100%)',
          border: isRec
            ? '1px solid rgba(184,212,208,0.30)'
            : '1px solid rgba(139,183,175,0.1)',
          backdropFilter: 'blur(32px)',
          boxShadow: isRec
            ? '0 40px 100px rgba(0,0,0,0.7), 0 0 0 1px rgba(244,249,157,0.08), 0 0 80px rgba(244,249,157,0.06)'
            : '0 8px 32px rgba(0,0,0,0.3)',
        }}
      >
        {/* Top gradient line — neon shimmer for recommended */}
        <div className="absolute top-0 left-0 right-0" style={{
          height: '1px',
          background: isRec
            ? 'linear-gradient(90deg, transparent 0%, rgba(139,183,175,0.5) 20%, rgba(244,249,157,0.9) 50%, rgba(139,183,175,0.5) 80%, transparent 100%)'
            : 'linear-gradient(90deg, transparent, rgba(139,183,175,0.2) 50%, transparent)',
        }} />

        {/* Bottom neon glow layer */}
        {isRec && (
          <div className="absolute bottom-0 left-0 right-0 pointer-events-none" style={{
            height: '180px',
            background: 'linear-gradient(to top, rgba(244,249,157,0.07) 0%, transparent 100%)',
          }} />
        )}

        {/* ── TOP BODY ── */}
        <div style={{ padding: 'clamp(1.5rem, 4vw, 2.25rem)', paddingBottom: '1.5rem' }}>

          {/* Badge row */}
          <div className="flex items-center justify-between mb-6">
            <span style={{
              fontSize: '0.6rem',
              fontWeight: 600,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: isRec ? 'rgba(184,212,208,0.5)' : 'var(--text-muted)',
            }}>
              {String(index + 1).padStart(2, '0')}
            </span>
            {isRec && (
              <span style={{
                fontSize: '0.58rem',
                fontWeight: 700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                padding: '0.25rem 0.75rem',
                borderRadius: '999px',
                background: '#F4F99D',
                border: '1px solid #F4F99D',
                color: '#071F20',
              }}>
                Mais escolhido
              </span>
            )}
          </div>

          {/* Plan name */}
          <h3 style={{
            fontFamily: '"ivypresto-display", Georgia, serif',
            fontWeight: 300,
            fontStyle: 'italic',
            fontSize: isRec ? 'clamp(1.6rem, 3vw, 2rem)' : 'clamp(1.4rem, 2.5vw, 1.75rem)',
            lineHeight: 1.1,
            color: 'var(--text-primary)',
            marginBottom: '0.3rem',
            letterSpacing: '-0.02em',
          }}>
            {plan.name}<sup style={{ fontSize: '0.45em', color: 'var(--teal)', fontWeight: 400, fontStyle: 'normal' }}>™</sup>
          </h3>

          {/* Tagline — destaque visual */}
          <div style={{ marginBottom: '1.5rem' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: isRec ? '0.35rem 0.9rem' : '0.28rem 0.75rem',
              borderRadius: '999px',
              background: isRec
                ? 'linear-gradient(135deg, rgba(184,212,208,0.18) 0%, rgba(139,183,175,0.10) 100%)'
                : 'rgba(139,183,175,0.08)',
              border: isRec
                ? '1px solid rgba(184,212,208,0.35)'
                : '1px solid rgba(139,183,175,0.18)',
              fontSize: isRec ? '0.68rem' : '0.62rem',
              fontWeight: 700,
              letterSpacing: '0.09em',
              textTransform: 'uppercase',
              color: isRec ? 'var(--green-pastel)' : 'var(--teal)',
            }}>
              {isRec && (
                <span style={{
                  width: '5px', height: '5px', borderRadius: '50%',
                  background: 'var(--green-pastel)',
                  boxShadow: '0 0 6px rgba(184,212,208,0.8)',
                  flexShrink: 0,
                }} />
              )}
              {plan.tagline}
            </span>
          </div>

          {/* Divider */}
          <div style={{
            height: '1px',
            marginBottom: '1.5rem',
            background: isRec
              ? 'linear-gradient(90deg, rgba(184,212,208,0.2), transparent)'
              : 'linear-gradient(90deg, rgba(139,183,175,0.1), transparent)',
          }} />

          {/* Description */}
          <p style={{
            fontSize: '0.8125rem',
            lineHeight: 1.75,
            color: 'var(--text-secondary)',
            marginBottom: '1.25rem',
          }}>
            {plan.description}
          </p>

          {/* Delivery pill */}
          <div className="inline-flex items-center gap-2 mb-5" style={{
            padding: '0.45rem 0.9rem',
            borderRadius: '999px',
            background: 'rgba(139,183,175,0.06)',
            border: '1px solid rgba(139,183,175,0.12)',
          }}>
            <Clock size={10} style={{ color: 'var(--teal)' }} />
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
              Primeira versão em{' '}
              <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                {plan.delivery_days} dias úteis
              </strong>
            </span>
          </div>

          {/* Features */}
          <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
            {plan.features.map((f, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
                <div style={{
                  width: '16px', height: '16px', borderRadius: '50%', flexShrink: 0, marginTop: '1px',
                  background: isRec ? 'rgba(184,212,208,0.08)' : 'rgba(139,183,175,0.06)',
                  border: isRec ? '1px solid rgba(184,212,208,0.2)' : '1px solid rgba(139,183,175,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Check size={8} style={{ color: isRec ? 'var(--green-pastel)' : 'var(--teal)' }} />
                </div>
                <span style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{f}</span>
              </li>
            ))}
          </ul>
        </div>

      </div>

      {/* ── CARD INFERIOR — Investimento + CTA ── */}
      <div style={{
        marginTop: '3px',
        borderRadius: '24px',
        position: 'relative',
        overflow: 'hidden',
        background: isRec
          ? 'linear-gradient(160deg, rgba(18,62,64,0.98) 0%, rgba(8,34,36,1) 100%)'
          : 'rgba(15,57,58,0.55)',
        border: isRec
          ? '1px solid rgba(184,212,208,0.28)'
          : '1px solid rgba(139,183,175,0.1)',
        backdropFilter: 'blur(24px)',
        boxShadow: isRec
          ? 'inset 0 1px 0 rgba(184,212,208,0.18), 0 16px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(184,212,208,0.06)'
          : 'none',
        padding: 'clamp(1.25rem, 3vw, 1.75rem)',
        textAlign: 'center',
      }}>
        {/* Shimmer top line for recommended */}
        {isRec && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
            background: 'linear-gradient(90deg, transparent 0%, rgba(244,249,157,0.5) 30%, rgba(184,212,208,0.8) 50%, rgba(244,249,157,0.5) 70%, transparent 100%)',
          }} />
        )}
        {/* Subtle radial glow behind price */}
        {isRec && (
          <div style={{
            position: 'absolute', top: '-20px', left: '50%', transform: 'translateX(-50%)',
            width: '200px', height: '120px', borderRadius: '50%',
            background: 'radial-gradient(ellipse, rgba(184,212,208,0.07) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />
        )}

        {/* INVESTIMENTO label */}
        <p style={{
          fontSize: '0.6rem',
          fontWeight: 700,
          letterSpacing: '0.25em',
          textTransform: 'uppercase',
          color: isRec ? 'rgba(184,212,208,0.55)' : 'var(--text-muted)',
          marginBottom: '0.75rem',
        }}>
          Investimento
        </p>

        {/* Price */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
          <span style={{
            fontSize: '1rem',
            fontWeight: 300,
            color: isRec ? 'var(--green-pastel)' : 'var(--text-secondary)',
            fontFamily: '"ivypresto-display", Georgia, serif',
          }}>R$</span>
          <span style={{
            fontFamily: '"ivypresto-display", Georgia, serif',
            fontWeight: 300,
            fontSize: isRec ? 'clamp(3.5rem, 6.5vw, 4.5rem)' : 'clamp(2.75rem, 5vw, 3.5rem)',
            lineHeight: 1,
            letterSpacing: '-0.03em',
            color: isRec ? 'var(--green-pastel)' : 'var(--text-primary)',
            textShadow: isRec ? '0 0 40px rgba(184,212,208,0.25)' : 'none',
          }}>
            {plan.price_cash.toLocaleString('pt-BR')}
          </span>
        </div>

        <p style={{
          fontSize: '0.6rem',
          fontWeight: 600,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: isRec ? 'rgba(139,183,175,0.5)' : 'var(--text-muted)',
          marginBottom: '1.25rem',
        }}>
          ou {plan.price_installments_count}× de R$ {plan.price_installment_value.toFixed(0)} no cartão
        </p>

        {/* CTA */}
        <button
          onClick={() => onAccept(plan.id)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.6rem',
            padding: isRec ? '1.1rem 1.5rem' : '1rem 1.5rem',
            borderRadius: '999px',
            background: isRec
              ? 'linear-gradient(135deg, #C8E6E0 0%, var(--green-pastel) 50%, #A8D4CC 100%)'
              : 'linear-gradient(135deg, #C3E0DB 0%, #A8D4CC 100%)',
            color: '#071F20',
            border: 'none',
            fontFamily: 'var(--font-inter)',
            fontWeight: 700,
            fontSize: isRec ? '0.75rem' : '0.72rem',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            transition: 'all 0.25s ease',
            boxShadow: isRec ? '0 4px 24px rgba(184,212,208,0.3), 0 0 0 1px rgba(184,212,208,0.15) inset' : '0 4px 16px rgba(195,224,219,0.18)',
          }}
          onMouseEnter={e => {
            const el = e.currentTarget
            if (isRec) { el.style.boxShadow = '0 8px 40px rgba(184,212,208,0.5), 0 0 0 1px rgba(184,212,208,0.2) inset'; el.style.transform = 'translateY(-2px)' }
            else { el.style.boxShadow = '0 8px 28px rgba(195,224,219,0.32)'; el.style.transform = 'translateY(-2px)' }
          }}
          onMouseLeave={e => {
            const el = e.currentTarget
            if (isRec) { el.style.boxShadow = '0 4px 24px rgba(184,212,208,0.3), 0 0 0 1px rgba(184,212,208,0.15) inset'; el.style.transform = 'none' }
            else { el.style.boxShadow = '0 4px 16px rgba(195,224,219,0.18)'; el.style.transform = 'none' }
          }}
        >
          Escolher plano
          <ArrowRight size={14} />
        </button>

        <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
          <span style={{ marginRight: '0.35rem', opacity: 0.5 }}>✦</span>
          {plan.highlight_phrase}
        </p>
      </div>
    </motion.div>
  )
}

export function PlansSection({ plans, onAccept }: PlansSectionProps) {
  const gridCols =
    plans.length === 3
      ? 'grid-cols-1 md:grid-cols-3'
      : plans.length === 2
      ? 'grid-cols-1 md:grid-cols-2 max-w-2xl mx-auto'
      : 'grid-cols-1 max-w-sm mx-auto'

  return (
    <section
      className="section relative"
      style={{ background: 'var(--bg-void)', overflow: 'visible' }}
    >
      {/* Radial glow — topo centro */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle 800px at 50% 0%, rgba(139,183,175,0.12), transparent 70%), radial-gradient(circle 400px at 50% 0%, rgba(244,249,157,0.06), transparent 50%)',
          zIndex: 0,
        }}
      />
      {/* Section header */}
      <div className="max-w-6xl mx-auto px-4 text-center" style={{ marginBottom: '3.5rem' }}>
        <motion.h1
          className="font-bold mb-5"
          style={{
            fontSize: 'clamp(2rem, 4.5vw, 3.25rem)',
            lineHeight: 1.15,
            color: 'var(--text-primary)',
          }}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
        >
          Um investimento que{' '}
          <span className="text-gradient-teal font-display italic">traz resultados.</span>
        </motion.h1>

        <motion.p
          className="text-lg max-w-xl mx-auto mb-10"
          style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          Seu projeto precisa de um visual que passe credibilidade e gere resultado.
          Escolha o plano ideal para o seu momento.
        </motion.p>

      </div>

      {/* Cards grid */}
      <div
        className="max-w-6xl mx-auto px-4"
        style={{ paddingBottom: '2rem' }}
      >
        <div className={`grid gap-4 items-start md:items-end ${gridCols}`}>
          {plans.map((plan, i) => (
            <PlanCard key={plan.id} plan={plan} index={i} onAccept={onAccept} />
          ))}
        </div>
      </div>
    </section>
  )
}
