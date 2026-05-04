'use client'

import { useEffect, useRef, useState } from 'react'

const IMAGES = [
  '/portfolio/imgi_127_5a0680233771747.Y3JvcCw4MTAsNjMzLDAsMA.png',
  '/portfolio/imgi_56_a1cc1a246196927.Y3JvcCwxMjE1LDk1MCwwLDA.jpg',
  '/portfolio/imgi_143_f43434240508597.Y3JvcCwxMTU5LDkwNiwxMjAsMA.jpg',
  '/portfolio/imgi_153_9c467d230786083.Y3JvcCwyNDMwLDE5MDAsMCww.png',
  '/portfolio/imgi_177_2474e0236210813.Y3JvcCw4MTAsNjMzLDAsNA.png',
  '/portfolio/imgi_203_24871a237912593.Y3JvcCwxNTQ0LDEyMDgsMCww.png',
  '/portfolio/imgi_37_9debcd230443075.Y3JvcCwxMjE1LDk1MCwwLDA.jpg',
  '/portfolio/imgi_57_a6462d240202027.Y3JvcCwxMjE1LDk1MCwwLDA.jpg',
  '/portfolio/imgi_62_fe3473236211811.Y3JvcCw4MDgsNjMyLDAsMA.png',
]

const ROW1 = IMAGES
const ROW2 = [...IMAGES].reverse()

function ImageTile({ src }: { src: string }) {
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      className="rounded-2xl object-cover flex-shrink-0"
      style={{ width: 'clamp(160px, 44vw, 420px)', height: 'clamp(110px, 28vw, 270px)' }}
    />
  )
}

export function JackMarqueeSection() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const [offset, setOffset] = useState(200)

  useEffect(() => {
    const handleScroll = () => {
      const el = sectionRef.current
      if (!el) return
      const sectionTop = el.getBoundingClientRect().top + window.scrollY
      const raw = (window.scrollY - sectionTop + window.innerHeight) * 0.3
      setOffset(raw)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const row1 = [...ROW1, ...ROW1, ...ROW1]
  const row2 = [...ROW2, ...ROW2, ...ROW2]

  return (
    <section
      ref={sectionRef}
      style={{ background: 'var(--bg-void)', overflow: 'hidden' }}
      className="pt-4 pb-10"
    >
      {/* Row 1 — moves right */}
      <div
        className="flex gap-3 mb-3"
        style={{
          transform: `translateX(${offset - 200}px)`,
          willChange: 'transform',
        }}
      >
        {row1.map((src, i) => (
          <ImageTile key={i} src={src} />
        ))}
      </div>

      {/* Row 2 — moves left */}
      <div
        className="flex gap-3"
        style={{
          transform: `translateX(${-(offset - 200)}px)`,
          willChange: 'transform',
        }}
      >
        {row2.map((src, i) => (
          <ImageTile key={i} src={src} />
        ))}
      </div>
    </section>
  )
}
