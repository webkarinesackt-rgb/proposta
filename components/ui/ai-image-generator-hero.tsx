"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface ImageCard {
  id: string
  src: string
  alt: string
  rotation: number
}

interface ImageCarouselHeroProps {
  title: string
  subtitle: string
  description: string
  ctaText: string
  onCtaClick?: () => void
  images: ImageCard[]
  features?: Array<{
    title: string
    description: string
  }>
}

export function ImageCarouselHero({
  title,
  subtitle,
  description,
  ctaText,
  onCtaClick,
  images,
  features = [],
}: ImageCarouselHeroProps) {
  const [mousePosition, setMousePosition] = useState({ x: 0.5, y: 0.5 })
  const [rotatingCards, setRotatingCards] = useState<number[]>([])
  const animRef = useRef<number>(null)
  const angleRef = useRef<number[]>([])

  useEffect(() => {
    angleRef.current = images.map((_, i) => i * (360 / images.length))
    setRotatingCards([...angleRef.current])

    const tick = () => {
      angleRef.current = angleRef.current.map((a) => (a + 0.07) % 360)
      setRotatingCards([...angleRef.current])
      animRef.current = requestAnimationFrame(tick)
    }
    animRef.current = requestAnimationFrame(tick)
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [images.length])

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setMousePosition({
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    })
  }

  return (
    <div className="relative w-full overflow-hidden" style={{ background: '#060E0F', minHeight: '50vh' }}>
      {/* Ambient glows */}
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl pointer-events-none animate-pulse"
        style={{ background: 'radial-gradient(circle, rgba(139,183,175,0.08) 0%, transparent 70%)' }} />
      <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full blur-3xl pointer-events-none animate-pulse"
        style={{ background: 'radial-gradient(circle, rgba(244,249,157,0.05) 0%, transparent 70%)' }} />

      <div className="relative z-10 flex flex-col items-center justify-center pt-8 pb-0 px-4 sm:px-6 lg:px-8">
        {/* Carousel */}
        <div
          className="relative w-full max-w-6xl h-80 sm:h-[420px] mb-4 sm:mb-6"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setMousePosition({ x: 0.5, y: 0.5 })}
        >
          <div className="absolute inset-0 flex items-center justify-center" style={{ perspective: '1000px' }}>
            {images.map((image, index) => {
              const angle = (rotatingCards[index] ?? 0) * (Math.PI / 180)
              const radius = 200
              const x = Math.cos(angle) * radius
              const y = Math.sin(angle) * radius * 0.4
              const perspectiveX = (mousePosition.x - 0.5) * 18
              const perspectiveY = (mousePosition.y - 0.5) * 18

              return (
                <div
                  key={image.id}
                  className="absolute w-52 h-40 sm:w-64 sm:h-48 transition-shadow duration-300"
                  style={{
                    transform: `translate(${x}px, ${y}px) rotateX(${perspectiveY}deg) rotateY(${perspectiveX}deg) rotateZ(${image.rotation}deg)`,
                    transformStyle: 'preserve-3d',
                  }}
                >
                  <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-2xl group cursor-pointer hover:scale-110 transition-transform duration-300">
                    <Image
                      src={image.src}
                      alt={image.alt}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                      sizes="(max-width: 640px) 128px, 160px"
                    />
                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Content */}
        {title && (
          <div className="relative z-20 text-center max-w-2xl mx-auto mb-12 sm:mb-16">
            <h2
              className="font-bold mb-4 sm:mb-6 leading-tight"
              style={{
                fontFamily: '"ivypresto-display", "ivypresto-headline", Georgia, serif',
                fontWeight: 300,
                fontStyle: 'italic',
                fontSize: 'clamp(2rem, 5vw, 3.5rem)',
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em',
              }}
            >
              {title}
            </h2>
            <p className="text-lg sm:text-xl mb-8" style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              {description}
            </p>
            <button
              onClick={onCtaClick}
              className="btn-neon inline-flex items-center gap-2 group"
            >
              {ctaText}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        )}

        {/* Features */}
        {features.length > 0 && (
          <div className="relative z-20 w-full max-w-4xl grid grid-cols-1 sm:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="card-glass card-glass-hover text-center p-6"
              >
                <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                  {feature.title}
                </h3>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom fade to CTASection bg */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none" style={{
        height: '140px',
        background: 'linear-gradient(to bottom, transparent, var(--bg-void))',
        zIndex: 20,
      }} />
    </div>
  )
}
