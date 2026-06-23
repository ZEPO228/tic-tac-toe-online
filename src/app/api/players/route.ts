import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { withAdminFlag } from '@/lib/admin'

export async function GET() {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
  }

  // Top 50 players by gamesWon — for leaderboard
  const top = await db.user.findMany({
    orderBy: [{ gamesWon: 'desc' }, { gamesPlayed: 'desc' }],
    take: 50,
    select: {
      id: true,
      username: true,
      avatar: true,
      customAvatar: true,
      role: true,
      gamesPlayed: true,
      gamesWon: true,
      gamesLost: true,
      gamesDraw: true,
      createdAt: true,
    }
  })

  return NextResponse.json({
    players: top.map(p => withAdminFlag(p)),
    currentUserId: user.id,
  })
}
