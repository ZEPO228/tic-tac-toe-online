'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/lib/store'
import { getSocket } from '@/lib/socket-client'
import { useEffect, useState, useRef } from 'react'
import { X, Bot, Loader2, Search, Users } from 'lucide-react'

export function MatchmakingView() {
  const { setView, setCurrentMatch, setGameState, queueCount, setQueueCount, botAvailable, setBotAvailable, showToast } = useAppStore()
  const [elapsed, setElapsed] = useState(0)
  const startedAtRef = useRef<number>(Date.now())
  const socketRef = useRef(getSocket())

  useEffect(() => {
    startedAtRef.current = Date.now()
    setBotAvailable(false)
    setQueueCount(0)

    const socket = socketRef.current
    if (!socket) {
      showToast('error', 'Нет соединения с сервером')
      setView('menu')
      return
    }

    // Ensure socket is connected
    if (!socket.connected) {
      socket.connect()
    }

    // Listeners
    const onQueueCount = ({ count }: { count: number }) => setQueueCount(count)
    const onMatchFound = (match: any) => {
      setCurrentMatch(match)
      setGameState({
        gameId: match.gameId,
        board: match.board,
        currentTurn: match.currentTurn,
        status: 'active',
        winner: null,
        winningLine: null,
      })
      setView('game')
    }
    const onBotAvailable = () => setBotAvailable(true)

    socket.on('queue_count', onQueueCount)
    socket.on('match_found', onMatchFound)
    socket.on('bot_available', onBotAvailable)

    // Join queue
    socket.emit('queue_join')

    // Timer
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000))
    }, 1000)

    return () => {
      clearInterval(timer)
      socket.off('queue_count', onQueueCount)
      socket.off('match_found', onMatchFound)
      socket.off('bot_available', onBotAvailable)
    }
  }, [])

  function handleCancel() {
    const socket = socketRef.current
    if (socket) {
      socket.emit('queue_leave')
    }
    setView('menu')
  }

  function handlePlayBot() {
    const socket = socketRef.current
    if (socket) {
      socket.emit('play_with_bot')
    }
  }

  const dots = '.'.repeat((elapsed % 3) + 1)
  const remaining = Math.max(0, 20 - elapsed)
  const progress = Math.min(100, (elapsed / 20) * 100)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="min-h-[100dvh] gradient-bg flex items-center justify-center p-4 safe-top safe-bottom"
    >
      <div className="w-full max-w-sm flex flex-col items-center">
        {/* Cancel button */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={handleCancel}
          className="absolute top-4 right-4 p-2.5 rounded-xl bg-card/50 border border-border hover:bg-card"
          aria-label="Отмена"
        >
          <X className="w-5 h-5" />
        </motion.button>

        {/* Searching animation */}
        <div className="relative w-56 h-56 mb-8 flex items-center justify-center">
          {/* Outer rings */}
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="absolute rounded-full border-2 border-primary/30"
              style={{ width: '100%', height: '100%' }}
              animate={{
                scale: [1, 1.4 + i * 0.2, 1],
                opacity: [0.6, 0, 0.6],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.5,
                ease: 'easeInOut',
              }}
            />
          ))}

          {/* Center pulse */}
          <motion.div
            className="relative w-32 h-32 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 backdrop-blur-md flex items-center justify-center border border-primary/30"
            animate={{
              scale: [1, 1.05, 1],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{ animation: 'pulse-glow 2s ease-in-out infinite' }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            >
              <Search className="w-12 h-12 text-primary" />
            </motion.div>
          </motion.div>

          {/* Floating dots */}
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const angle = (i / 6) * Math.PI * 2
            const radius = 100
            return (
              <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full bg-primary"
                style={{
                  left: '50%',
                  top: '50%',
                }}
                animate={{
                  x: [
                    Math.cos(angle) * radius - 4,
                    Math.cos(angle + Math.PI) * radius - 4,
                    Math.cos(angle) * radius - 4,
                  ],
                  y: [
                    Math.sin(angle) * radius - 4,
                    Math.sin(angle + Math.PI) * radius - 4,
                    Math.sin(angle) * radius - 4,
                  ],
                  opacity: [0.4, 1, 0.4],
                  scale: [1, 1.3, 1],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  delay: i * 0.2,
                  ease: 'easeInOut',
                }}
              />
            )
          })}
        </div>

        {/* Status text */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center mb-6"
        >
          <h2 className="text-2xl font-bold mb-1">
            Поиск соперника{dots}
          </h2>
          <p className="text-muted-foreground text-sm">
            {queueCount > 1
              ? `${queueCount} игроков в очереди`
              : queueCount === 1
              ? 'Только ты в очереди'
              : 'Подключаемся к серверу...'}
          </p>
        </motion.div>

        {/* Progress bar */}
        <div className="w-full max-w-xs mb-6">
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            <span>Время поиска</span>
            <span>{elapsed}с / 20с</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-accent"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Bot available button */}
        <AnimatePresence>
          {botAvailable && (
            <motion.div
              initial={{ opacity: 0, y: 20, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -20, height: 0 }}
              className="w-full"
            >
              <Button
                onClick={handlePlayBot}
                size="lg"
                className="w-full h-14 text-base bg-accent hover:bg-accent/90"
              >
                <Bot className="w-5 h-5 mr-2" />
                Сыграть с ботом
              </Button>
              <p className="text-center text-xs text-muted-foreground mt-2">
                Не дождались игрока? Бот не уступит человеку!
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Cancel */}
        {!botAvailable && (
          <Button
            onClick={handleCancel}
            variant="ghost"
            size="lg"
            className="text-muted-foreground"
          >
            Отмена
          </Button>
        )}
      </div>
    </motion.div>
  )
}
