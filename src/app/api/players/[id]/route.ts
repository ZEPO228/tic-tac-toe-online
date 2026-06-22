import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

// CUID pattern: starts with 'c' followed by 23 base36 chars (lowercase).
// Rejecting malformed IDs early avoids hitting the DB with garbage.
const CUID_RE = /^c[a-z0-9]{20,30}$/i

// GET /api/players/[id] — get a specific player's public profile
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getAuthUser()
  if (!currentUser) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
  }

  const { id } = await params

  // Early validation: reject malformed IDs.
  if (!CUID_RE.test(id)) {
    return NextResponse.json({ error: 'Некорректный ID игрока' }, { status: 400 })
  }

  const player = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      username: true,
      avatar: true,
      customAvatar: true,
      gamesPlayed: true,
      gamesWon: true,
      gamesLost: true,
      gamesDraw: true,
      createdAt: true,
    }
  })

  if (!player) {
    return NextResponse.json({ error: 'Игрок не найден' }, { status: 404 })
  }

  const winRate = player.gamesPlayed > 0
    ? Math.round((player.gamesWon / player.gamesPlayed) * 100)
    : 0

  // Note: online status is determined client-side via socket.io
  // The API returns the player data; the client checks against onlineUserIds
  return NextResponse.json({
    player: {
      ...player,
      winRate,
      isCurrentUser: player.id === currentUser.id,
    },
    currentUserId: currentUser.id,
  })
}
