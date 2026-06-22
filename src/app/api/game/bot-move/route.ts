import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { getBestMove, checkWinner, isBoardFull, Board, Cell } from '@/lib/bot'
import { db } from '@/lib/db'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

// In-memory game store for bot games (same as socket server but via HTTP)
interface BotGame {
  board: Board
  currentTurn: Cell
  status: 'active' | 'finished'
  winner: Cell | 'draw' | null
  winningLine: number[] | null
  playerSymbol: Cell
  botSymbol: Cell
  updatedAt: number
  userId: string
  statsUpdated: boolean
}

const botGames = new Map<string, BotGame>()

// Cleanup stale games every 5 minutes (games not updated in 1 hour).
// Without this, botGames grows unboundedly as users start new games.
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const cutoff = Date.now() - 60 * 60 * 1000 // 1 hour
    for (const [id, game] of botGames) {
      if (game.updatedAt < cutoff) {
        botGames.delete(id)
      }
    }
  }, 5 * 60 * 1000).unref?.()
}

async function updateStats(game: BotGame) {
  if (game.statsUpdated) return
  game.statsUpdated = true
  try {
    const user = await db.user.findUnique({ where: { id: game.userId } })
    if (!user) return
    const result = game.winner === 'draw' ? 'draw' : game.winner === game.playerSymbol ? 'win' : 'loss'
    await db.user.update({
      where: { id: game.userId },
      data: {
        gamesPlayed: { increment: 1 },
        gamesWon: result === 'win' ? { increment: 1 } : user.gamesWon,
        gamesLost: result === 'loss' ? { increment: 1 } : user.gamesLost,
        gamesDraw: result === 'draw' ? { increment: 1 } : user.gamesDraw,
      }
    })
  } catch (e) {
    console.error('updateStats error:', e)
  }
}

// Rate limit: 60 bot moves per minute per IP (a game has max ~5 moves, so this is generous).
const RL_WINDOW = 60_000
const RL_MAX = 60

export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
  }

  // Rate limit
  const ip = getClientIp(req)
  const rl = rateLimit(`bot-move:${ip}`, { windowMs: RL_WINDOW, max: RL_MAX })
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Слишком много запросов. Подожди минуту.' },
      { status: 429 }
    )
  }

  const body = await req.json()
  const { gameId, index, action } = body as { gameId?: string; index?: number; action?: 'create' | 'move' | 'state' }

  // Create new bot game
  if (action === 'create') {
    const newGame: BotGame = {
      board: ['', '', '', '', '', '', '', '', ''],
      currentTurn: 'X',
      status: 'active',
      winner: null,
      winningLine: null,
      playerSymbol: 'X',
      botSymbol: 'O',
      updatedAt: Date.now(),
      userId: user.id,
      statsUpdated: false,
    }
    const id = `bot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    botGames.set(id, newGame)
    return NextResponse.json({
      gameId: id,
      board: newGame.board,
      currentTurn: newGame.currentTurn,
      status: newGame.status,
      playerSymbol: newGame.playerSymbol,
      botSymbol: newGame.botSymbol,
    })
  }

  // Get game state
  if (action === 'state' && gameId) {
    const game = botGames.get(gameId)
    if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    return NextResponse.json({
      gameId,
      board: game.board,
      currentTurn: game.currentTurn,
      status: game.status,
      winner: game.winner,
      winningLine: game.winningLine,
      playerSymbol: game.playerSymbol,
      botSymbol: game.botSymbol,
    })
  }

  // Make a move
  if (action === 'move' && gameId && index !== undefined) {
    const game = botGames.get(gameId)
    if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    if (game.userId !== user.id) return NextResponse.json({ error: 'Not your game' }, { status: 403 })
    if (game.status !== 'active') return NextResponse.json({ error: 'Game finished' }, { status: 400 })
    if (game.currentTurn !== game.playerSymbol) return NextResponse.json({ error: 'Not your turn' }, { status: 400 })
    if (index < 0 || index > 8 || game.board[index] !== '') return NextResponse.json({ error: 'Invalid move' }, { status: 400 })

    // Player move
    game.board[index] = game.playerSymbol
    game.currentTurn = game.botSymbol
    game.updatedAt = Date.now()

    // Check winner after player move
    const playerResult = checkWinner(game.board)
    if (playerResult.winner) {
      game.status = 'finished'
      game.winner = playerResult.winner
      game.winningLine = playerResult.line
      await updateStats(game)
    } else if (isBoardFull(game.board)) {
      game.status = 'finished'
      game.winner = 'draw'
      await updateStats(game)
    } else {
      // Bot move (synchronous — small delay simulated client-side if desired)
      const botMove = getBestMove([...game.board], game.botSymbol, 'medium')
      if (botMove >= 0) {
        game.board[botMove] = game.botSymbol
        game.currentTurn = game.playerSymbol

        const botResult = checkWinner(game.board)
        if (botResult.winner) {
          game.status = 'finished'
          game.winner = botResult.winner
          game.winningLine = botResult.line
          await updateStats(game)
        } else if (isBoardFull(game.board)) {
          game.status = 'finished'
          game.winner = 'draw'
          await updateStats(game)
        }
      }
    }

    return NextResponse.json({
      gameId,
      board: game.board,
      currentTurn: game.currentTurn,
      status: game.status,
      winner: game.winner,
      winningLine: game.winningLine,
      playerSymbol: game.playerSymbol,
      botSymbol: game.botSymbol,
    })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
