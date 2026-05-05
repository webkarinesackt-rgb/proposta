import { mockProposal } from '@/lib/mockData'
import { ProposalPage } from '@/components/ProposalPage'
import { ProposalFromStorage } from '@/components/ProposalFromStorage'

interface PageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ tab?: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params
  if (slug === 'demo' || slug === mockProposal.slug) {
    return {
      title: `Proposta para ${mockProposal.client_name} — Fysi Lab Digital`,
      description: mockProposal.hero_subtitle,
    }
  }
  return { title: 'Proposta — Fysi Lab Digital' }
}

export default async function ProposalSlugPage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const { tab } = await searchParams
  const initialTab = tab === 'proposta' ? 'proposta' : 'cliente'

  if (slug === 'demo' || slug === mockProposal.slug) {
    return <ProposalPage proposal={mockProposal} initialTab={initialTab} />
  }

  return <ProposalFromStorage slug={slug} initialTab={initialTab} />
}
