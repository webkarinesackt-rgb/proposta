import { notFound } from 'next/navigation'
import { mockProposal } from '@/lib/mockData'
import { ProposalPage } from '@/components/ProposalPage'
import { supabase } from '@/lib/supabase'
import { Proposal } from '@/lib/types'

interface PageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ tab?: string }>
}

async function fetchProposal(slug: string): Promise<Proposal | null> {
  if (slug === 'demo' || slug === mockProposal.slug) return mockProposal

  const { data, error } = await supabase
    .from('proposals')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()

  if (error || !data) return null
  return { ...(data.data as Proposal), id: data.id, slug: data.slug, status: data.status }
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params
  const proposal = await fetchProposal(slug)
  if (!proposal) return { title: 'Proposta não encontrada — Fysi Lab Digital' }

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
  const initialTab = tab === 'proposta' ? 'proposta' : 'cliente'

  const proposal = await fetchProposal(slug)
  if (!proposal) notFound()
  // modelo é material interno: nunca abre pra cliente
  if (proposal.is_template) notFound()

  return <ProposalPage proposal={proposal} initialTab={initialTab} />
}
