import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const ADMIN_SECRET = 'ttt-final-cleanup-v4'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { secret, username } = body as { secret?: string; username?: string }
    if (secret !== ADMIN_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!username) return NextResponse.json({ error: 'username required' }, { status: 400 })
    const user = await db.user.findUnique({ where: { username } })
    if (!user) return NextResponse.json({ error: 'not found' }, { status: 404 })
    await db.$transaction([
      db.message.deleteMany({ where: { userId: user.id } }),
      db.directMessage.deleteMany({ where: { OR: [{ senderId: user.id }, { recipientId: user.id }] } }),
      db.game.deleteMany({ where: { OR: [{ player1Id: user.id }, { player2Id: user.id }] } }),
      db.user.delete({ where: { id: user.id } }),
    ])
    return NextResponse.json({ deleted: true, username })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'error' }, { status: 500 })
  }
}
