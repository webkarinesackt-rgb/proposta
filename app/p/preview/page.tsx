'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ProposalPage } from '@/components/ProposalPage'
import { mockProposal } from '@/lib/mockData'
import { Proposal } from '@/lib/types'
import { ArrowLeft, Eye } from 'lucide-react'

export default function PreviewPage() {
  const [proposal, setProposal] = useState<Proposal | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem('fysi_draft')
    if (stored) {
      try {
        setProposal(JSON.parse(stored))
        return
      } catch {}
    }
    setProposal(mockProposal)
  }, [])

  if (!proposal) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-void)',
        }}
      >
        <div
          className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: 'var(--teal)', borderTopColor: 'transparent' }}
        />
      </div>
    )
  }

  return (
    <>
      {/* preview banner */}
      <div
        className="sticky top-0 z-[999] flex items-center justify-between px-5 py-2.5"
        style={{
          background: '#162322',
          borderBottom: '1px solid rgba(139,183,175,0.15)',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] px-2.5 py-1 rounded-full"
            style={{ background: 'rgba(244,249,157,0.12)', color: '#F4F99D' }}
          >
            <Eye size={10} />
            Modo prévia
          </div>
          <span className="text-[11px] hidden sm:block" style={{ color: '#6BA89E' }}>
            Assim seu cliente verá a proposta
          </span>
        </div>
        <Link
          href="/admin"
          className="flex items-center gap-1.5 text-[11px] font-semibold transition-colors hover:opacity-80"
          style={{ color: '#8BB7AF' }}
        >
          <ArrowLeft size={12} />
          Editar proposta
        </Link>
      </div>

      <ProposalPage proposal={proposal} isPreview />
    </>
  )
}
