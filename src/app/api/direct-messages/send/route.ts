import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

// Rate limit: 30 DMs per minute per user (anti-spam).
const RL_WINDOW = 60_000
const RL_MAX = 30

// POST /api/direct-messages/send — send a direct message
export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
  }

  // Rate limit per user (more accurate than per-IP for authenticated users)
  const rl = rateLimit(`dm-send:${user.id}`, { windowMs: RL_WINDOW, max: RL_MAX })
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Слишком много сообщений. Подожди минуту.' },
      { status: 429 }
    )
  }

  const body = await req.json()
  const { recipientId, text } = body as { recipientId?: string; text?: string }

  if (!recipientId || !text) {
    return NextResponse.json({ error: 'Необходимы recipientId и text' }, { status: 400 })
  }

  const trimmed = text.trim().slice(0, 1000)
  if (!trimmed) {
    return NextResponse.json({ error: 'Сообщение не может быть пустым' }, { status: 400 })
  }

  if (recipientId === user.id) {
    return NextResponse.json({ error: 'Нельзя отправить сообщение самому себе' }, { status: 400 })
  }

  // Verify recipient exists
  const recipient = await db.user.findUnique({
    where: { id: recipientId },
    select: { id: true, username: true }
  })
  if (!recipient) {
    return NextResponse.json({ error: 'Получатель не найден' }, { status: 404 })
  }

  const message = await db.directMessage.create({
    data: {
      senderId: user.id,
      recipientId,
      text: trimmed,
    }
  })

  return NextResponse.json({
    message: {
      id: message.id,
      senderId: message.senderId,
      recipientId: message.recipientId,
      text: message.text,
      read: message.read,
      createdAt: message.createdAt.toISOString(),
    }
  })
}
