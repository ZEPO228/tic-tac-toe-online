import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// TEMPORARY admin endpoint for cleaning up users.
// Secured by a hardcoded admin secret that will be removed after use.
const ADMIN_SECRET = 'ttt-admin-cleanup-2026-temp'

// GET /api/admin/delete-user?secret=... — list users (for verification)
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const secret = url.searchParams.get('secret')
  if (secret !== ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const users = await db.user.findMany({
    select: { id: true, username: true, createdAt: true, gamesPlayed: true },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json({ users })
}

// POST /api/admin/delete-user — body: { secret, username }
// Deletes a user and all related data (messages, direct messages, games) in a transaction.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { secret, username } = body as { secret?: string; username?: string }
    if (secret !== ADMIN_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!username) {
      return NextResponse.json({ error: 'username required' }, { status: 400 })
    }

    const user = await db.user.findUnique({ where: { username } })
    if (!user) {
      return NextResponse.json({ error: 'User not found', username }, { status: 404 })
    }

    // Cascade delete in a transaction
    const result = await db.$transaction([
      db.message.deleteMany({ where: { userId: user.id } }),
      db.directMessage.deleteMany({ where: { OR: [{ senderId: user.id }, { recipientId: user.id }] } }),
      db.game.deleteMany({ where: { OR: [{ player1Id: user.id }, { player2Id: user.id }] } }),
      db.user.delete({ where: { id: user.id } }),
    ])

    return NextResponse.json({
      deleted: true,
      username,
      userId: user.id,
      counts: {
        messages: result[0].count,
        directMessages: result[1].count,
        games: result[2].count,
      },
    })
  } catch (e: any) {
    console.error('admin delete-user error:', e)
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 })
  }
}
