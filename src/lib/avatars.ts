// Avatar gallery — using emoji-based avatars as presets + support for custom uploaded avatars

export interface AvatarDef {
  id: string
  label: string
  emoji: string
  color: string
}

export const AVATARS: AvatarDef[] = [
  { id: 'avatar-1', label: 'Кот', emoji: '🐱', color: '#f59e0b' },
  { id: 'avatar-2', label: 'Собака', emoji: '🐶', color: '#3b82f6' },
  { id: 'avatar-3', label: 'Лис', emoji: '🦊', color: '#ef4444' },
  { id: 'avatar-4', label: 'Панда', emoji: '🐼', color: '#10b981' },
  { id: 'avatar-5', label: 'Сова', emoji: '🦉', color: '#8b5cf6' },
  { id: 'avatar-6', label: 'Лев', emoji: '🦁', color: '#f97316' },
  { id: 'avatar-7', label: 'Тигр', emoji: '🐯', color: '#fbbf24' },
  { id: 'avatar-8', label: 'Волк', emoji: '🐺', color: '#6b7280' },
  { id: 'avatar-9', label: 'Медведь', emoji: '🐻', color: '#a16207' },
  { id: 'avatar-10', label: 'Кролик', emoji: '🐰', color: '#ec4899' },
  { id: 'avatar-11', label: 'Лягушка', emoji: '🐸', color: '#22c55e' },
  { id: 'avatar-12', label: 'Пингвин', emoji: '🐧', color: '#0ea5e9' },
  { id: 'avatar-13', label: 'Единорог', emoji: '🦄', color: '#d946ef' },
  { id: 'avatar-14', label: 'Дракон', emoji: '🐉', color: '#16a34a' },
  { id: 'avatar-15', label: 'Призрак', emoji: '👻', color: '#94a3b8' },
  { id: 'avatar-16', label: 'Робот', emoji: '🤖', color: '#475569' },
  { id: 'avatar-17', label: 'Алмаз', emoji: '💎', color: '#06b6d4' },
  { id: 'avatar-18', label: 'Огонь', emoji: '🔥', color: '#dc2626' },
  { id: 'avatar-19', label: 'Молния', emoji: '⚡', color: '#eab308' },
  { id: 'avatar-20', label: 'Звезда', emoji: '⭐', color: '#f59e0b' },
  { id: 'avatar-21', label: 'Ракета', emoji: '🚀', color: '#7c3aed' },
  { id: 'avatar-22', label: 'Краб', emoji: '🦀', color: '#ef4444' },
  { id: 'avatar-23', label: 'Осьминог', emoji: '🐙', color: '#be185d' },
  { id: 'avatar-24', label: 'Бабочка', emoji: '🦋', color: '#a855f7' },
]

export function getAvatar(id: string): AvatarDef {
  return AVATARS.find(a => a.id === id) || AVATARS[0]
}

// Check if an avatar id represents a custom (uploaded) avatar
export function isCustomAvatar(avatar: string): boolean {
  return avatar === 'custom'
}

// Render avatar — returns either emoji info or custom data URI
export function getAvatarDisplay(avatar: string, customAvatar?: string | null): { type: 'emoji'; emoji: string; color: string; label: string } | { type: 'custom'; src: string } {
  if (avatar === 'custom' && customAvatar) {
    return { type: 'custom', src: customAvatar }
  }
  const def = getAvatar(avatar)
  return { type: 'emoji', emoji: def.emoji, color: def.color, label: def.label }
}
