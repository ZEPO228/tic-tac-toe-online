import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { getBestMove, checkWinner, isBoardFull, Board, Cell } from '@/lib/bot'

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
}

const botGames = new Map<string, BotGame>()

export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
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
    } else if (isBoardFull(game.board)) {
      game.status = 'finished'
      game.winner = 'draw'
    } else {
      // Bot move (after small delay, but we do it synchronously here)
      const botMove = getBestMove([...game.board], game.botSymbol, 'medium')
      if (botMove >= 0) {
        game.board[botMove] = game.botSymbol
        game.currentTurn = game.playerSymbol

        const botResult = checkWinner(game.board)
        if (botResult.winner) {
          game.status = 'finished'
          game.winner = botResult.winner
          game.winningLine = botResult.line
        } else if (isBoardFull(game.board)) {
          game.status = 'finished'
          game.winner = 'draw'
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
