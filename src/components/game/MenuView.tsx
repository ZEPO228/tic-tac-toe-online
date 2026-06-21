'use client'

import { motion } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { getAvatar } from '@/lib/avatars'
import { AvatarDisplay } from './AvatarDisplay'
import { Gamepad2, Users, MessageCircle, User as UserIcon, Settings, LogOut, Trophy, Activity, Mail } from 'lucide-react'
import { useEffect, useState, memo } from 'react'

interface MenuStats {
  totalUsers: number
  totalGames: number
  activeGames: number
}

// Stagger container — children animate in sequence with custom origins
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.18,
      delayChildren: 0.3,
    },
  },
}

// Each card flies in from a different direction + rotates slightly
// Slower spring for cinematic effect (lower stiffness = slower)
const cardVariants = [
  // index 0 — from left
  {
    hidden: { opacity: 0, x: -120, rotate: -8, scale: 0.8 },
    visible: { opacity: 1, x: 0, rotate: 0, scale: 1, transition: { type: 'spring' as const, stiffness: 140, damping: 18, mass: 1.2 } },
  },
  // index 1 — from right
  {
    hidden: { opacity: 0, x: 120, rotate: 8, scale: 0.8 },
    visible: { opacity: 1, x: 0, rotate: 0, scale: 1, transition: { type: 'spring' as const, stiffness: 140, damping: 18, mass: 1.2 } },
  },
  // index 2 — from top
  {
    hidden: { opacity: 0, y: -100, rotate: 5, scale: 0.8 },
    visible: { opacity: 1, y: 0, rotate: 0, scale: 1, transition: { type: 'spring' as const, stiffness: 140, damping: 18, mass: 1.2 } },
  },
  // index 3 — from bottom
  {
    hidden: { opacity: 0, y: 100, rotate: -5, scale: 0.8 },
    visible: { opacity: 1, y: 0, rotate: 0, scale: 1, transition: { type: 'spring' as const, stiffness: 140, damping: 18, mass: 1.2 } },
  },
  // index 4 — from top-left
  {
    hidden: { opacity: 0, x: -80, y: -80, rotate: -10, scale: 0.7 },
    visible: { opacity: 1, x: 0, y: 0, rotate: 0, scale: 1, transition: { type: 'spring' as const, stiffness: 140, damping: 18, mass: 1.2 } },
  },
  // index 5 — from bottom-right
  {
    hidden: { opacity: 0, x: 80, y: 80, rotate: 10, scale: 0.7 },
    visible: { opacity: 1, x: 0, y: 0, rotate: 0, scale: 1, transition: { type: 'spring' as const, stiffness: 140, damping: 18, mass: 1.2 } },
  },
]

const MenuItem = memo(function MenuItem({
  icon: Icon,
  label,
  desc,
  primary,
  badge,
  onClick,
  variantIndex,
}: {
  icon: any
  label: string
  desc: string
  primary?: boolean
  badge?: number
  onClick: () => void
  variantIndex: number
}) {
  const variant = cardVariants[variantIndex % cardVariants.length]
  return (
    <motion.button
      variants={variant}
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      whileHover={{ scale: 1.02 }}
      className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-colors relative ${
        primary
          ? 'bg-primary/10 border-primary/30 hover:bg-primary/20'
          : 'bg-card/40 border-border hover:border-primary/30 hover:bg-card/60'
      }`}
    >
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
        primary ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'
      }`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 text-left min-w-0">
        <div className="font-semibold">{label}</div>
        <div className="text-xs text-muted-foreground truncate">{desc}</div>
      </div>
      {badge !== undefined && badge > 0 && (
        <div className="bg-destructive text-destructive-foreground rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center text-xs font-bold">
          {badge > 99 ? '99+' : badge}
        </div>
      )}
      {primary && (
        <span className="text-primary">→</span>
      )}
    </motion.button>
  )
})

