'use client'

import { useEffect, useState } from 'react'
import { proposalStore } from '@/lib/proposalStore'
import { ProposalPage } from '@/components/ProposalPage'
import { Proposal } from '@/lib/types'

interface Props {
  slug: string
  initialTab?: 'cliente' | 'proposta'
}

export function ProposalFromStorage({ slug, initialTab = 'cliente' }: Props) {
  const [proposal, setProposal] = useState<Proposal | null | undefined>(undefined)

  useEffect(() => {
    const found = proposalStore.getAll().find(p => p.slug === slug)
    setProposal(found ?? null)
  }, [slug])

  if (proposal === undefined) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-void)' }}>
        <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--teal)', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  if (proposal === null) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-void)', flexDirection: 'column', gap: '1rem' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>Proposta não encontrada.</p>
        <a href="/admin" style={{ color: 'var(--teal)', fontSize: '0.875rem' }}>← Voltar ao painel</a>
      </div>
    )
  }

  return <ProposalPage proposal={proposal} initialTab={initialTab} />
}
