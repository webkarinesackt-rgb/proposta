import { notFound } from 'next/navigation'
import { mockProposal } from '@/lib/mockData'
import { ProposalPage } from '@/components/ProposalPage'

interface PageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ tab?: string }>
}

async function getProposal(slug: string) {
  // Phase 1: return mock data for any slug
  // Phase 2+: fetch from Supabase by slug
  if (slug === 'demo' || slug === mockProposal.slug) {
    return mockProposal
  }
  // Simulate "not found" for unknown slugs in demo mode
  return null
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params
  const proposal = await getProposal(slug)

  if (!proposal) {
    return { title: 'Proposta não encontrada' }
  }

  return {
    title: `Proposta para ${proposal.client_name} — Fysi Lab Digital`,
    description: proposal.hero_subtitle,
    openGraph: {
      title: `Proposta para ${proposal.client_name}`,
      description: proposal.hero_subtitle,
      siteName: 'Fysi Lab Digital',
    },
  }
}

export default async function ProposalSlugPage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const { tab } = await searchParams

  const proposal = await getProposal(slug)

  if (!proposal) {
    notFound()
  }

  const initialTab =
    tab === 'proposta' ? 'proposta' : 'cliente'

  return (
    <ProposalPage
      proposal={proposal}
      initialTab={initialTab}
    />
  )
}