export function MenuView() {
  const { user, setView, setUser, showToast, onlineCount } = useAppStore()
  const [stats, setStats] = useState<MenuStats | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then(setStats)
      .catch(() => {})

    fetch('/api/direct-messages/contacts')
      .then(r => r.json())
      .then(d => {
        if (d.contacts) {
          const total = d.contacts.reduce((sum: number, c: any) => sum + (c.unreadCount || 0), 0)
          setUnreadCount(total)
        }
      })
      .catch(() => {})
  }, [])

  if (!user) return null

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
    setView('login')
    showToast('info', 'Вы вышли из аккаунта')
  }

  const menuItems = [
    { icon: Gamepad2, label: 'Поиск игры', desc: 'Найти соперника или бота', view: 'matchmaking' as const, primary: true },
    { icon: Trophy, label: 'Игроки', desc: 'Рейтинг и список', view: 'players' as const },
    { icon: MessageCircle, label: 'Чат', desc: 'Общий онлайн чат', view: 'chat' as const },
    { icon: Mail, label: 'Личные чаты', desc: unreadCount > 0 ? `${unreadCount} непрочитанных` : 'Личные сообщения', view: 'private-chats' as const, badge: unreadCount > 0 ? unreadCount : undefined },
    { icon: UserIcon, label: 'Профиль', desc: 'Статистика и аватар', view: 'profile' as const },
    { icon: Settings, label: 'Настройки', desc: 'Тема, звук', view: 'settings' as const },
  ]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="min-h-[100dvh] gradient-bg safe-top safe-bottom"
    >
      <div className="max-w-md mx-auto p-4 pb-6 flex flex-col min-h-[100dvh]">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="flex items-center justify-between mb-6"
        >
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
            <span className="text-sm text-muted-foreground">
              <span className="text-primary font-semibold">{onlineCount}</span> онлайн
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Выйти"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </motion.div>

        {/* Player card — flies in from top with rotation */}
        <motion.div
          initial={{ opacity: 0, y: -80, rotate: -5, scale: 0.85 }}
          animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 120, damping: 18, mass: 1.2, delay: 0.2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setView('profile')}
          className="bg-card border border-border rounded-2xl p-4 mb-6 cursor-pointer hover:border-primary/50 transition-colors"
        >
          <div className="flex items-center gap-4">
            <AvatarDisplay
              avatar={user.avatar}
              customAvatar={user.customAvatar}
              size={64}
            />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-lg truncate">{user.username}</div>
              <div className="text-sm text-muted-foreground">
                {user.avatar === 'custom' ? 'Своё фото' : getAvatar(user.avatar).label}
              </div>
              <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                <span>{user.gamesPlayed} игр</span>
                <span className="text-primary">{user.gamesWon} побед</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Menu items — staggered fly-in from different directions */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-2.5 flex-1"
        >
          {menuItems.map((item, idx) => (
            <MenuItem
              key={item.label}
              icon={item.icon}
              label={item.label}
              desc={item.desc}
              primary={item.primary}
              badge={item.badge}
              onClick={() => setView(item.view)}
              variantIndex={idx}
            />
          ))}
        </motion.div>

        {/* Stats footer — fades in last */}
        {stats && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 120, damping: 18, mass: 1.2, delay: 1.4 }}
            className="grid grid-cols-3 gap-2 mt-6 text-center"
          >
            <div className="bg-card/30 rounded-xl p-2.5">
              <div className="text-lg font-bold">{stats.totalUsers}</div>
              <div className="text-[10px] text-muted-foreground">игроков</div>
            </div>
            <div className="bg-card/30 rounded-xl p-2.5">
              <div className="text-lg font-bold">{stats.totalGames}</div>
              <div className="text-[10px] text-muted-foreground">игр всего</div>
            </div>
            <div className="bg-card/30 rounded-xl p-2.5">
              <div className="text-lg font-bold text-primary flex items-center justify-center gap-1">
                <Activity className="w-3 h-3" />
                {stats.activeGames}
              </div>
              <div className="text-[10px] text-muted-foreground">активных</div>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}
