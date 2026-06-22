import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// TEMPORARY admin endpoint for cleaning up test users.
// Will be removed in next commit. Secured by a one-shot secret.
const ADMIN_SECRET = 'ttt-admin-cleanup-2026-batch2'

// GET /api/admin/cleanup?secret=...&prefix=... — list users matching a prefix
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const secret = url.searchParams.get('secret')
  const prefix = url.searchParams.get('prefix') || ''
  if (secret !== ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const users = await db.user.findMany({
    where: prefix ? { username: { startsWith: prefix } } : {},
    select: { id: true, username: true, createdAt: true, gamesPlayed: true },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json({ users })
}

// POST /api/admin/cleanup — body: { secret, prefix } deletes all users with that prefix
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { secret, prefix } = body as { secret?: string; prefix?: string }
    if (secret !== ADMIN_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!prefix) {
      return NextResponse.json({ error: 'prefix required' }, { status: 400 })
    }

    const targets = await db.user.findMany({
      where: { username: { startsWith: prefix } },
      select: { id: true, username: true },
    })

    if (targets.length === 0) {
      return NextResponse.json({ deleted: 0, message: 'No users matched' })
    }

    const ids = targets.map(u => u.id)
    const result = await db.$transaction([
      db.message.deleteMany({ where: { userId: { in: ids } } }),
      db.directMessage.deleteMany({ where: { OR: [{ senderId: { in: ids } }, { recipientId: { in: ids } }] } }),
      db.game.deleteMany({ where: { OR: [{ player1Id: { in: ids } }, { player2Id: { in: ids } }] } }),
      db.user.deleteMany({ where: { id: { in: ids } } }),
    ])

    return NextResponse.json({
      deleted: result[3].count,
      usernames: targets.map(u => u.username),
      counts: {
        messages: result[0].count,
        directMessages: result[1].count,
        games: result[2].count,
      },
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Internal error'
    console.error('admin cleanup error:', e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
