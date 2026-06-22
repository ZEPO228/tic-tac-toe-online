'use client'

import { Crown } from 'lucide-react'

interface AdminBadgeProps {
  /** Compact = just the crown icon (good for tight UI).
   *  Full = "АДМИН" text with crown (good for profile/cards). */
  variant?: 'compact' | 'full'
  /** Size of the badge */
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

/**
 * Static gold "АДМИН" badge shown next to admin usernames.
 *
 * Visual: gold gradient background + crown icon. No animation — the badge
 * is intentionally static so it's clearly visible but doesn't distract.
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
    <span
      className={`inline-flex items-center font-bold uppercase tracking-wide rounded-full
        bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-500
        text-amber-950 border border-yellow-300/50 shadow-sm
        shrink-0 select-none ${sizeClasses[size]} ${className}`}
      title="Администратор проекта"
      aria-label="Администратор"
    >
      <Crown className={`${iconSize} drop-shadow-sm`} strokeWidth={2.5} aria-hidden="true" />
      {variant === 'full' && <span>Админ</span>}
    </span>
  )
}
