'use client'

import { motion } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { getAvatar } from '@/lib/avatars'
import { AvatarDisplay } from './AvatarDisplay'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Trophy, Target, TrendingUp, Calendar, MessageCircle, Gamepad2, Mail } from 'lucide-react'
import { useEffect, useState } from 'react'

interface PlayerProfile {
  id: string
  username: string
  avatar: string
  customAvatar?: string | null
  gamesPlayed: number
  gamesWon: number
  gamesLost: number
  gamesDraw: number
  winRate: number
  createdAt: string
  isCurrentUser: boolean
}

export function PlayerProfileView() {
  const { selectedPlayerId, setView, user, onlineUserIds, showToast } = useAppStore()
  const [data, setData] = useState<PlayerProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!selectedPlayerId) {
      setView('players')
      return
    }
    fetch(`/api/players/${selectedPlayerId}`)
      .then(r => r.json())
      .then(d => {
        if (d.player) setData(d.player)
      })
      .finally(() => setLoading(false))
  }, [selectedPlayerId])

  if (loading) {
    return (
      <div className="min-h-[100dvh] gradient-bg flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-[100dvh] gradient-bg flex items-center justify-center">
        <p className="text-muted-foreground">Игрок не найден</p>
      </div>
    )
  }

  const isOnline = onlineUserIds.has(data.id)
  const isMe = data.isCurrentUser

  function handleMessage() {
    setView('private-chat')
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      className="min-h-[100dvh] gradient-bg safe-top safe-bottom"
    >
      <div className="max-w-md mx-auto p-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setView('players')}
            className="p-2 rounded-lg hover:bg-card/50"
            aria-label="Назад"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">Профиль игрока</h1>
        </div>

        {/* Avatar + username */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-card/50 backdrop-blur-xl border border-border rounded-2xl p-6 mb-4 text-center"
        >
          <div className="relative inline-block mb-3">
            <AvatarDisplay
              avatar={data.avatar}
              customAvatar={data.customAvatar}
              size={96}
              rounded="rounded-3xl"
            />
            {/* Online indicator */}
            <div
              className={`absolute bottom-1 right-1 w-5 h-5 rounded-full border-3 border-background ${
                isOnline ? 'bg-primary' : 'bg-muted-foreground/40'
              }`}
              style={{ borderWidth: 3 }}
            />
          </div>
          <h2 className="text-xl font-bold">{data.username}</h2>
          <div className="flex items-center justify-center gap-2 mt-1">
            <span className="text-sm text-muted-foreground">
              {data.avatar === 'custom' ? 'Своё фото' : getAvatar(data.avatar).label}
            </span>
            <span className="text-muted-foreground">·</span>
            <span className={`text-sm font-medium ${isOnline ? 'text-primary' : 'text-muted-foreground'}`}>
              {isOnline ? 'онлайн' : 'офлайн'}
            </span>
          </div>
          {data.createdAt && (
            <p className="text-xs text-muted-foreground mt-2 flex items-center justify-center gap-1">
              <Calendar className="w-3 h-3" />
              С нами с {new Date(data.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          )}
        </motion.div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <StatCard
            icon={<Trophy className="w-4 h-4" />}
            label="Победы"
            value={data.gamesWon}
            color="text-primary"
          />
          <StatCard
            icon={<Target className="w-4 h-4" />}
            label="Поражения"
            value={data.gamesLost}
            color="text-destructive"
          />
          <StatCard
            icon={<TrendingUp className="w-4 h-4" />}
            label="Ничьи"
            value={data.gamesDraw}
            color="text-muted-foreground"
          />
          <StatCard
            icon={<Gamepad2 className="w-4 h-4" />}
            label="Всего игр"
            value={data.gamesPlayed}
            color="text-foreground"
          />
        </div>

        {/* Win rate progress */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-card/50 border border-border rounded-2xl p-4 mb-4"
        >
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Винрейт</span>
            <span className="text-2xl font-bold text-primary">{data.winRate}%</span>
          </div>
          <div className="h-3 bg-secondary rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${data.winRate}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-primary to-accent"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {data.gamesPlayed === 0
              ? 'Ещё не сыграл ни одной игры'
              : data.gamesPlayed < 10
              ? 'Мало игр для точной статистики'
              : data.winRate >= 60
              ? 'Отличный результат! Топ игрок!'
              : data.winRate >= 40
              ? 'Хороший результат'
              : 'Есть куда расти!'}
          </p>
        </motion.div>

        {/* Actions */}
        {!isMe && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Button
              onClick={handleMessage}
              className="w-full h-12"
              size="lg"
            >
              <Mail className="w-4 h-4 mr-2" />
              Личный чат
            </Button>
          </motion.div>
        )}

        {isMe && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Button
              onClick={() => setView('profile')}
              variant="ghost"
              className="w-full h-12"
              size="lg"
            >
              Редактировать профиль
            </Button>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="bg-card/50 border border-border rounded-2xl p-4">
      <div className={`flex items-center gap-1.5 text-xs ${color} mb-1`}>
        {icon}
        <span>{label}</span>
      </div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
    </div>
  )
}
