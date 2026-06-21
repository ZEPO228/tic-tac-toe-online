'use client'

import { motion } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { getAvatar } from '@/lib/avatars'
import { AvatarDisplay } from './AvatarDisplay'
import { ArrowLeft, Crown, Medal, Trophy } from 'lucide-react'
import { useEffect, useState } from 'react'

interface Player {
  id: string
  username: string
  avatar: string
  customAvatar?: string | null
  gamesPlayed: number
  gamesWon: number
  gamesLost: number
  gamesDraw: number
}

export function PlayersView() {
  const { setView, user, onlineUserIds, setSelectedPlayerId } = useAppStore()
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/players')
      .then(r => r.json())
      .then(d => setPlayers(d.players || []))
      .finally(() => setLoading(false))
  }, [])

  function openPlayerProfile(playerId: string) {
    setSelectedPlayerId(playerId)
    setView('player-profile')
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
        <div className="flex items-center gap-3 mb-6 sticky top-0 bg-background/80 backdrop-blur-md -mx-4 px-4 py-3 z-10">
          <button
            onClick={() => setView('menu')}
            className="p-2 rounded-lg hover:bg-card/50"
            aria-label="Назад"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">Топ игроков</h1>
        </div>

        {/* Podium (top 3) */}
        {!loading && players.length >= 3 && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="grid grid-cols-3 gap-2 mb-6 items-end"
          >
            {/* 2nd */}
            <PodiumCard
              player={players[1]}
              rank={2}
              height="h-24"
              isOnline={onlineUserIds.has(players[1].id)}
              onClick={() => openPlayerProfile(players[1].id)}
            />
            {/* 1st */}
            <PodiumCard
              player={players[0]}
              rank={1}
              height="h-32"
              isOnline={onlineUserIds.has(players[0].id)}
              onClick={() => openPlayerProfile(players[0].id)}
            />
            {/* 3rd */}
            <PodiumCard
              player={players[2]}
              rank={3}
              height="h-20"
              isOnline={onlineUserIds.has(players[2].id)}
              onClick={() => openPlayerProfile(players[2].id)}
            />
          </motion.div>
        )}

        {/* List */}
        <div className="space-y-2">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-16 bg-card/30 rounded-2xl animate-pulse" />
            ))
          ) : players.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Trophy className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Пока нет игроков</p>
              <p className="text-xs">Сыграй первую игру!</p>
            </div>
          ) : (
            players.map((player, idx) => {
              const isMe = player.id === user?.id
              const isOnline = onlineUserIds.has(player.id)
              const winRate = player.gamesPlayed > 0
                ? Math.round((player.gamesWon / player.gamesPlayed) * 100)
                : 0
              return (
                <motion.button
                  key={player.id}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: idx * 0.03 }}
                  onClick={() => openPlayerProfile(player.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-all text-left ${
                    isMe
                      ? 'bg-primary/10 border-primary/40'
                      : 'bg-card/40 border-border hover:border-primary/30 hover:bg-card/60'
                  }`}
                >
                  <div className={`w-8 text-center font-bold ${
                    idx === 0 ? 'text-yellow-500' :
                    idx === 1 ? 'text-gray-400' :
                    idx === 2 ? 'text-orange-600' :
                    'text-muted-foreground'
                  }`}>
                    {idx + 1}
                  </div>
                  <div className="relative shrink-0">
                    <AvatarDisplay
                      avatar={player.avatar}
                      customAvatar={player.customAvatar}
                      size={44}
                    />
                    {/* Online indicator */}
                    <div
                      className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${
                        isOnline ? 'bg-primary' : 'bg-muted-foreground/40'
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate flex items-center gap-2">
                      {player.username}
                      {isMe && <span className="text-xs text-primary">(ты)</span>}
                    </div>
                    <div className="text-xs text-muted-foreground flex gap-3">
                      <span>{player.gamesWon}W</span>
                      <span>{player.gamesLost}L</span>
                      <span>{player.gamesDraw}D</span>
                      <span className="text-primary">{winRate}%</span>
                    </div>
                  </div>
                  <div className={`text-[10px] font-medium px-2 py-1 rounded-full ${
                    isOnline
                      ? 'bg-primary/20 text-primary'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {isOnline ? 'онлайн' : 'офлайн'}
                  </div>
                </motion.button>
              )
            })
          )}
        </div>
      </div>
    </motion.div>
  )
}

function PodiumCard({
  player,
  rank,
  height,
  isOnline,
  onClick,
}: {
  player: Player
  rank: number
  height: string
  isOnline: boolean
  onClick: () => void
}) {
  const colors = {
    1: 'from-yellow-500/30 to-yellow-600/10 border-yellow-500/50',
    2: 'from-gray-400/30 to-gray-500/10 border-gray-400/50',
    3: 'from-orange-600/30 to-orange-700/10 border-orange-600/50',
  }
  const icon = rank === 1 ? <Crown className="w-5 h-5 text-yellow-500" /> : rank === 2 ? <Medal className="w-5 h-5 text-gray-400" /> : <Medal className="w-5 h-5 text-orange-600" />

  return (
    <button onClick={onClick} className="flex flex-col items-center w-full">
      <div className="relative mb-2">
        <AvatarDisplay
          avatar={player.avatar}
          customAvatar={player.customAvatar}
          size={rank === 1 ? 56 : 48}
          rounded="rounded-2xl"
        />
        {/* Online indicator */}
        <div
          className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-background ${
            isOnline ? 'bg-primary' : 'bg-muted-foreground/40'
          }`}
        />
      </div>
      <div className="text-xs font-semibold truncate max-w-full text-center mb-1">{player.username}</div>
      <div className="text-[10px] text-muted-foreground mb-2">{player.gamesWon} побед</div>
      <div className={`w-full ${height} rounded-t-xl bg-gradient-to-b ${colors[rank as 1|2|3]} border-t-2 flex items-start justify-center pt-2`}>
        {icon}
      </div>
    </button>
  )
}
