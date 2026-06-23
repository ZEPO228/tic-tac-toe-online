import { Server, Socket } from 'socket.io'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'
import { getBestMove, checkWinner, isBoardFull, Board, Cell } from './bot'
import { isAdminUsername } from './admin'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me-in-production'

// Use a separate Prisma client instance for the socket server
// (avoids issues with Next.js bundling)
const db = new PrismaClient()

interface AuthPayload {
  userId: string
  username: string
}

interface OnlinePlayer {
  userId: string
  username: string
  avatar: string
  customAvatar?: string | null
  socketId: string
  status: 'menu' | 'queue' | 'game' | 'chat'
  gameId?: string
}

interface QueuedPlayer {
  userId: string
  username: string
  avatar: string
  customAvatar?: string | null
  socketId: string
  joinedAt: number
  timer?: NodeJS.Timeout
}

interface ActiveGame {
  id: string
  player1: { userId: string; username: string; avatar: string; customAvatar?: string | null; socketId: string; symbol: Cell }
  player2: { userId: string; username: string; avatar: string; customAvatar?: string | null; socketId: string; symbol: Cell } | null
  isVsBot: boolean
  botDifficulty?: 'easy' | 'medium' | 'hard' // Fixed per game — set on game creation
  board: Board
  currentTurn: Cell
  status: 'active' | 'finished'
  winner: Cell | 'draw' | null
  winningLine: number[] | null
  createdAt: number
}

const onlinePlayers = new Map<string, OnlinePlayer>() // userId -> OnlinePlayer
const queue: QueuedPlayer[] = []
const activeGames = new Map<string, ActiveGame>() // gameId -> ActiveGame
let recentMessages: Array<{ id: string; userId: string | null; username: string; avatar: string; text: string; createdAt: number }> = []
const MAX_MESSAGES = 50

// Module-level reference to the io server — set by setupSocketIO.
// This lets helper functions (makeBotMove, finishGame, etc.) emit events
// without needing io passed as an argument everywhere.
let io: Server | null = null

// Load recent messages from DB on server start (so chat history persists across deploys/restarts)
;(async () => {
  try {
    const dbMessages = await db.message.findMany({
      orderBy: { createdAt: 'desc' },
      take: MAX_MESSAGES,
    })
    // Reverse to chronological order (oldest first)
    recentMessages = dbMessages.reverse().map(m => ({
      id: m.id,
      userId: m.userId,
      username: m.username,
      avatar: m.avatar,
      text: m.text,
      createdAt: m.createdAt.getTime(),
    }))
    console.log(`[socket-server] Loaded ${recentMessages.length} messages from DB`)
  } catch (e) {
    console.error('[socket-server] Failed to load messages from DB:', e)
  }
})()

function verifyToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthPayload
  } catch {
    return null
  }
}

function getBotDifficulty(): 'easy' | 'medium' | 'hard' {
  // Random difficulty for variety — when the user clicks "play with bot"
  // after waiting 20s in queue, they get a random skill level bot.
  // This keeps the game fresh (sometimes easy, sometimes hard) instead of
  // always medium.
  const difficulties: ('easy' | 'medium' | 'hard')[] = ['easy', 'medium', 'hard']
  return difficulties[Math.floor(Math.random() * difficulties.length)]
}

async function updateUserStats(userId: string, result: 'win' | 'loss' | 'draw') {
  try {
    const user = await db.user.findUnique({ where: { id: userId } })
    if (!user) return
    await db.user.update({
      where: { id: userId },
      data: {
        gamesPlayed: { increment: 1 },
        gamesWon: result === 'win' ? { increment: 1 } : user.gamesWon,
        gamesLost: result === 'loss' ? { increment: 1 } : user.gamesLost,
        gamesDraw: result === 'draw' ? { increment: 1 } : user.gamesDraw,
      }
    })
  } catch (e) {
    console.error('updateUserStats error:', e)
  }
}

