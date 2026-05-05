'use client'

import { motion } from 'framer-motion'
import { FileSignature, FileText, Palette, RefreshCw, Globe, Gauge } from 'lucide-react'
import RadialOrbitalTimeline from '@/components/ui/radial-orbital-timeline'

const FASES = [
  {
    id: 1,
    title: 'Onboarding',
    date: 'Fase 1',
    content: 'Assinatura do contrato, alinhamento de expectativas e preenchimento do briefing completo do projeto.',
    category: 'Início',
    icon: FileSignature,
    relatedIds: [2],
    status: 'completed' as const,
    energy: 100,
  },
  {
    id: 2,
    title: 'Textos',
    date: 'Fase 2',
    content: 'Criação e revisão de todos os textos e copies da página, alinhados com a estratégia da marca.',
    category: 'Conteúdo',
    icon: FileText,
    relatedIds: [1, 3],
    status: 'completed' as const,
    energy: 100,
  },
  {
    id: 3,
    title: 'Design no Figma',
    date: 'Fase 3',
    content: 'Desenvolvimento do layout visual completo no Figma, com apresentação para aprovação do cliente.',
    category: 'Design',
    icon: Palette,
    relatedIds: [2, 4],
    status: 'in-progress' as const,
    energy: 70,
  },
  {
    id: 4,
    title: 'Ajustes',
    date: 'Fase 4',
    content: 'Rodada de revisões e refinamentos com base no feedback do cliente até aprovação final.',
    category: 'Revisão',
    icon: RefreshCw,
    relatedIds: [3, 5],
    status: 'pending' as const,
    energy: 40,
  },
  {
    id: 5,
    title: 'Implementação',
    date: 'Fase 5',
    content: 'Desenvolvimento e publicação online do projeto aprovado, com testes em todos os dispositivos.',
    category: 'Dev',
    icon: Globe,
    relatedIds: [4, 6],
    status: 'pending' as const,
    energy: 20,
  },
  {
    id: 6,
    title: 'Otimização',
    date: 'Fase 6',
    content: 'Ajustes de performance, velocidade de carregamento e SEO técnico para garantir a melhor experiência.',
    category: 'Performance',
    icon: Gauge,
    relatedIds: [5],
    status: 'pending' as const,
    energy: 10,
  },
]

export function FasesSection() {
  return (
    <section
      style={{ background: 'var(--bg-void)', minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}
    >
      {/* Spinning logo decorativo */}
      <img
        src="/logo_fysi.png"
        alt=""
        aria-hidden
        className="absolute pointer-events-none select-none"
        style={{
          width: '500px',
          height: '500px',
          objectFit: 'contain',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          opacity: 0.03,
          filter: 'brightness(0) invert(1)',
          zIndex: 0,
        }}
      />
      {/* Header */}
      <div className="text-center pt-12 pb-4 flex-shrink-0 px-4" style={{ position: 'relative', zIndex: 1 }}>
        <motion.span
          className="badge-teal mb-4 inline-block"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          Como trabalhamos
        </motion.span>
        <motion.h2
          className="font-bold mb-3"
          style={{ color: 'var(--text-primary)' }}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          As fases do seu{' '}
          <span className="text-gradient-teal font-display italic">projeto</span>
        </motion.h2>
        <motion.p
          className="text-sm max-w-md mx-auto"
          style={{ color: 'var(--text-secondary)' }}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
        >
          Clique em cada fase para ver os detalhes.<br />Um processo claro do início ao fim.
        </motion.p>
      </div>

      {/* Orbital */}
      <RadialOrbitalTimeline
        timelineData={FASES}
        className="h-[70vh]"
      />
    </section>
  )
}
