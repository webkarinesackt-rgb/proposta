'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { proposalStore } from '@/lib/proposalStore'
import { Proposal } from '@/lib/types'
import { X, PenLine, FileText, Plus } from 'lucide-react'

function proposalLink(slug: string) {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    (typeof window !== 'undefined' ? window.location.origin : '')
  return `${base}/p/${slug}`
}

export default function ProposalPicker({
  chatId,
  clientName,
  onClose,
  onInsert,
}: {
  chatId: string
  clientName?: string
  onClose: () => void
  onInsert: (text: string) => void
}) {
  const router = useRouter()
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')

  useEffect(() => {
    proposalStore
      .getAll()
      .then((p) => setProposals(p))
      .catch(() => setStatus('Erro ao carregar propostas.'))
      .finally(() => setLoading(false))
  }, [])

  // Insere a mensagem da proposta no campo de digitação pra editar antes de enviar.
  function insertProposal(p: Proposal) {
    const link = proposalLink(p.slug)
    onInsert(`Preparei a sua proposta, é só acessar:\n\n${link}`)
  }

  // Atalho: cria uma proposta nova já com o nome/telefone do cliente preenchidos.
  function novaProposta() {
    const name = (clientName || '').trim()
    // Contato não salvo: o "nome" da conversa costuma ser o próprio número.
    // Nesse caso NÃO preenche o campo Nome (deixa ela digitar o nome real).
    const nameIsPhone = /^[+(]?\d[\d\s()+-]{6,}$/.test(name)
    // Telefone: só usa o do ID se for um JID de telefone real. IDs "@lid" são
    // um código interno do WhatsApp — NÃO são o número, então nunca usar.
    let phone = ''
    if (chatId.includes('@s.whatsapp.net') || chatId.includes('@c.us')) {
      phone = (chatId.split('@')[0] || '').replace(/\D/g, '')
    } else if (nameIsPhone) {
      phone = name.replace(/\D/g, '')
    }
    const qs = new URLSearchParams()
    if (name && !nameIsPhone) qs.set('nome', name)
    if (phone) qs.set('whatsapp', phone)
    router.push(`/admin/new?${qs.toString()}`)
  }

  return (
    <>
      {/* backdrop para fechar ao clicar fora */}
      <div className="fixed inset-0 z-20" onClick={onClose} />

      <div
        className="absolute z-30 top-[58px] right-4 w-[330px] max-w-[calc(100vw-2rem)] rounded-2xl flex flex-col"
        style={{
          background: '#FFFFFF',
          border: '1px solid #E6E6E1',
          boxShadow: '0 16px 48px rgba(0,0,0,0.18)',
          maxHeight: '72vh',
        }}
      >
        {/* header */}
        <div
          className="px-4 py-3 flex items-center justify-between flex-shrink-0"
          style={{ borderBottom: '1px solid #E6E6E1' }}
        >
          <span className="text-[13px] font-bold text-[#141414]">Proposta</span>
          <button onClick={onClose} className="text-[#A8B5B0] hover:text-[#141414]">
            <X size={16} />
          </button>
        </div>

        {/* atalho: criar nova proposta já com o cliente preenchido */}
        <button
          onClick={novaProposta}
          className="mx-2 mt-2 flex-shrink-0 flex items-center justify-center gap-1.5 text-[12px] font-bold px-3 py-2 rounded-lg transition-opacity hover:opacity-90"
          style={{ background: '#141414', color: '#D6F23C' }}
        >
          <Plus size={14} /> Criar nova proposta
        </button>

        {status && (
          <div className="px-4 py-1.5 text-[11px] font-semibold text-[#B91C1C] flex-shrink-0">
            {status}
          </div>
        )}

        {/* lista de propostas existentes */}
        <div className="flex-1 min-h-0 overflow-y-auto p-2">
          {loading ? (
            <p className="text-[12px] text-[#A8B5B0] text-center py-8">Carregando…</p>
          ) : proposals.length === 0 ? (
            <p className="text-[12px] text-[#A8B5B0] text-center py-8">
              Nenhuma proposta criada ainda.
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              {proposals.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg"
                  style={{ background: '#F4F3EF' }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: '#E6E6E1', color: '#9B9B9B' }}
                  >
                    <FileText size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-bold text-[#141414] truncate">
                      {p.client_name}
                    </p>
                    <p className="text-[11px] text-[#9B9B9B] truncate">
                      {p.client_company || `/p/${p.slug}`}
                    </p>
                  </div>
                  <button
                    onClick={() => insertProposal(p)}
                    title="Inserir a mensagem no campo pra editar e enviar"
                    className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-md flex-shrink-0"
                    style={{ background: '#0D7A4A', color: '#FFFFFF' }}
                  >
                    <PenLine size={11} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
