import { ImageResponse } from 'next/og'

export const alt = 'Fysi Lab Digital — Proposta Online'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// Card de compartilhamento (WhatsApp/Instagram/etc). Gerado — identidade
// preto + lima, sem depender de imagem externa.
export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          background: '#141414',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div
            style={{
              width: 18,
              height: 72,
              background: '#D6F23C',
              borderRadius: 4,
            }}
          />
          <div
            style={{
              fontSize: 74,
              fontWeight: 800,
              color: '#FFFFFF',
              letterSpacing: -2,
            }}
          >
            Fysi Lab Digital
          </div>
        </div>
        <div
          style={{
            fontSize: 40,
            color: '#D6F23C',
            fontWeight: 700,
            marginTop: 28,
          }}
        >
          Proposta Online
        </div>
        <div
          style={{
            fontSize: 26,
            color: '#9B9B9B',
            marginTop: 14,
            maxWidth: 820,
          }}
        >
          Sistema estruturado de conversão — sites e landing pages de alto padrão.
        </div>
      </div>
    ),
    { ...size }
  )
}
