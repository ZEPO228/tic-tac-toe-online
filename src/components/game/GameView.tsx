'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { getSocket } from '@/lib/socket-client'
import { AvatarDisplay } from './AvatarDisplay'
import { useEffect, useState, useRef } from 'react'
import { Bot, ArrowLeft, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function GameView() {
  const { user, currentMatch, gameState, setGameState, setView, setCurrentMatch, showToast } = useAppStore()
  const [showResult, setShowResult] = useState(false)
  const [httpGameId, setHttpGameId] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const statsUpdatedRef = useRef(false)

  // For bot games, use HTTP API; for multiplayer, use socket.io
  const isBotGame = currentMatch?.isVsBot

  useEffect(() => {
    // If it's a bot game and we don't have an HTTP game ID yet, create one
    if (isBotGame && !httpGameId) {
      fetch('/api/game/bot-move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create' }),
      })
        .then(r => r.json())
        .then(data => {
          if (data.gameId) {
            setHttpGameId(data.gameId)
          }
        })
        .catch(e => console.error('Failed to create bot game:', e))
    }
  }, [isBotGame, httpGameId])

  // Socket.io listeners for multiplayer games
  useEffect(() => {
    if (isBotGame) return // bot games use HTTP

    const socket = getSocket()
    if (!socket) return

    const onGameState = (state: any) => {
      setGameState(state)
      if (state.status === 'finished') {
        setTimeout(() => setShowResult(true), 800)
      }
    }

    const onGameEnd = () => {
      setTimeout(() => setShowResult(true), 800)
    }

    socket.on('game_state', onGameState)
    socket.on('game_end', onGameEnd)

    return () => {
      socket.off('game_state', onGameState)
      socket.off('game_end', onGameEnd)
    }
  }, [isBotGame])

  // Update stats when game ends (for bot games via HTTP)
  useEffect(() => {
    if (!isBotGame || !gameState || statsUpdatedRef.current) return
    if (gameState.status !== 'finished') return
    
    statsUpdatedRef.current = true
    // Update user stats locally
    if (user) {
      const won = gameState.winner === user.id || (currentMatch && gameState.winner === currentMatch.player1.symbol)
      // Refresh user data from server
      fetch('/api/profile').then(r => r.json()).then(d => {
        if (d.user) {
          useAppStore.getState().setUser(d.user)
        }
      })
    }
    setTimeout(() => setShowResult(true), 800)
  }, [gameState, isBotGame, user, currentMatch])

  if (!currentMatch || !gameState || !user) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Игра не найдена</p>
          <Button onClick={() => setView('menu')}>Вернуться в меню</Button>
        </div>
      </div>
    )
  }

  const isPlayer1 = currentMatch.player1.userId === user.id
  const me = isPlayer1 ? currentMatch.player1 : currentMatch.player2
  const opponent = isPlayer1 ? currentMatch.player2 : currentMatch.player1
  const mySymbol = me.symbol
  const opponentSymbol = opponent.symbol



  const isMyTurn = gameState.currentTurn === mySymbol && gameState.status === 'active'

  async function handleCellClick(index: number) {
    if (gameState.status !== 'active') return
    if (gameState.board[index] !== '') return
    if (!isMyTurn) return
    if (isProcessing) return

    if (isBotGame && httpGameId) {
      // HTTP-based bot game
      setIsProcessing(true)
      try {
        const res = await fetch('/api/game/bot-move', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'move', gameId: httpGameId, index }),
        })
        const data = await res.json()
        if (res.ok) {
          setGameState({
            gameId: data.gameId,
            board: data.board,
            currentTurn: data.currentTurn,
            status: data.status,
            winner: data.winner,
            winningLine: data.winningLine,
          })
        } else {
          showToast('error', data.error || 'Ошибка хода')
        }
      } catch (e) {
        showToast('error', 'Сетевая ошибка')
      } finally {
        setIsProcessing(false)
      }
    } else {
      // Multiplayer via socket.io
      const socket = getSocket()
      if (socket) {
        socket.emit('game_move', { gameId: gameState.gameId, index })
      }
    }
  }

  function handleLeave() {
    if (!isBotGame) {
      const socket = getSocket()
      if (socket && gameState.status === 'active') {
        socket.emit('game_leave', { gameId: gameState.gameId })
      }
    }
    setCurrentMatch(null)
    setGameState(null)
    setView('menu')
  }

  function handlePlayAgain() {
    setShowResult(false)
    setCurrentMatch(null)
    setGameState(null)
    setHttpGameId(null)
    statsUpdatedRef.current = false
    setView('matchmaking')
  }

  function handleBackToMenu() {
    setShowResult(false)
    setCurrentMatch(null)
    setGameState(null)
    setHttpGameId(null)
    statsUpdatedRef.current = false
    setView('menu')
  }

  let result: 'win' | 'loss' | 'draw' | null = null
  if (gameState.status === 'finished' && gameState.winner) {
    if (gameState.winner === 'draw') result = 'draw'
    else if (gameState.winner === mySymbol) result = 'win'
    else result = 'loss'
  }

  const winningLine = gameState.winningLine

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="min-h-[100dvh] gradient-bg flex flex-col safe-top safe-bottom"
    >
      <div className="max-w-md mx-auto w-full p-4 flex flex-col min-h-[100dvh]">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={handleLeave}
            className="p-2 rounded-lg hover:bg-card/50 text-muted-foreground"
            aria-label="Выйти из игры"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="text-sm text-muted-foreground">
            {isBotGame ? 'Игра с ботом' : 'Онлайн игра'}
          </div>
          <div className="w-9" />
        </div>

        {/* Opponent card (top) */}
        <motion.div
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className={`mb-4 p-3 rounded-2xl border flex items-center gap-3 transition-all ${
            isMyTurn
              ? 'bg-card/40 border-border opacity-60'
              : 'bg-card/60 border-primary/40 shadow-lg shadow-primary/10'
          }`}
        >
          <AvatarDisplay
            avatar={opponent.avatar}
            size={56}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold truncate">{opponent.username}</span>
              {isBotGame && <Bot className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
            </div>
            <div className="text-xs text-muted-foreground">
              Символ: <span className="font-mono font-bold text-foreground">{opponentSymbol}</span>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-xs ${!isMyTurn && gameState.status === 'active' ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
              {!isMyTurn && gameState.status === 'active' ? 'Ходит...' : ''}
            </div>
          </div>
        </motion.div>

        {/* Game board */}
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-[320px] aspect-square">
            <div className="grid grid-cols-3 gap-2 h-full p-3 bg-card/30 rounded-3xl border border-border">
              {gameState.board.map((cell, idx) => {
                const isWinning = winningLine?.includes(idx)
                return (
                  <motion.button
                    key={idx}
                    onClick={() => handleCellClick(idx)}
                    disabled={cell !== '' || gameState.status !== 'active' || !isMyTurn || isProcessing}
                    whileHover={cell === '' && isMyTurn && gameState.status === 'active' && !isProcessing ? { scale: 1.03 } : {}}
                    whileTap={cell === '' && isMyTurn && gameState.status === 'active' && !isProcessing ? { scale: 0.95 } : {}}
                    className={`relative rounded-2xl flex items-center justify-center text-5xl font-bold transition-all ${
                      isWinning
                        ? 'bg-primary/30 border-2 border-primary'
                        : cell === ''
                        ? isMyTurn && gameState.status === 'active' && !isProcessing
                          ? 'bg-secondary/50 hover:bg-secondary border-2 border-transparent hover:border-primary/30 cursor-pointer'
                          : 'bg-secondary/30 border-2 border-transparent'
                        : cell === 'X'
                        ? 'bg-primary/10 border-2 border-primary/20'
                        : 'bg-accent/10 border-2 border-accent/20'
                    } ${!isMyTurn && cell === '' && gameState.status === 'active' ? 'cursor-not-allowed' : ''}`}
                  >
                    {cell === 'X' && (
                      <motion.span
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                        className="text-primary"
                      >
                        ✕
                      </motion.span>
                    )}
                    {cell === 'O' && (
                      <motion.span
                        initial={{ scale: 0, rotate: 180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                        style={{ color: 'oklch(0.78 0.18 295)' }}
                      >
                        ⭕
                      </motion.span>
                    )}
                  </motion.button>
                )
              })}
            </div>
          </div>
        </div>

        {/* My card (bottom) */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className={`mt-4 p-3 rounded-2xl border flex items-center gap-3 transition-all ${
            isMyTurn
              ? 'bg-card/60 border-primary/40 shadow-lg shadow-primary/10'
              : 'bg-card/40 border-border opacity-60'
          }`}
        >
          <AvatarDisplay
            avatar={me.avatar}
            size={56}
          />
          <div className="flex-1 min-w-0">
            <div className="font-semibold truncate">{me.username} (ты)</div>
            <div className="text-xs text-muted-foreground">
              Символ: <span className="font-mono font-bold text-foreground">{mySymbol}</span>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-xs ${isMyTurn && gameState.status === 'active' ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
              {isMyTurn && gameState.status === 'active' ? 'Твой ход!' : isProcessing ? 'Обработка...' : ''}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Result modal */}
      <AnimatePresence>
        {showResult && result && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.8, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.8, y: 20, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              className="bg-card border border-border rounded-3xl p-8 max-w-xs w-full text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="text-7xl mb-4"
              >
                {result === 'win' ? '🎉' : result === 'loss' ? '😔' : '🤝'}
              </motion.div>
              <h2 className={`text-2xl font-bold mb-2 ${
                result === 'win' ? 'text-primary' : result === 'loss' ? 'text-destructive' : 'text-muted-foreground'
              }`}>
                {result === 'win' ? 'Победа!' : result === 'loss' ? 'Поражение' : 'Ничья'}
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                {result === 'win'
                  ? 'Отличная игра! Ты победил.'
                  : result === 'loss'
                  ? 'В следующий раз повезёт больше!'
                  : 'Равные силы!'}
              </p>
              <div className="space-y-2">
                <Button
                  onClick={handlePlayAgain}
                  className="w-full h-12"
                  size="lg"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Играть снова
                </Button>
                <Button
                  onClick={handleBackToMenu}
                  variant="ghost"
                  className="w-full h-12"
                  size="lg"
                >
                  В главное меню
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
