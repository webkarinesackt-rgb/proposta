'use client'

import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { FadeIn } from './FadeIn'
import { LiveProjectButton } from './LiveProjectButton'

const PROJECTS = [
  {
    number: '01',
    category: 'Client',
    name: 'Nextlevel Studio',
    col1: [
      'https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260412_055344_5eff02e0-87a5-41ce-b64f-eb08da8f33db.png&w=1280&q=85',
      'https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260412_055431_11d841fd-8b41-46a5-82e4-b04f2407a7d8.png&w=1280&q=85',
    ],
    col2: 'https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260412_055451_e317bf2d-28d4-48cc-86b0-6f72f25b6327.png&w=1280&q=85',
  },
  {
    number: '02',
    category: 'Personal',
    name: 'Aura Brand Identity',
    col1: [
      'https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260412_055654_911201c5-36d9-4bc6-bac7-331adfce159f.png&w=1280&q=85',
      'https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260412_055723_5ceda0b8-d9c2-4665-b2e3-83ba19ba76d1.png&w=1280&q=85',
    ],
    col2: 'https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260412_055753_adc5dcbd-a8e6-49c0-b43a-9b030d835cea.png&w=1280&q=85',
  },
  {
    number: '03',
    category: 'Client',
    name: 'Solaris Digital',
    col1: [
      'https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260412_055759_963cfb0b-4bd1-4b0f-9d0a-09bd6cf95b2f.png&w=1280&q=85',
      'https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260412_060108_438f781a-9846-4dcc-89ab-c4e6cb830f5b.png&w=1280&q=85',
    ],
    col2: 'https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260412_055818_9d062121-ad7e-46b9-999a-1a6a692ef1ee.png&w=1280&q=85',
  },
]

const TOTAL = PROJECTS.length
const BORDER_RADIUS = 'clamp(30px, 5vw, 60px)'

function ProjectCard({
  project,
  index,
  totalRef,
}: {
  project: (typeof PROJECTS)[0]
  index: number
  totalRef: React.RefObject<HTMLDivElement | null>
}) {
  const cardRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: totalRef,
    offset: ['start start', 'end end'],
  })

  const targetScale = 1 - (TOTAL - 1 - index) * 0.03
  const scale = useTransform(
    scrollYProgress,
    [index / TOTAL, 1],
    [1, targetScale]
  )

  return (
    <div
      style={{ height: '85vh', display: 'flex', alignItems: 'flex-start', paddingTop: index * 28 }}
      className="sticky top-24 md:top-32"
    >
      <motion.div
        ref={cardRef}
        style={{
          scale,
          transformOrigin: 'top center',
          borderRadius: BORDER_RADIUS,
          border: '2px solid #D7E2EA',
          background: '#0C0C0C',
          width: '100%',
        }}
        className="p-4 sm:p-6 md:p-8"
      >
        {/* Top row */}
        <div className="flex items-center justify-between mb-4 sm:mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-4 sm:gap-6">
            <span
              className="font-black leading-none"
              style={{
                fontFamily: 'var(--font-kanit), Kanit, sans-serif',
                fontSize: 'clamp(2.5rem, 8vw, 100px)',
                color: '#D7E2EA',
                lineHeight: 1,
              }}
            >
              {project.number}
            </span>
            <div className="flex flex-col">
              <span
                className="uppercase tracking-widest font-medium"
                style={{
                  fontFamily: 'var(--font-kanit), Kanit, sans-serif',
                  color: '#D7E2EA',
                  opacity: 0.5,
                  fontSize: 'clamp(0.65rem, 1.2vw, 0.9rem)',
                }}
              >
                {project.category}
              </span>
              <span
                className="font-black uppercase"
                style={{
                  fontFamily: 'var(--font-kanit), Kanit, sans-serif',
                  fontSize: 'clamp(1rem, 2.5vw, 2rem)',
                  color: '#D7E2EA',
                }}
              >
                {project.name}
              </span>
            </div>
          </div>
          <LiveProjectButton />
        </div>

        {/* Image grid */}
        <div className="flex gap-3 sm:gap-4">
          {/* Col 1 — 40% */}
          <div className="flex flex-col gap-3 sm:gap-4" style={{ flex: '0 0 40%' }}>
            <img
              src={project.col1[0]}
              alt={project.name}
              className="w-full object-cover"
              style={{
                borderRadius: BORDER_RADIUS,
                height: 'clamp(130px, 16vw, 230px)',
              }}
            />
            <img
              src={project.col1[1]}
              alt={project.name}
              className="w-full object-cover"
              style={{
                borderRadius: BORDER_RADIUS,
                height: 'clamp(160px, 22vw, 340px)',
              }}
            />
          </div>

          {/* Col 2 — 60% */}
          <div style={{ flex: '0 0 60%' }}>
            <img
              src={project.col2}
              alt={project.name}
              className="w-full object-cover h-full"
              style={{ borderRadius: BORDER_RADIUS }}
            />
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export function JackProjectsSection() {
  const containerRef = useRef<HTMLDivElement>(null)

  return (
    <section
      style={{ background: '#0C0C0C' }}
      className="rounded-t-[40px] sm:rounded-t-[50px] md:rounded-t-[60px] -mt-10 sm:-mt-12 md:-mt-14 relative z-10 px-5 sm:px-8 md:px-10 pt-20 pb-32"
    >
      <FadeIn delay={0} y={40}>
        <h2
          className="hero-heading font-black uppercase leading-none tracking-tight text-center mb-16 sm:mb-20"
          style={{
            fontFamily: 'var(--font-kanit), Kanit, sans-serif',
            fontSize: 'clamp(3rem, 12vw, 160px)',
          }}
        >
          Project
        </h2>
      </FadeIn>

      <div ref={containerRef}>
        {PROJECTS.map((project, i) => (
          <div key={project.number} style={{ height: '85vh' }}>
            <ProjectCard project={project} index={i} totalRef={containerRef} />
          </div>
        ))}
      </div>
    </section>
  )
}
