'use client'

import { motion, useReducedMotion } from 'framer-motion'
import {
  MousePointerClick,
  Video,
  MoveVertical,
  Monitor,
  Tablet,
  Smartphone,
  MousePointer2,
  ArrowUpDown,
  Eye,
  Flame,
} from 'lucide-react'

/* ── Seção "Mapa de calor incluso" (Microsoft Clarity) ──
   Mostra que o site sai com o Clarity instalado. À direita, um mock do
   painel do Clarity: janela clara com a barra de modos (Toque/Rolar/Atenção,
   dispositivos), abas Gravações/Mapas de calor, e uma página em wireframe
   branco com o mapa de calor arco-íris (vermelho→amarelo→verde→azul) por
   cima, pulsando. Respeita reduced-motion. */

const BENEFITS = [
  { icon: MousePointerClick, title: 'Mapa de calor', text: 'Onde as pessoas clicam — e o que ignoram.' },
  { icon: Video, title: 'Gravação de sessões', text: 'A navegação real, tela a tela, como aconteceu.' },
  { icon: MoveVertical, title: 'Profundidade de rolagem', text: 'Até onde cada visitante chega na página.' },
]

// gradiente clássico de mapa de calor: quente no centro, esfriando pra fora
const HEAT_GRADIENT =
  'radial-gradient(ellipse at center, rgba(255,32,32,0.92) 0%, rgba(255,120,0,0.85) 22%, rgba(255,230,0,0.7) 42%, rgba(70,220,90,0.45) 62%, rgba(40,130,255,0.3) 80%, transparent 95%)'

// manchas de calor sobre a página (posição em %, tamanho em % da largura)
const HEAT = [
  { left: '22%', top: '46%', w: 34, h: 68, delay: 0 }, // coluna de conteúdo — o grande vermelho
  { left: '52%', top: '22%', w: 26, h: 20, delay: 1.1 }, // barra de busca / CTA
  { left: '74%', top: '13%', w: 14, h: 12, delay: 2.0 }, // item do menu
  { left: '58%', top: '58%', w: 18, h: 16, delay: 2.8 }, // card de resultado
]

function HeatBlob({
  left,
  top,
  w,
  h,
  delay,
  still,
}: {
  left: string
  top: string
  w: number
  h: number
  delay: number
  still: boolean
}) {
  return (
    <motion.div
      aria-hidden
      style={{
        position: 'absolute',
        left,
        top,
        width: `${w}%`,
        paddingBottom: `${h}%`,
        transform: 'translate(-50%, -50%)',
        borderRadius: '50%',
        background: HEAT_GRADIENT,
        filter: 'blur(10px)',
        pointerEvents: 'none',
      }}
      initial={{ opacity: 0.9 }}
      animate={still ? { opacity: 0.92 } : { opacity: [0.75, 1, 0.75] }}
      transition={still ? { duration: 0 } : { duration: 3.6, repeat: Infinity, ease: 'easeInOut', delay }}
    />
  )
}

/* bloco cinza do wireframe (página clara) */
function Block({ w, h, style }: { w: string; h: number; style?: React.CSSProperties }) {
  return <div style={{ width: w, height: h, borderRadius: 4, background: 'rgba(15,40,70,0.10)', ...style }} />
}

