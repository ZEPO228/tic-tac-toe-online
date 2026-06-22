'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore, GameState } from '@/lib/store'
import { getSocket } from '@/lib/socket-client'
import { AvatarDisplay } from './AvatarDisplay'
import { useEffect, useState, useRef } from 'react'
import { Bot, ArrowLeft, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { playMove, playResult } from '@/lib/game-feedback'

interface GameStateFromServer {
  gameId: string
  board: string[]
  currentTurn: 'X' | 'O'
  status: 'active' | 'finished'
  winner: 'X' | 'O' | 'draw' | null
  winningLine: number[] | null
  forfeit?: boolean
}

export function GameView() {
  const { user, currentMatch, gameState, setGameState, setView, setCurrentMatch, showToast } = useAppStore()
  const [showResult, setShowResult] = useState(false)
  const [httpGameId, setHttpGameId] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [botGameError, setBotGameError] = useState<string | null>(null)
  const statsUpdatedRef = useRef(false)
  const resultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // For bot games, use HTTP API; for multiplayer, use socket.io
  const isBotGame = currentMatch?.isVsBot

  // Cleanup all timers and in-flight requests on unmount
  useEffect(() => {
    return () => {
      if (resultTimerRef.current) clearTimeout(resultTimerRef.current)
      abortControllerRef.current?.abort()
    }
  }, [])

  // Helper: schedule showResult with cleanup tracking
  function scheduleShowResult() {
    if (resultTimerRef.current) clearTimeout(resultTimerRef.current)
    resultTimerRef.current = setTimeout(() => setShowResult(true), 800)
  }

  useEffect(() => {
    if (!isBotGame || httpGameId) return

    // Cancel any previous in-flight create request
    abortControllerRef.current?.abort()
    const ctrl = new AbortController()
    abortControllerRef.current = ctrl

    fetch('/api/game/bot-move', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create' }),
      signal: ctrl.signal,
    })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(data => {
        if (data.gameId) {
          setHttpGameId(data.gameId)
          setBotGameError(null)
        } else {
          setBotGameError('Не удалось создать игру с ботом')
          showToast('error', 'Не удалось создать игру с ботом')
        }
      })
      .catch(e => {
        if (e.name === 'AbortError') return
        console.error('Failed to create bot game:', e)
        setBotGameError('Сетевая ошибка при создании игры')
        showToast('error', 'Сетевая ошибка при создании игры')
      })
  }, [isBotGame, httpGameId, showToast])

  // Socket.io listeners for multiplayer games
  useEffect(() => {
    if (isBotGame) return // bot games use HTTP

    const socket = getSocket()
    if (!socket) return

    const onGameState = (state: GameStateFromServer) => {
      // Validate server payload shape before trusting it.
      if (!state || !Array.isArray(state.board) || state.board.length !== 9) return
      setGameState(state)
      if (state.status === 'finished') {
        // Determine result from player's perspective and play feedback.
        // We use useAppStore.getState() to read the latest user/match values
        // without adding them to the effect's deps (which would re-register
        // listeners on every state change).
        const s = useAppStore.getState()
        const match = s.currentMatch
        const u = s.user
        if (match && u) {
          const mySymbol = match.player1.userId === u.id ? match.player1.symbol : match.player2?.symbol
          if (mySymbol) {
            const result = state.winner === 'draw' ? 'draw' : state.winner === mySymbol ? 'win' : 'loss'
            playResult(result as 'win' | 'loss' | 'draw')
          }
        }
        scheduleShowResult()
      }
    }

    const onGameEnd = () => {
      scheduleShowResult()
    }

    socket.on('game_state', onGameState)
    socket.on('game_end', onGameEnd)

    return () => {
      socket.off('game_state', onGameState)
      socket.off('game_end', onGameEnd)
    }
  }, [isBotGame, setGameState])

  // Update stats when game ends (for bot games via HTTP)
  useEffect(() => {
    if (!isBotGame || !gameState || statsUpdatedRef.current) return
    if (gameState.status !== 'finished') return

    statsUpdatedRef.current = true
    // Refresh user data from server
    if (user) {
      fetch('/api/profile')
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          if (d?.user) {
            useAppStore.getState().setUser(d.user)
          }
        })
        .catch(() => {})
    }
    scheduleShowResult()
  }, [gameState, isBotGame, user])

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

  // Defensive null checks — bot games always have player2 (the bot).
  if (!currentMatch.player1 || !currentMatch.player2) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Некорректные данные матча</p>
          <Button onClick={() => setView('menu')}>Вернуться в меню</Button>
        </div>
      </div>
    )
  }

  if (isBotGame && botGameError && !httpGameId) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">{botGameError}</p>
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

  // At this point gameState is guaranteed non-null (early return above).
  const gs = gameState as GameState
  const isMyTurn = gs.currentTurn === mySymbol && gs.status === 'active'

  async function handleCellClick(index: number) {
    if (gs.status !== 'active') return
    if (gs.board[index] !== '') return
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
          // Audio + haptic feedback for the player's move
          playMove()
          // If the bot's response also ended the game, play result sound
          if (data.status === 'finished') {
            // Determine result from player's perspective
            const mySymbol = me.symbol
            const result = data.winner === 'draw' ? 'draw' : data.winner === mySymbol ? 'win' : 'loss'
            playResult(result as 'win' | 'loss' | 'draw')
          }
        } else {
          showToast('error', data.error || 'Ошибка хода')
        }
      } catch {
        showToast('error', 'Сетевая ошибка')
      } finally {
        setIsProcessing(false)
      }
    } else {
      // Multiplayer via socket.io
      const socket = getSocket()
      if (socket) {
        socket.emit('game_move', { gameId: gs.gameId, index })
        // Play move sound (server will confirm via game_state event)
        playMove()
      }
    }
  }

  function handleLeave() {
    if (!isBotGame) {
      const socket = getSocket()
      if (socket && gs.status === 'active') {
        socket.emit('game_leave', { gameId: gs.gameId })
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
    setBotGameError(null)
    setView('matchmaking')
  }

  function handleBackToMenu() {
    setShowResult(false)
    setCurrentMatch(null)
    setGameState(null)
    setHttpGameId(null)
    statsUpdatedRef.current = false
    setBotGameError(null)
    setView('menu')
  }

  let result: 'win' | 'loss' | 'draw' | null = null
  if (gs.status === 'finished' && gs.winner) {
    if (gs.winner === 'draw') result = 'draw'
    else if (gs.winner === mySymbol) result = 'win'
    else result = 'loss'
  }

  const winningLine = gs.winningLine

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
            <div className={`text-xs ${!isMyTurn && gs.status === 'active' ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
              {!isMyTurn && gs.status === 'active' ? 'Ходит...' : ''}
            </div>
          </div>
        </motion.div>

        {/* Game board */}
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-[320px] aspect-square">
            <div className="grid grid-cols-3 gap-2 h-full p-3 bg-card/30 rounded-3xl border border-border">
              {gs.board.map((cell, idx) => {
                const isWinning = winningLine?.includes(idx)
                const row = Math.floor(idx / 3) + 1
                const col = (idx % 3) + 1
                const cellLabel = `Ряд ${row}, столбец ${col}, ${cell === 'X' ? 'крестик' : cell === 'O' ? 'нолик' : 'пусто'}`
                return (
                  <motion.button
                    key={idx}
                    onClick={() => handleCellClick(idx)}
                    disabled={cell !== '' || gs.status !== 'active' || !isMyTurn || isProcessing}
                    whileHover={cell === '' && isMyTurn && gs.status === 'active' && !isProcessing ? { scale: 1.03 } : {}}
                    whileTap={cell === '' && isMyTurn && gs.status === 'active' && !isProcessing ? { scale: 0.95 } : {}}
                    aria-label={cellLabel}
                    className={`relative rounded-2xl flex items-center justify-center text-5xl font-bold transition-all ${
                      isWinning
                        ? 'bg-primary/30 border-2 border-primary'
                        : cell === ''
                        ? isMyTurn && gs.status === 'active' && !isProcessing
                          ? 'bg-secondary/50 hover:bg-secondary border-2 border-transparent hover:border-primary/30 cursor-pointer'
                          : 'bg-secondary/30 border-2 border-transparent'
                        : cell === 'X'
                        ? 'bg-primary/10 border-2 border-primary/20'
                        : 'bg-accent/10 border-2 border-accent/20'
                    } ${!isMyTurn && cell === '' && gs.status === 'active' ? 'cursor-not-allowed' : ''}`}
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
                        className="text-accent-foreground"
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
                aria-hidden="true"
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
