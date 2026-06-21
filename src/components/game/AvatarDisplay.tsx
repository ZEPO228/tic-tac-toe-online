'use client'

import { getAvatarDisplay } from '@/lib/avatars'

interface AvatarDisplayProps {
  avatar: string
  customAvatar?: string | null
  size?: number
  className?: string
  rounded?: string
}

export function AvatarDisplay({
  avatar,
  customAvatar,
  size = 56,
  className = '',
  rounded = 'rounded-xl',
}: AvatarDisplayProps) {
  const display = getAvatarDisplay(avatar, customAvatar)

  if (display.type === 'custom') {
    return (
      <img
        src={display.src}
        alt="Avatar"
        style={{ width: size, height: size, backgroundColor: 'var(--muted)' }}
        className={`${rounded} object-cover shrink-0 ${className}`}
      />
    )
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        backgroundColor: display.color + '40',
        fontSize: size * 0.55,
      }}
      className={`${rounded} flex items-center justify-center shrink-0 ${className}`}
    >
      {display.emoji}
    </div>
  )
}
