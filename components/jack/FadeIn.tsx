'use client'

import { motion, type Variants } from 'framer-motion'
import type { ReactNode, ElementType } from 'react'

interface FadeInProps {
  children: ReactNode
  delay?: number
  duration?: number
  x?: number
  y?: number
  className?: string
  style?: React.CSSProperties
  as?: ElementType
}

export function FadeIn({
  children,
  delay = 0,
  duration = 0.7,
  x = 0,
  y = 30,
  className,
  style,
  as: Tag = 'div',
}: FadeInProps) {
  const variants: Variants = {
    hidden: { opacity: 0, x, y },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: { duration, delay, ease: [0.25, 0.1, 0.25, 1] },
    },
  }

  const MotionTag = motion.create(Tag as 'div')

  return (
    <MotionTag
      className={className}
      style={style}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '50px', amount: 0 }}
      variants={variants}
    >
      {children}
    </MotionTag>
  )
}