async function persistGame(game: ActiveGame) {
  try {
    await db.game.create({
      data: {
        id: game.id,
        player1Id: game.player1.userId,
        player2Id: game.player2?.userId || null,
        player1Symbol: game.player1.symbol,
        player2Symbol: game.player2?.symbol || 'O',
        isVsBot: game.isVsBot,
        status: 'finished',
        winner: game.winner === 'draw' ? 'draw' : game.winner === game.player1.symbol ? 'player1' : 'player2',
        board: JSON.stringify(game.board),
        currentTurn: game.currentTurn,
      }
    })
  } catch (e) {
    console.error('persistGame error:', e)
  }
}

function broadcastOnlineCount(io: Server) {
  io!.emit('online_count', { count: onlinePlayers.size })
  // Also broadcast the list of online user IDs so clients can show online/offline status
  const onlineUserIds = Array.from(onlinePlayers.keys())
  io!.emit('online_users', { userIds: onlineUserIds })
}

function broadcastQueueCount(io: Server) {
  io!.emit('queue_count', { count: queue.length })
}

function makeBotMove(game: ActiveGame) {
  console.log('[server] makeBotMove called', { gameId: game.id, status: game.status, isVsBot: game.isVsBot, currentTurn: game.currentTurn })
  if (game.status !== 'active' || !game.isVsBot) return
  const botSymbol: Cell = game.player2!.symbol
  if (game.currentTurn !== botSymbol) return

  // Small delay for realism
  setTimeout(() => {
    if (game.status !== 'active') return
    const move = getBestMove([...game.board], botSymbol, game.botDifficulty || 'medium')
    if (move < 0) return
    game.board[move] = botSymbol
    game.currentTurn = game.player1.symbol

    const { winner, line } = checkWinner(game.board)
    if (winner) {
      game.status = 'finished'
      game.winner = winner
      game.winningLine = line
    } else if (isBoardFull(game.board)) {
      game.status = 'finished'
      game.winner = 'draw'
    }

    io!.to(`game:${game.id}`).emit('game_state', {
      gameId: game.id,
      board: game.board,
      currentTurn: game.currentTurn,
      status: game.status,
      winner: game.winner,
      winningLine: game.winningLine,
    })

    if (game.status === 'finished') {
      finishGame(game)
    }
  }, 800 + Math.random() * 700)
}

function finishGame(game: ActiveGame) {
  if (!game.winner) return

  // Update stats
  if (game.isVsBot) {
    const playerWon = game.winner === game.player1.symbol
    const isDraw = game.winner === 'draw'
    updateUserStats(game.player1.userId, isDraw ? 'draw' : playerWon ? 'win' : 'loss')
  } else if (game.player2) {
    const p1Won = game.winner === game.player1.symbol
    const isDraw = game.winner === 'draw'
    updateUserStats(game.player1.userId, isDraw ? 'draw' : p1Won ? 'win' : 'loss')
    updateUserStats(game.player2.userId, isDraw ? 'draw' : p1Won ? 'loss' : 'win')
  }

  // Notify players
  io!.to(`game:${game.id}`).emit('game_end', {
    gameId: game.id,
    winner: game.winner,
    winningLine: game.winningLine,
  })

  // Update online player statuses
  const p1 = onlinePlayers.get(game.player1.userId)
  if (p1) {
    p1.status = 'menu'
    p1.gameId = undefined
  }
  if (game.player2 && !game.isVsBot) {
    const p2 = onlinePlayers.get(game.player2.userId)
    if (p2) {
      p2.status = 'menu'
      p2.gameId = undefined
    }
  }

  persistGame(game)

  // Remove from active games after a delay
  setTimeout(() => {
    activeGames.delete(game.id)
  }, 60_000)
}

