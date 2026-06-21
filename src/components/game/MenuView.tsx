'use client'

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/lib/store'
import { getAvatar } from '@/lib/avatars'
import { Gamepad2, Users, MessageCircle, User as UserIcon, Settings, LogOut, Trophy, Activity } from 'lucide-react'
import { useEffect, useState } from 'react'

interface MenuStats {
  totalUsers: number
  totalGames: number
  activeGames: number
}

export function MenuView() {
  const { user, setView, setUser, showToast, onlineCount } = useAppStore()
  const [stats, setStats] = useState<MenuStats | null>(null)

  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then(setStats)
      .catch(() => {})
  }, [])

  if (!user) return null
  const avatar = getAvatar(user.avatar)

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
    { icon: UserIcon, label: 'Профиль', desc: 'Статистика и аватар', view: 'profile' as const },
    { icon: Settings, label: 'Настройки', desc: 'Тема, звук', view: 'settings' as const },
  ]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="min-h-[100dvh] gradient-bg safe-top safe-bottom"
    >
      <div className="max-w-md mx-auto p-4 pb-6 flex flex-col min-h-[100dvh]">
        {/* Header */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
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

        {/* Player card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setView('profile')}
          className="bg-card/60 backdrop-blur-xl border border-border rounded-2xl p-4 mb-6 cursor-pointer hover:border-primary/50 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl shrink-0"
              style={{ backgroundColor: avatar.color + '40' }}
            >
              {avatar.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-lg truncate">{user.username}</div>
              <div className="text-sm text-muted-foreground">{avatar.label}</div>
              <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                <span>{user.gamesPlayed} игр</span>
                <span className="text-primary">{user.gamesWon} побед</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Menu items */}
        <div className="space-y-2.5 flex-1">
          {menuItems.map((item, idx) => (
            <motion.button
              key={item.label}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.15 + idx * 0.05 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                console.log('[MenuView] clicked', item.label, '-> view', item.view)
                setView(item.view)
              }}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                item.primary
                  ? 'bg-primary/10 border-primary/30 hover:bg-primary/20'
                  : 'bg-card/40 border-border hover:border-primary/30 hover:bg-card/60'
              }`}
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                item.primary ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'
              }`}>
                <item.icon className="w-5 h-5" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="font-semibold">{item.label}</div>
                <div className="text-xs text-muted-foreground truncate">{item.desc}</div>
              </div>
              {item.primary && (
                <motion.div
                  animate={{ x: [0, 4, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="text-primary"
                >
                  →
                </motion.div>
              )}
            </motion.button>
          ))}
        </div>

        {/* Stats footer */}
        {stats && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
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
