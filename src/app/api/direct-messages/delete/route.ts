import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

// POST /api/direct-messages/delete — delete all messages between current user and another user
// Body: { "otherUserId": "..." }
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const body = await req.json()
    const { otherUserId } = body as { otherUserId?: string }

    if (!otherUserId) {
      return NextResponse.json({ error: 'Не указан otherUserId' }, { status: 400 })
    }

    // Delete all messages between these two users (both directions)
    const result = await db.directMessage.deleteMany({
      where: {
        OR: [
          { senderId: user.id, recipientId: otherUserId },
          { senderId: otherUserId, recipientId: user.id },
        ]
      }
    })

    return NextResponse.json({ deleted: result.count })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Внутренняя ошибка'
    console.error('Delete chat error:', e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