function ClarityMock({ still }: { still: boolean }) {
  const ink = '#1a3b6b'
  return (
    <div
      className="relative w-full overflow-hidden"
      style={{
        borderRadius: 18,
        background: '#F4F6F9',
        border: '1px solid rgba(255,255,255,0.35)',
        boxShadow: '0 30px 80px rgba(0,0,0,0.45), 0 0 0 1px rgba(0,0,0,0.25)',
        fontFamily: 'var(--font-inter), Inter, sans-serif',
      }}
    >
      {/* ── barra de modos do Clarity ── */}
      <div
        className="flex items-center gap-2 flex-wrap"
        style={{ padding: '10px 12px', background: '#FFFFFF', borderBottom: '1px solid rgba(15,40,70,0.10)' }}
      >
        {/* dispositivos */}
        <div className="flex" style={{ border: `1px solid ${ink}`, borderRadius: 6, overflow: 'hidden' }}>
          {[Monitor, Tablet, Smartphone].map((Icon, i) => (
            <span
              key={i}
              className="flex items-center justify-center"
              style={{
                width: 28,
                height: 24,
                background: i === 0 ? '#E8F0FB' : '#FFFFFF',
                borderRight: i < 2 ? `1px solid ${ink}` : 'none',
              }}
            >
              <Icon size={12} style={{ color: ink }} />
            </span>
          ))}
        </div>
        {/* modos */}
        <div className="flex" style={{ border: `1px solid ${ink}`, borderRadius: 6, overflow: 'hidden' }}>
          {[
            { Icon: MousePointer2, label: 'Toque', active: true },
            { Icon: ArrowUpDown, label: 'Rolar', active: false },
            { Icon: Eye, label: 'Atenção', active: false },
          ].map(({ Icon, label, active }, i) => (
            <span
              key={label}
              className="flex items-center gap-1.5"
              style={{
                padding: '0 10px',
                height: 24,
                background: active ? '#E8F0FB' : '#FFFFFF',
                borderRight: i < 2 ? `1px solid ${ink}` : 'none',
                fontSize: '0.66rem',
                fontWeight: 600,
                color: ink,
                whiteSpace: 'nowrap',
              }}
            >
              <Icon size={11} style={{ color: ink, fill: active ? ink : 'none' }} />
              {label}
            </span>
          ))}
        </div>
        {/* abas Gravações / Mapas de calor */}
        <div className="flex items-end gap-4 ml-auto" style={{ fontSize: '0.66rem', color: '#4a5568' }}>
          <span className="flex items-center gap-1.5" style={{ paddingBottom: 4 }}>
            <Video size={11} /> Gravações
          </span>
          <span
            className="flex items-center gap-1.5"
            style={{ paddingBottom: 4, borderBottom: '2px solid #8A7CF0', color: '#111827', fontWeight: 700 }}
          >
            <Flame size={11} /> Mapas de calor
          </span>
        </div>
      </div>

      {/* ── página do cliente (wireframe claro) + mapa de calor por cima ── */}
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: '4 / 3', background: '#FFFFFF' }}>
        {/* header do site */}
        <div
          className="flex items-center justify-between"
          style={{ padding: '10px 14px', background: '#1E63C7' }}
        >
          <div style={{ width: '16%', height: 9, borderRadius: 4, background: 'rgba(255,255,255,0.9)' }} />
          <div className="flex gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} style={{ width: 26, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.7)' }} />
            ))}
          </div>
        </div>
        {/* busca / hero */}
        <div style={{ padding: '10px 14px', background: '#EEF3FA', borderBottom: '1px solid rgba(15,40,70,0.08)' }}>
          <div className="flex gap-2 items-center">
            <Block w="28%" h={14} style={{ background: '#FFFFFF', border: '1px solid rgba(15,40,70,0.15)' }} />
            <Block w="22%" h={14} style={{ background: '#FFFFFF', border: '1px solid rgba(15,40,70,0.15)' }} />
            <div style={{ width: '12%', height: 14, borderRadius: 4, background: '#1E63C7' }} />
          </div>
        </div>
        {/* corpo: lista de resultados + sidebar */}
        <div className="flex gap-3" style={{ padding: '10px 14px' }}>
          <div className="flex-1 flex flex-col gap-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3"
                style={{ padding: '7px 8px', borderRadius: 6, border: '1px solid rgba(15,40,70,0.10)', background: '#FFFFFF' }}
              >
                <Block w="12%" h={10} style={{ background: '#1E63C7', opacity: 0.85 }} />
                <Block w="30%" h={7} />
                <Block w="18%" h={7} />
                <div style={{ marginLeft: 'auto', width: '16%', height: 12, borderRadius: 3, background: '#1E63C7' }} />
              </div>
            ))}
          </div>
          <div className="hidden sm:flex flex-col gap-2" style={{ width: '26%' }}>
            <div style={{ height: 64, borderRadius: 6, background: '#FFE8A3' }} />
            <Block w="100%" h={7} />
            <Block w="80%" h={7} />
            <Block w="90%" h={7} />
            <div style={{ height: 40, borderRadius: 6, background: '#E3EDF9' }} />
          </div>
        </div>

        {/* lavagem fria (azul) — o "frio" do mapa, por baixo do calor */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'rgba(60,140,255,0.16)' }}
        />

        {/* manchas de calor */}
        {HEAT.map((h, i) => (
          <HeatBlob key={i} {...h} still={still} />
        ))}
      </div>
    </div>
  )
}

export function ClaritySection() {
  const reduced = useReducedMotion()
  const still = !!reduced

  return (
    <section className="section relative" style={{ background: 'var(--bg-void)' }}>
      <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-[5fr_7fr] gap-10 md:gap-14 items-center">
        {/* texto */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <p
            style={{
              fontSize: '0.62rem',
              fontWeight: 700,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'var(--teal)',
              marginBottom: '1.25rem',
            }}
          >
            Incluso no projeto
          </p>
          <h2
            style={{
              fontFamily: '"ivypresto-display", "ivypresto-headline", Georgia, serif',
              fontStyle: 'italic',
              fontWeight: 300,
              fontSize: 'clamp(2rem, 4.5vw, 3.1rem)',
              lineHeight: 1.08,
              letterSpacing: '-0.01em',
              color: 'var(--text-primary)',
              marginBottom: '1.25rem',
            }}
          >
            Veja onde seus clientes clicam.
          </h2>
          {/* uma linha só — o mock é quem conta a história */}
          <p style={{ fontSize: '0.95rem', lineHeight: 1.7, color: 'var(--text-secondary)', maxWidth: '34ch' }}>
            Microsoft Clarity instalado no seu site. Sem mensalidade.
          </p>

          {/* benefícios: só ícone + nome */}
          <ul className="mt-7 flex flex-col gap-3">
            {BENEFITS.map(({ icon: Icon, title }) => (
              <li key={title} className="flex items-center gap-3">
                <span
                  className="flex items-center justify-center flex-shrink-0"
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 9,
                    background: 'rgba(139,183,175,0.08)',
                    border: '1px solid rgba(139,183,175,0.18)',
                  }}
                >
                  <Icon size={14} style={{ color: 'var(--green-pastel)' }} />
                </span>
                <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>{title}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        {/* mock do painel do Clarity, animado */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
        >
          <ClarityMock still={still} />
        </motion.div>
      </div>
    </section>
  )
}
