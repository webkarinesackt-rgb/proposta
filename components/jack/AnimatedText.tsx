'use client'

import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'

interface AnimatedTextProps {
  text: string
  className?: string
  style?: React.CSSProperties
}

export function AnimatedText({ text, className, style }: AnimatedTextProps) {
  const ref = useRef<HTMLParagraphElement>(null)

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 0.8', 'end 0.2'],
  })

  const chars = text.split('')

  return (
    <p ref={ref} className={className} style={{ position: 'relative', ...style }}>
      {chars.map((char, i) => {
        const start = i / chars.length
        const end = (i + 1) / chars.length

        return (
          <span key={i} style={{ position: 'relative', display: 'inline-block' }}>
            <span style={{ opacity: 0 }}>{char === ' ' ? ' ' : char}</span>
            <AnimatedChar
              char={char}
              scrollYProgress={scrollYProgress}
              start={start}
              end={end}
            />
          </span>
        )
      })}
    </p>
  )
}

function AnimatedChar({
  char,
  scrollYProgress,
  start,
  end,
}: {
  char: string
  scrollYProgress: ReturnType<typeof useScroll>['scrollYProgress']
  start: number
  end: number
}) {
  const opacity = useTransform(scrollYProgress, [start, end], [0.2, 1])

  return (
    <motion.span
      style={{
        opacity,
        position: 'absolute',
        left: 0,
        top: 0,
      }}
    >
      {char === ' ' ? ' ' : char}
    </motion.span>
  )
}
