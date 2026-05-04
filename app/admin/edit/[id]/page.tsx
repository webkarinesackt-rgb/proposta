'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { proposalStore } from '@/lib/proposalStore'
import { Proposal } from '@/lib/types'
import ProposalForm from '@/components/admin/ProposalForm'

export default function EditProposalPage() {
  const { id } = useParams<{ id: string }>()
  const [proposal, setProposal] = useState<Proposal | null | undefined>(undefined)

  useEffect(() => {
    setProposal(proposalStore.get(id) ?? null)
  }, [id])

  if (proposal === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#ECEAE3' }}>
        <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: '#0D3839', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  if (proposal === null) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: '#ECEAE3' }}>
        <p className="text-[14px] text-[#8AA09A]">Proposta não encontrada.</p>
        <a href="/admin" className="text-[12px] font-bold text-[#0D3839] underline">Voltar ao painel</a>
      </div>
    )
  }

  return <ProposalForm mode="edit" initial={proposal} />
}