function tryMatch(io: Server) {
  while (queue.length >= 2) {
    const p1 = queue.shift()!
    const p2 = queue.shift()!

    // Clear timers
    if (p1.timer) clearTimeout(p1.timer)
    if (p2.timer) clearTimeout(p2.timer)

    // Randomize who goes first
    const [first, second] = Math.random() < 0.5 ? [p1, p2] : [p2, p1]

    const game: ActiveGame = {
      id: `game-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      player1: {
        userId: first.userId,
        username: first.username,
        avatar: first.avatar,
        customAvatar: first.customAvatar,
        socketId: first.socketId,
        symbol: 'X',
      },
      player2: {
        userId: second.userId,
        username: second.username,
        avatar: second.avatar,
        customAvatar: second.customAvatar,
        socketId: second.socketId,
        symbol: 'O',
      },
      isVsBot: false,
      board: ['', '', '', '', '', '', '', '', ''],
      currentTurn: 'X',
      status: 'active',
      winner: null,
      winningLine: null,
      createdAt: Date.now(),
    }
    activeGames.set(game.id, game)

    // Update player statuses
    const op1 = onlinePlayers.get(first.userId)
    const op2 = onlinePlayers.get(second.userId)
    if (op1) { op1.status = 'game'; op1.gameId = game.id }
    if (op2) { op2.status = 'game'; op2.gameId = game.id }

    // Join socket rooms
    const s1 = io!.sockets.sockets.get(first.socketId)
    const s2 = io!.sockets.sockets.get(second.socketId)
    s1?.join(`game:${game.id}`)
    s2?.join(`game:${game.id}`)

    // Notify both
    io!.to(`game:${game.id}`).emit('match_found', {
      gameId: game.id,
      player1: { userId: first.userId, username: first.username, avatar: first.avatar, customAvatar: first.customAvatar, symbol: 'X', isAdmin: isAdminUsername(first.username) },
      player2: { userId: second.userId, username: second.username, avatar: second.avatar, customAvatar: second.customAvatar, symbol: 'O', isAdmin: isAdminUsername(second.username) },
      board: game.board,
      currentTurn: game.currentTurn,
    })
  }
  broadcastQueueCount(io)
}

function startBotGame(io: Server, playerId: string) {
  const player = onlinePlayers.get(playerId)
  if (!player) return

  // Remove from queue if present
  const qIdx = queue.findIndex(q => q.userId === playerId)
  if (qIdx >= 0) {
    const q = queue[qIdx]
    if (q.timer) clearTimeout(q.timer)
    queue.splice(qIdx, 1)
  }

  // Pick a random difficulty ONCE per game (fixed for the entire game).
  // This ensures the bot is consistent within a single match.
  const difficulty = getBotDifficulty()

  const game: ActiveGame = {
    id: `game-bot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    player1: {
      userId: player.userId,
      username: player.username,
      avatar: player.avatar,
      customAvatar: player.customAvatar,
      socketId: player.socketId,
      symbol: 'X',
    },
    player2: {
      userId: 'bot',
      username: 'Бот',
      avatar: 'avatar-16',
      socketId: '',
      symbol: 'O',
    },
    isVsBot: true,
    botDifficulty: difficulty,
    board: ['', '', '', '', '', '', '', '', ''],
    currentTurn: 'X',
    status: 'active',
    winner: null,
    winningLine: null,
    createdAt: Date.now(),
  }
  activeGames.set(game.id, game)

  player.status = 'game'
  player.gameId = game.id

  const s = io!.sockets.sockets.get(player.socketId)
  s?.join(`game:${game.id}`)

  io!.to(`game:${game.id}`).emit('match_found', {
    gameId: game.id,
    player1: { userId: player.userId, username: player.username, avatar: player.avatar, customAvatar: player.customAvatar, symbol: 'X', isAdmin: isAdminUsername(player.username) },
    player2: { userId: 'bot', username: 'Бот', avatar: 'avatar-16', symbol: 'O' },
    isVsBot: true,
    botDifficulty: difficulty,
    board: game.board,
    currentTurn: game.currentTurn,
  })
  broadcastQueueCount(io)
}

export function setupSocketIO(ioServer: Server) {
  // Store the io instance at module level so helper functions can emit events.
  io = ioServer

  // Auth middleware
  ioServer.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined
    if (!token) {
      return next(new Error('No token provided'))
    }
    const payload = verifyToken(token)
    if (!payload) {
      return next(new Error('Invalid token'))
    }
    ;(socket as any).userId = payload.userId
    ;(socket as any).username = payload.username
    next()
  })

  ioServer.on('connection', (socket: Socket) => {
    const userId = (socket as any).userId as string
    const username = (socket as any).username as string

    // Get user from DB to fetch avatar (including custom avatar)
    db.user.findUnique({ where: { id: userId }, select: { avatar: true, customAvatar: true } })
      .then(u => {
        const avatar = u?.avatar || 'avatar-1'
        const customAvatar = u?.customAvatar || null
        onlinePlayers.set(userId, {
          userId,
          username,
          avatar,
          customAvatar,
          socketId: socket.id,
          status: 'menu',
        })
        broadcastOnlineCount(ioServer)
        socket.emit('connected', { userId, username, avatar })
      })

    // === Matchmaking ===
    socket.on('queue_join', () => {
      const player = onlinePlayers.get(userId)
      if (!player || player.status === 'game') return

      // Don't allow joining queue twice
      if (queue.some(q => q.userId === userId)) return

      const q: QueuedPlayer = {
        userId,
        username: player.username,
        avatar: player.avatar,
        customAvatar: player.customAvatar,
        socketId: socket.id,
        joinedAt: Date.now(),
      }
      queue.push(q)
      player.status = 'queue'
      broadcastQueueCount(ioServer)

      // After 20 seconds, send "play with bot" option
      q.timer = setTimeout(() => {
        const stillQueued = queue.find(p => p.userId === userId)
        if (stillQueued) {
          socket.emit('bot_available', { message: 'Не нашли игрока. Сыграть с ботом?' })
        }
      }, 20_000)

      tryMatch(ioServer)
    })

    socket.on('queue_leave', () => {
      const idx = queue.findIndex(q => q.userId === userId)
      if (idx >= 0) {
        const q = queue[idx]
        if (q.timer) clearTimeout(q.timer)
        queue.splice(idx, 1)
      }
      const player = onlinePlayers.get(userId)
      if (player) player.status = 'menu'
      broadcastQueueCount(ioServer)
    })

    socket.on('play_with_bot', () => {
      startBotGame(ioServer, userId)
    })

    // === Game moves ===
    socket.on('game_move', ({ gameId, index }: { gameId: string; index: number }) => {
      console.log('[server] game_move received:', { gameId, index, userId })
      const game = activeGames.get(gameId)
      if (!game || game.status !== 'active') { console.log('[server] game not found or not active'); return }
      if (index < 0 || index > 8 || game.board[index] !== '') return

      const playerSymbol: Cell | undefined = game.player1.userId === userId
        ? game.player1.symbol
        : game.player2?.symbol
      if (!playerSymbol) return
      if (game.currentTurn !== playerSymbol) return

      game.board[index] = playerSymbol
      game.currentTurn = playerSymbol === 'X' ? 'O' : 'X'

      const { winner, line } = checkWinner(game.board)
      if (winner) {
        game.status = 'finished'
        game.winner = winner
        game.winningLine = line
      } else if (isBoardFull(game.board)) {
        game.status = 'finished'
        game.winner = 'draw'
      }

      io!.to(`game:${game.id}`).emit('game_state', {
        gameId: game.id,
        board: game.board,
        currentTurn: game.currentTurn,
        status: game.status,
        winner: game.winner,
        winningLine: game.winningLine,
      })

      if (game.status === 'finished') {
        finishGame(game)
      } else if (game.isVsBot) {
        makeBotMove(game)
      }
    })

    socket.on('game_leave', ({ gameId }: { gameId: string }) => {
      const game = activeGames.get(gameId)
      if (!game) return

      // If game is still active, opponent wins by forfeit
      if (game.status === 'active') {
        if (game.isVsBot) {
          // Player forfeits bot game
          game.winner = game.player2!.symbol
        } else if (game.player2) {
          // Determine which player left
          const leaverSymbol = game.player1.userId === userId ? game.player1.symbol : game.player2.symbol
          game.winner = leaverSymbol === game.player1.symbol ? game.player2!.symbol : game.player1.symbol
        }
        game.status = 'finished'
        io!.to(`game:${game.id}`).emit('game_state', {
          gameId: game.id,
          board: game.board,
          currentTurn: game.currentTurn,
          status: game.status,
          winner: game.winner,
          winningLine: null,
          forfeit: true,
        })
        finishGame(game)
      }
      socket.leave(`game:${game.id}`)
    })

    // === Chat ===
    socket.on('chat_message', ({ text }: { text: string }) => {
      const player = onlinePlayers.get(userId)
      if (!player) return
      const trimmed = (text || '').slice(0, 500).trim()
      if (!trimmed) return

      const msg = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        userId,
        username: player.username,
        avatar: player.avatar,
        text: trimmed,
        createdAt: Date.now(),
      }
      recentMessages.push(msg)
      if (recentMessages.length > MAX_MESSAGES) recentMessages.shift()

      // Persist to DB
      db.message.create({ data: { userId, username: player.username, avatar: player.avatar, text: trimmed } })
        .catch(e => console.error('chat persist error:', e))

      io!.emit('chat_message', msg)
    })

    socket.on('chat_history', () => {
      socket.emit('chat_history', { messages: recentMessages })
    })

    socket.on('set_status', ({ status }: { status: OnlinePlayer['status'] }) => {
      const player = onlinePlayers.get(userId)
      if (player && player.status !== 'game') {
        player.status = status
      }
    })

    socket.on('get_online_players', () => {
      const players = Array.from(onlinePlayers.values()).map(p => ({
        userId: p.userId,
        username: p.username,
        avatar: p.avatar,
        status: p.status,
      }))
      socket.emit('online_players', { players })
    })

    // === Direct Messages ===
    socket.on('dm_send', async ({ recipientId, text }: { recipientId: string; text: string }) => {
      const player = onlinePlayers.get(userId)
      if (!player) return
      const trimmed = (text || '').slice(0, 1000).trim()
      if (!trimmed || recipientId === userId) return

      // Verify recipient exists and get info
      const recipient = await db.user.findUnique({
        where: { id: recipientId },
        select: { id: true, username: true, avatar: true, customAvatar: true }
      })
      if (!recipient) return

      // Persist to DB
      const msg = await db.directMessage.create({
        data: { senderId: userId, recipientId, text: trimmed }
      })

      // Build message payload
      const msgPayload = {
        id: msg.id,
        senderId: msg.senderId,
        recipientId: msg.recipientId,
        text: msg.text,
        read: msg.read,
        createdAt: msg.createdAt.getTime(),
        senderUsername: player.username,
        senderAvatar: player.avatar,
      }

      // Send to sender (echo back)
      socket.emit('dm_message', msgPayload)

      // Send to recipient if online
      const recipientPlayer = onlinePlayers.get(recipientId)
      if (recipientPlayer) {
        io!.to(recipientPlayer.socketId).emit('dm_message', msgPayload)
      }
    })

    socket.on('dm_typing', ({ recipientId, isTyping }: { recipientId: string; isTyping: boolean }) => {
      const recipientPlayer = onlinePlayers.get(recipientId)
      if (recipientPlayer) {
        io!.to(recipientPlayer.socketId).emit('dm_typing', { fromUserId: userId, isTyping })
      }
    })

    socket.on('disconnect', () => {
      // Remove from queue
      const qIdx = queue.findIndex(q => q.userId === userId)
      if (qIdx >= 0) {
        const q = queue[qIdx]
        if (q.timer) clearTimeout(q.timer)
        queue.splice(qIdx, 1)
        broadcastQueueCount(ioServer)
      }

      // Forfeit any active games
      for (const game of activeGames.values()) {
        if (game.status === 'active' && (game.player1.userId === userId || game.player2?.userId === userId)) {
          if (game.isVsBot) {
            game.winner = game.player2!.symbol
          } else if (game.player2) {
            const leaverSymbol = game.player1.userId === userId ? game.player1.symbol : game.player2.symbol
            game.winner = leaverSymbol === game.player1.symbol ? game.player2!.symbol : game.player1.symbol
          }
          game.status = 'finished'
          io!.to(`game:${game.id}`).emit('game_state', {
            gameId: game.id,
            board: game.board,
            currentTurn: game.currentTurn,
            status: game.status,
            winner: game.winner,
            winningLine: null,
            forfeit: true,
          })
          finishGame(game)
        }
      }

      onlinePlayers.delete(userId)
      broadcastOnlineCount(ioServer)
    })
  })

  // Periodic queue count broadcast
  setInterval(() => broadcastQueueCount(ioServer), 5_000)
}
