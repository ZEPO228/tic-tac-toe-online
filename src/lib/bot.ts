// Tic-tac-toe bot AI — minimax with depth weighting for unbeatable difficulty on hard,
// and a "medium" mode that occasionally makes mistakes for more fun.

export type Cell = 'X' | 'O' | ''
export type Board = Cell[]

export const WIN_LINES: number[][] = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
  [0, 4, 8], [2, 4, 6],            // diagonals
]

export function checkWinner(board: Board): { winner: Cell; line: number[] | null } {
  for (const line of WIN_LINES) {
    const [a, b, c] = line
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line }
    }
  }
  return { winner: '', line: null }
}

export function isBoardFull(board: Board): boolean {
  return board.every(c => c !== '')
}

export function getValidMoves(board: Board): number[] {
  return board.reduce<number[]>((acc, c, i) => (c === '' ? [...acc, i] : acc), [])
}

// Minimax for unbeatable play
function minimax(board: Board, depth: number, isMaximizing: boolean, botSymbol: Cell, playerSymbol: Cell): number {
  const { winner } = checkWinner(board)
  if (winner === botSymbol) return 10 - depth
  if (winner === playerSymbol) return depth - 10
  if (isBoardFull(board)) return 0

  const moves = getValidMoves(board)
  if (isMaximizing) {
    let best = -Infinity
    for (const m of moves) {
      board[m] = botSymbol
      best = Math.max(best, minimax(board, depth + 1, false, botSymbol, playerSymbol))
      board[m] = ''
    }
    return best
  } else {
    let best = Infinity
    for (const m of moves) {
      board[m] = playerSymbol
      best = Math.min(best, minimax(board, depth + 1, true, botSymbol, playerSymbol))
      board[m] = ''
    }
    return best
  }
}

export function getBestMove(board: Board, botSymbol: Cell, difficulty: 'easy' | 'medium' | 'hard' = 'hard'): number {
  const playerSymbol: Cell = botSymbol === 'X' ? 'O' : 'X'
  const moves = getValidMoves(board)
  if (moves.length === 0) return -1

  // Easy: 70% random, 30% best
  // Medium: 30% random, 70% best
  // Hard: always best (unbeatable)
  const randomChance = difficulty === 'easy' ? 0.7 : difficulty === 'medium' ? 0.3 : 0
  if (Math.random() < randomChance) {
    return moves[Math.floor(Math.random() * moves.length)]
  }

  let bestScore = -Infinity
  let bestMove = moves[0]
  for (const m of moves) {
    board[m] = botSymbol
    const score = minimax(board, 0, false, botSymbol, playerSymbol)
    board[m] = ''
    if (score > bestScore) {
      bestScore = score
      bestMove = m
    }
  }
  return bestMove
}
