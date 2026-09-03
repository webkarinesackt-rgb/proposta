import { ImageResponse } from 'next/og'
import { supabase } from '@/lib/supabase'
import { mockProposal } from '@/lib/mockData'
import { Proposal } from '@/lib/types'

export const alt = 'Proposta — Fysi Lab Digital'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

/* Card de compartilhamento da proposta (WhatsApp, Instagram, LinkedIn).
   O card do site inteiro (app/opengraph-image.tsx) não valia aqui: esta
   rota define openGraph próprio, então sem uma imagem neste segmento o
   link ia sem preview nenhum. Identidade da página pública (verde escuro
   + verde pastel), não a do painel. */

async function fetchProposal(slug: string): Promise<Proposal | null> {
  if (slug === 'demo' || slug === mockProposal.slug) return mockProposal
  const { data, error } = await supabase
    .from('proposals')
    .select('data')
    .eq('slug', slug)
    .maybeSingle()
  if (error || !data) return null
  return data.data as Proposal
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const proposal = await fetchProposal(slug)
  const cliente = proposal?.client_company?.trim() || proposal?.client_name?.trim() || ''
  const plano = proposal?.selected_plans?.[0]?.name?.trim() || ''

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '76px 84px',
          background: '#071F20',
          fontFamily: 'sans-serif',
        }}
      >
        {/* marca */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ width: 14, height: 44, background: '#B8D4D0', borderRadius: 3 }} />
          <div style={{ fontSize: 30, fontWeight: 700, color: '#F0F6F5', letterSpacing: -0.5 }}>
            Fysi Lab Digital
          </div>
        </div>

        {/* nome do cliente em destaque */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              fontSize: 24,
              fontWeight: 600,
              letterSpacing: 6,
              textTransform: 'uppercase',
              color: '#8BB7AF',
            }}
          >
            Proposta
          </div>
          <div
            style={{
              fontSize: cliente.length > 22 ? 76 : 96,
              fontWeight: 800,
              color: '#F0F6F5',
              letterSpacing: -3,
              lineHeight: 1.05,
              marginTop: 18,
              maxWidth: 1000,
            }}
          >
            {cliente || 'Fysi Lab Digital'}
          </div>
          {plano && (
            <div style={{ fontSize: 30, color: '#B8D4D0', marginTop: 22 }}>{plano}</div>
          )}
        </div>

        {/* rodapé */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 24, color: '#5C8B86' }}>
          <div style={{ width: 8, height: 8, borderRadius: 4, background: '#B8D4D0' }} />
          Sistema Estruturado de Conversão
        </div>
      </div>
    ),
    { ...size }
  )
}
