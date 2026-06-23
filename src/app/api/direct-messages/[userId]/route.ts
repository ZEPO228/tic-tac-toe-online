import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { withAdminFlag } from '@/lib/admin'

// GET /api/direct-messages/[userId] — get conversation with a specific user
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
  }

  const { userId: otherUserId } = await params

  // Verify the other user exists
  const otherUser = await db.user.findUnique({
    where: { id: otherUserId },
    select: { id: true, username: true, avatar: true, customAvatar: true, role: true }
  })
  if (!otherUser) {
    return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })
  }

  // Get the LATEST 200 messages (desc) then reverse to chronological (asc).
  // Previous code did `asc + take: 200`, which returned the OLDEST 200 —
  // users never saw their recent messages in long conversations.
  const messages = await db.directMessage.findMany({
    where: {
      OR: [
        { senderId: user.id, recipientId: otherUserId },
        { senderId: otherUserId, recipientId: user.id },
      ]
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  // Reverse so oldest is first, newest last (chronological display order)
  messages.reverse()

  // Mark received messages as read
  await db.directMessage.updateMany({
    where: { senderId: otherUserId, recipientId: user.id, read: false },
    data: { read: true },
  })

  return NextResponse.json({
    otherUser: withAdminFlag(otherUser),
    messages: messages.map(m => ({
      id: m.id,
      senderId: m.senderId,
      recipientId: m.recipientId,
      text: m.text,
      read: m.read,
      createdAt: m.createdAt.toISOString(),
    })),
  })
}
