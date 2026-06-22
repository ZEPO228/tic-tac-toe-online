'use client'

import { motion } from 'framer-motion'

interface AnimatedLogoProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

// Animated tic-tac-toe logo: ✕ and ⭕ fly in from opposite sides,
// bounce, then gently float with infinite loop
export function AnimatedLogo({ size = 'lg', className = '' }: AnimatedLogoProps) {
  const sizes = {
    sm: 'text-4xl',
    md: 'text-5xl',
    lg: 'text-6xl',
  }
  const dim = size === 'sm' ? 48 : size === 'md' ? 60 : 72

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ height: dim, width: dim * 2.2 }}>
      {/* ⭕ — flies in from left, then gentle float */}
      <motion.span
        initial={{ x: -200, y: -80, rotate: -180, opacity: 0, scale: 0.3 }}
        animate={{
          x: 0,
          y: [0, -8, 0],
          rotate: [0, -8, 0],
          opacity: 1,
          scale: 1,
        }}
        transition={{
          x: { type: 'spring', stiffness: 200, damping: 18, delay: 0.1 },
          y: { repeat: Infinity, duration: 3, ease: 'easeInOut', delay: 1 },
          rotate: { repeat: Infinity, duration: 4, ease: 'easeInOut', delay: 1 },
          opacity: { duration: 0.4, delay: 0.1 },
          scale: { type: 'spring', stiffness: 200, damping: 15, delay: 0.1 },
        }}
        className={`${sizes[size]} drop-shadow-lg text-accent-foreground`}
      >
        ⭕
      </motion.span>

      {/* ✕ — flies in from right, then gentle float (offset phase) */}
      <motion.span
        initial={{ x: 200, y: 80, rotate: 180, opacity: 0, scale: 0.3 }}
        animate={{
          x: 0,
          y: [0, 8, 0],
          rotate: [0, 8, 0],
          opacity: 1,
          scale: 1,
        }}
        transition={{
          x: { type: 'spring', stiffness: 200, damping: 18, delay: 0.25 },
          y: { repeat: Infinity, duration: 3, ease: 'easeInOut', delay: 1.5 },
          rotate: { repeat: Infinity, duration: 4, ease: 'easeInOut', delay: 1.5 },
          opacity: { duration: 0.4, delay: 0.25 },
          scale: { type: 'spring', stiffness: 200, damping: 15, delay: 0.25 },
        }}
        className={`${sizes[size]} drop-shadow-lg text-primary ml-1`}
      >
        ✕
      </motion.span>
    </div>
  )
}
