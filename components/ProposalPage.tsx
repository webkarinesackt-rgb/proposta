'use client'

import { useEffect, useRef } from 'react'
import { Proposal } from '@/lib/types'
import { proposalStore } from '@/lib/proposalStore'
import { HeroSection } from './cliente/HeroSection'
import { DepoimentosSection } from './cliente/DepoimentosSection'
import { QuemSection } from './cliente/QuemSection'
import { DiferenciaisSection } from './cliente/DiferenciaisSection'
import { ExpertsSection } from './cliente/ExpertsSection'
import { BannerEmocional } from './cliente/BannerEmocional'
import { FAQSection } from './cliente/FAQSection'
import { PlansSection } from './proposta/PlansSection'
import { InfraSection } from './proposta/InfraSection'
import { CTASection } from './proposta/CTASection'
import { FasesSection } from './proposta/FasesSection'
import { CasesCarousel } from './cliente/CasesCarousel'
import { JackMarqueeSection } from './proposta/JackMarqueeSection'
import { HeroGeometric } from './ui/shape-landing-hero'
import { ImageCarouselHero } from './ui/ai-image-generator-hero'

const PORTFOLIO_IMAGES = [
  { id: '1', src: '/portfolio/imgi_127_5a0680233771747.Y3JvcCw4MTAsNjMzLDAsMA.png',     alt: 'Projeto 1', rotation: -15 },
  { id: '2', src: '/portfolio/imgi_143_f43434240508597.Y3JvcCwxMTU5LDkwNiwxMjAsMA.jpg', alt: 'Projeto 2', rotation: -8  },
  { id: '3', src: '/portfolio/imgi_37_9debcd230443075.Y3JvcCwxMjE1LDk1MCwwLDA.jpg',     alt: 'Projeto 3', rotation: 5   },
  { id: '4', src: '/portfolio/imgi_153_9c467d230786083.Y3JvcCwyNDMwLDE5MDAsMCww.png',   alt: 'Projeto 4', rotation: 12  },
  { id: '5', src: '/portfolio/imgi_177_2474e0236210813.Y3JvcCw4MTAsNjMzLDAsNA.png',     alt: 'Projeto 5', rotation: -10 },
  { id: '6', src: '/portfolio/imgi_203_24871a237912593.Y3JvcCwxNTQ0LDEyMDgsMCww.png',   alt: 'Projeto 6', rotation: 8   },
]

interface ProposalPageProps {
  proposal: Proposal
  initialTab?: 'cliente' | 'proposta'
  /** true quando é a Karine olhando (/p/preview, via "Prévia"/"Copiar link"
   *  no editor) — nunca marca como "vista" nesse caso, só numa visita real
   *  ao link público em /p/[slug]. */
  isPreview?: boolean
}

export function ProposalPage({ proposal, isPreview }: ProposalPageProps) {
  const plansRef = useRef<HTMLDivElement>(null)
  const casesRef = useRef<HTMLDivElement>(null)
  const ctaRef = useRef<HTMLDivElement>(null)

  // Marca como "vista" quando o cliente realmente abre a página (roda só
  // no navegador, depois de hidratar — bots de preview de link em geral
  // não executam JS, então não disparam isso à toa). Só sai de "enviada"
  // pra "vista"; não mexe se já foi aceita/recusada/etc. Nunca dispara em
  // modo prévia (isPreview) — senão a própria Karine conferindo a proposta
  // já marcaria como vista pelo cliente.
  useEffect(() => {
    if (!isPreview && proposal.id && proposal.status === 'sent') {
      proposalStore.updateStatus(proposal.id, 'viewed').catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const scrollToPlans = () => {
    plansRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const scrollToCases = () => {
    casesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const scrollToCta = () => {
    ctaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleAccept = (_planId?: string) => {
    scrollToCta()
  }

  const isExpired =
    proposal.valid_until && new Date(proposal.valid_until) < new Date()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-void)' }}>
      {isExpired && (
        <div
          className="w-full py-3 px-4 text-center text-sm font-semibold"
          style={{
            background: 'rgba(220, 60, 60, 0.12)',
            borderBottom: '1px solid rgba(220, 60, 60, 0.2)',
            color: '#F87171',
          }}
        >
          Esta proposta expirou.{' '}
          <a
            href={`https://api.whatsapp.com/send/?phone=${proposal.agency_settings.contact_whatsapp}&text&type=phone_number&app_absent=0`}
            className="underline"
          >
            Entre em contato
          </a>{' '}
          para uma nova versão.
        </div>
      )}

      <HeroSection
        proposal={proposal}
        onSeeProposal={scrollToPlans}
        onSeeCases={scrollToCases}
      />
      <div ref={casesRef}>
        <CasesCarousel />
      </div>
      <DepoimentosSection testimonials={proposal.testimonials} />

      <FasesSection />

      <JackMarqueeSection />

      <div ref={plansRef}>
        <PlansSection
          plans={proposal.selected_plans}
          items={proposal.page_items}
          onAccept={(planId) => handleAccept(planId)}
          projectType={proposal.project_type}
          currency={proposal.currency}
          exchangeRate={proposal.exchange_rate}
        />
        <InfraSection blocks={proposal.agency_settings.infra_blocks} />
        {proposal.agency_settings.experts && proposal.agency_settings.experts.length > 0 && (
          <ExpertsSection experts={proposal.agency_settings.experts} />
        )}
        <ImageCarouselHero
          title=""
          subtitle=""
          description=""
          ctaText=""
          onCtaClick={scrollToPlans}
          images={PORTFOLIO_IMAGES}
          features={[]}
        />
        <div ref={ctaRef}>
          <CTASection
            contactWhatsapp={proposal.agency_settings.contact_whatsapp}
            validUntil={proposal.valid_until}
            onAccept={() => handleAccept()}
          />
        </div>
      </div>

      <QuemSection settings={proposal.agency_settings} />
<FAQSection
        items={proposal.agency_settings.faq_items}
        contactWhatsapp={proposal.agency_settings.contact_whatsapp}
      />

      <HeroGeometric
        badge="Fysi Lab Digital"
        title1="Transforme sua presença"
        title2="digital agora"
        onAccept={() => handleAccept()}
      />

      <footer
        className="py-8 text-center text-xs"
        style={{
          borderTop: '1px solid var(--border-subtle)',
          color: 'var(--text-muted)',
          background: 'var(--bg-void)',
        }}
      >
        <span style={{ color: 'var(--text-secondary)' }}>Fysi Lab Digital</span>
        {' · '}
        Sistema Estruturado de Conversão ™
        {' · '}
        <a
          href={`https://api.whatsapp.com/send/?phone=${proposal.agency_settings.contact_whatsapp}&text&type=phone_number&app_absent=0`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'var(--teal)' }}
        >
          Contato
        </a>
      </footer>
    </div>
  )
}
