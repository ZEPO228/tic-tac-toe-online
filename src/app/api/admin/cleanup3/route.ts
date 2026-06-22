import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const ADMIN_SECRET = 'ttt-final-cleanup-v3'

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { secret, prefixes } = body as { secret?: string; prefixes?: string[] }
    if (secret !== ADMIN_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!Array.isArray(prefixes)) {
      return NextResponse.json({ error: 'prefixes (array) required' }, { status: 400 })
    }

    const targets = await db.user.findMany({
      where: {
        OR: prefixes.map(prefix => ({ username: { startsWith: prefix } }))
      },
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
    })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'error' }, { status: 500 })
  }
}
