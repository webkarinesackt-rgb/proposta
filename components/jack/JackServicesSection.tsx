'use client'

import { FadeIn } from './FadeIn'

const SERVICES = [
  {
    number: '01',
    name: '3D Modeling',
    description:
      'Creation of detailed objects, characters, or environments tailored to specific client needs, ideal for games, products, and visualizations.',
  },
  {
    number: '02',
    name: 'Rendering',
    description:
      'High-quality, photorealistic renders that showcase designs with custom lighting, textures, and materials to bring concepts to life.',
  },
  {
    number: '03',
    name: 'Motion Design',
    description:
      'Dynamic animations and motion graphics that add energy and storytelling to brands, products, and digital experiences.',
  },
  {
    number: '04',
    name: 'Branding',
    description:
      'Crafting cohesive visual identities — from logos to full brand systems — that communicate a clear and memorable presence.',
  },
  {
    number: '05',
    name: 'Web Design',
    description:
      'Designing clean, modern, and conversion-focused websites with attention to layout, typography, and user experience.',
  },
]

export function JackServicesSection() {
  return (
    <section
      className="px-5 sm:px-8 md:px-10 py-20 sm:py-24 md:py-32"
      style={{
        background: '#FFFFFF',
        borderRadius: '40px 40px 0 0',
      }}
    >
      <h2
        className="font-black uppercase text-center mb-16 sm:mb-20 md:mb-28"
        style={{
          fontFamily: 'var(--font-kanit), Kanit, sans-serif',
          fontSize: 'clamp(3rem, 12vw, 160px)',
          color: '#0C0C0C',
          lineHeight: 1,
        }}
      >
        Services
      </h2>

      <div className="max-w-5xl mx-auto">
        {SERVICES.map((service, i) => (
          <FadeIn key={service.number} delay={i * 0.1} y={20}>
            <div
              className="flex items-center gap-6 py-8 sm:py-10 md:py-12"
              style={{
                borderTop: i === 0 ? '1px solid rgba(12,12,12,0.15)' : undefined,
                borderBottom: '1px solid rgba(12,12,12,0.15)',
              }}
            >
              {/* Number */}
              <span
                className="font-black leading-none flex-shrink-0"
                style={{
                  fontFamily: 'var(--font-kanit), Kanit, sans-serif',
                  fontSize: 'clamp(3rem, 10vw, 140px)',
                  color: '#0C0C0C',
                  lineHeight: 1,
                }}
              >
                {service.number}
              </span>

              {/* Name + description */}
              <div className="flex flex-col gap-2">
                <span
                  className="font-medium uppercase"
                  style={{
                    fontFamily: 'var(--font-kanit), Kanit, sans-serif',
                    fontSize: 'clamp(1rem, 2.2vw, 2.1rem)',
                    color: '#0C0C0C',
                  }}
                >
                  {service.name}
                </span>
                <span
                  className="font-light leading-relaxed max-w-2xl"
                  style={{
                    fontFamily: 'var(--font-kanit), Kanit, sans-serif',
                    fontSize: 'clamp(0.85rem, 1.6vw, 1.25rem)',
                    color: '#0C0C0C',
                    opacity: 0.6,
                  }}
                >
                  {service.description}
                </span>
              </div>
            </div>
          </FadeIn>
        ))}
      </div>
    </section>
  )
}
