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
    // Security: validate that the custom avatar is a data URI (not an
    // external http(s) URL). A malicious user could otherwise inject an
    // arbitrary URL via direct API access, which the browser would load
    // (privacy leak / tracking pixel).
    const isSafeDataUri = display.src.startsWith('data:image/')
    if (!isSafeDataUri) {
      // Fall back to a preset avatar — 'avatar-1' is the default.
      const fallback = getAvatarDisplay('avatar-1', null)
      if (fallback.type === 'emoji') {
        return (
          <div
            style={{
              width: size,
              height: size,
              backgroundColor: `color-mix(in srgb, ${fallback.color} 25%, transparent)`,
              fontSize: size * 0.55,
            }}
            className={`${rounded} flex items-center justify-center shrink-0 ${className}`}
          >
            {fallback.emoji}
          </div>
        )
      }
    }
    return (
      <img
        src={display.src}
        alt="Avatar"
        loading="lazy"
        style={{ width: size, height: size, backgroundColor: 'var(--muted)' }}
        className={`${rounded} object-cover shrink-0 ${className}`}
      />
    )
  }

  // display.type === 'emoji' here
  return (
    <div
      style={{
        width: size,
        height: size,
        // Use color-mix for transparent background instead of fragile hex concat.
        // Falls back to 'transparent' if color-mix is unsupported (older browsers).
        backgroundColor: `color-mix(in srgb, ${display.color} 25%, transparent)`,
        fontSize: size * 0.55,
      }}
      className={`${rounded} flex items-center justify-center shrink-0 ${className}`}
    >
      {display.emoji}
    </div>
  )
}
