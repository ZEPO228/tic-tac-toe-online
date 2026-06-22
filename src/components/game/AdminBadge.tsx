'use client'

import { motion } from 'framer-motion'
import { Crown } from 'lucide-react'

interface AdminBadgeProps {
  /** Compact = just the crown icon with golden glow (good for tight UI).
   *  Full = "АДМИН" text with crown (good for profile/cards). */
  variant?: 'compact' | 'full'
  /** Size of the badge */
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

/**
 * Animated gold "ADMIN" badge shown next to admin usernames.
 *
 * Visual: gold gradient background, crown icon, subtle shimmer animation,
 * soft pulsing glow. Stands out without being obnoxious.
 */
export function AdminBadge({ variant = 'compact', size = 'sm', className = '' }: AdminBadgeProps) {
  const sizeClasses = {
    sm: variant === 'compact'
      ? 'px-1.5 py-0.5 text-[9px] gap-0.5'
      : 'px-2 py-0.5 text-[10px] gap-1',
    md: variant === 'compact'
      ? 'px-2 py-1 text-[10px] gap-1'
      : 'px-2.5 py-1 text-xs gap-1',
    lg: variant === 'compact'
      ? 'px-2.5 py-1 text-xs gap-1'
      : 'px-3 py-1.5 text-sm gap-1.5',
  }

  const iconSize = size === 'sm' ? 'w-2.5 h-2.5' : size === 'md' ? 'w-3 h-3' : 'w-3.5 h-3.5'

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      // Subtle ongoing shimmer to draw attention without being annoying
      whileInView={{
        boxShadow: [
          '0 0 0 0 rgba(250, 204, 21, 0.0)',
          '0 0 8px 2px rgba(250, 204, 21, 0.4)',
          '0 0 0 0 rgba(250, 204, 21, 0.0)',
        ],
      }}
      transition={{
        duration: 2.5,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      className={`inline-flex items-center font-bold uppercase tracking-wide rounded-full
        bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-500
        text-amber-950 border border-yellow-300/50 shadow-sm
        shrink-0 select-none ${sizeClasses[size]} ${className}`}
      title="Администратор проекта"
      aria-label="Администратор"
    >
      <Crown className={`${iconSize} drop-shadow-sm`} strokeWidth={2.5} aria-hidden="true" />
      {variant === 'full' && <span>Админ</span>}
    </motion.span>
  )
}
