import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

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
    select: { id: true, username: true, avatar: true, customAvatar: true }
  })
  if (!otherUser) {
    return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })
  }

  // Get all messages between these two users (last 200)
  const messages = await db.directMessage.findMany({
    where: {
      OR: [
        { senderId: user.id, recipientId: otherUserId },
        { senderId: otherUserId, recipientId: user.id },
      ]
    },
    orderBy: { createdAt: 'asc' },
    take: 200,
  })

  // Mark received messages as read
  await db.directMessage.updateMany({
    where: { senderId: otherUserId, recipientId: user.id, read: false },
    data: { read: true },
  })

  return NextResponse.json({
    otherUser,
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
