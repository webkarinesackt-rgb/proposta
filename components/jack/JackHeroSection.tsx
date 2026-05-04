'use client'

import { FadeIn } from './FadeIn'
import { Magnet } from './Magnet'
import { ContactButton } from './ContactButton'

const NAV_LINKS = ['About', 'Price', 'Projects', 'Contact']

export function JackHeroSection() {
  return (
    <section
      style={{ background: '#0C0C0C', overflowX: 'clip' }}
      className="h-screen flex flex-col relative"
    >
      {/* Navbar */}
      <FadeIn delay={0} y={-20} as="nav" className="flex justify-between items-center px-6 md:px-10 pt-6 md:pt-8" style={{ fontFamily: 'var(--font-kanit), Kanit, sans-serif' }}>
        {NAV_LINKS.map((link) => (
          <a
            key={link}
            href="#"
            className="text-sm md:text-lg lg:text-[1.4rem] font-medium uppercase tracking-wider transition-opacity duration-200 hover:opacity-70"
            style={{ color: '#D7E2EA', fontFamily: 'var(--font-kanit), Kanit, sans-serif' }}
          >
            {link}
          </a>
        ))}
      </FadeIn>

      {/* Hero heading */}
      <div className="overflow-hidden">
        <FadeIn delay={0.15} y={40}>
          <h1
            className="hero-heading font-black uppercase tracking-tight leading-none whitespace-nowrap w-full text-[14vw] sm:text-[15vw] md:text-[16vw] lg:text-[17.5vw] mt-6 sm:mt-4 md:-mt-5"
            style={{ fontFamily: 'var(--font-kanit), Kanit, sans-serif' }}
          >
            Hi, i&apos;m jack
          </h1>
        </FadeIn>
      </div>

      {/* Portrait — centered absolutely */}
      <FadeIn
        delay={0.6}
        y={30}
        className="absolute left-1/2 -translate-x-1/2 z-10 w-[280px] sm:w-[360px] md:w-[440px] lg:w-[520px] top-1/2 -translate-y-1/2 sm:top-auto sm:translate-y-0 sm:bottom-0"
      >
        <Magnet
          padding={150}
          strength={3}
          activeTransition="transform 0.3s ease-out"
          inactiveTransition="transform 0.6s ease-in-out"
        >
          <img
            src="https://shrug-person-78902957.figma.site/_components/v2/d24c01ad3a56fc65e942a1f501eb73db42d7cf9a/Rectangle_40443.81459862.png"
            alt="Jack"
            className="w-full"
          />
        </Magnet>
      </FadeIn>

      {/* Bottom bar */}
      <div className="mt-auto flex justify-between items-end px-6 md:px-10 pb-7 sm:pb-8 md:pb-10">
        <FadeIn delay={0.35} y={20}>
          <p
            className="font-light uppercase tracking-wide leading-snug max-w-[160px] sm:max-w-[220px] md:max-w-[260px]"
            style={{
              color: '#D7E2EA',
              fontSize: 'clamp(0.75rem, 1.4vw, 1.5rem)',
              fontFamily: 'var(--font-kanit), Kanit, sans-serif',
            }}
          >
            a 3d creator driven by crafting striking and unforgettable projects
          </p>
        </FadeIn>

        <FadeIn delay={0.5} y={20}>
          <ContactButton />
        </FadeIn>
      </div>
    </section>
  )
}
