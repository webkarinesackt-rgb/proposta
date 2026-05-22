'use client'

import { useEffect, useState } from 'react'
import { proposalStore } from '@/lib/proposalStore'
import { Proposal } from '@/lib/types'
import { waServer } from '@/lib/waServer'
import { X, Send, FileText } from 'lucide-react'

function proposalLink(slug: string) {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    (typeof window !== 'undefined' ? window.location.origin : '')
  return `${base}/p/${slug}`
}

export default function ProposalPicker({
  chatId,
  onClose,
  onSent,
}: {
  chatId: string
  onClose: () => void
  onSent: () => void
}) {
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(true)
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [status, setStatus] = useState('')

  useEffect(() => {
    proposalStore
      .getAll()
      .then((p) => setProposals(p))
      .catch(() => setStatus('Erro ao carregar propostas.'))
      .finally(() => setLoading(false))
  }, [])

  async function send(p: Proposal) {
    if (!confirm(`Enviar a proposta de ${p.client_name} para esta conversa?`)) return
    setSendingId(p.id)
    setStatus('')
    const link = proposalLink(p.slug)
    const msg = `Olá! 👋 Preparei a sua proposta — é só acessar:\n\n${link}`
    try {
      const r = await waServer.sendText(chatId, msg)
      if (r.ok) {
        setStatus('Proposta enviada!')
        onSent()
        setTimeout(onClose, 900)
      } else {
        setStatus('Erro: ' + (r.error || ''))
      }
    } catch {
      setStatus('Erro ao enviar.')
    } finally {
      setSendingId(null)
    }
  }

  return (
    <>
      {/* backdrop para fechar ao clicar fora */}
      <div className="fixed inset-0 z-20" onClick={onClose} />

      <div
        className="absolute z-30 top-[58px] right-4 w-[330px] rounded-2xl flex flex-col"
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
          <span className="text-[13px] font-bold text-[#162322]">Enviar proposta</span>
          <button onClick={onClose} className="text-[#A8B5B0] hover:text-[#162322]">
            <X size={16} />
          </button>
        </div>

        {status && (
          <div className="px-4 py-1.5 text-[11px] font-semibold text-[#0D7A4A] flex-shrink-0">
            {status}
          </div>
        )}

        {/* lista */}
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
                    style={{ background: '#E6E6E1', color: '#8AA09A' }}
                  >
                    <FileText size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-bold text-[#162322] truncate">
                      {p.client_name}
                    </p>
                    <p className="text-[11px] text-[#8AA09A] truncate">
                      {p.client_company || `/p/${p.slug}`}
                    </p>
                  </div>
                  <button
                    disabled={sendingId === p.id}
                    onClick={() => send(p)}
                    className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-md flex-shrink-0 disabled:opacity-40"
                    style={{ background: '#0D7A4A', color: '#FFFFFF' }}
                  >
                    <Send size={11} />
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
