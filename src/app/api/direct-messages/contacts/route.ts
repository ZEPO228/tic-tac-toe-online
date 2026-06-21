import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

// GET /api/direct-messages/contacts — list of users the current user has chatted with
export async function GET() {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
  }

  // Find all unique users that the current user has exchanged messages with
  const sentMessages = await db.directMessage.findMany({
    where: { senderId: user.id },
    select: { recipientId: true, text: true, createdAt: true, read: true },
    orderBy: { createdAt: 'desc' },
  })

  const receivedMessages = await db.directMessage.findMany({
    where: { recipientId: user.id },
    select: { senderId: true, text: true, createdAt: true, read: true },
    orderBy: { createdAt: 'desc' },
  })

  // Build a map of contactId -> { lastMessage, lastMessageAt, unreadCount }
  const contactsMap = new Map<string, { lastMessage: string; lastMessageAt: Date; unreadCount: number }>()

  for (const msg of sentMessages) {
    const existing = contactsMap.get(msg.recipientId)
    if (!existing || new Date(msg.createdAt) > existing.lastMessageAt) {
      contactsMap.set(msg.recipientId, {
        lastMessage: msg.text,
        lastMessageAt: new Date(msg.createdAt),
        unreadCount: existing?.unreadCount || 0,
      })
    }
  }

  for (const msg of receivedMessages) {
    const existing = contactsMap.get(msg.senderId)
    if (!existing || new Date(msg.createdAt) > existing.lastMessageAt) {
      contactsMap.set(msg.senderId, {
        lastMessage: msg.text,
        lastMessageAt: new Date(msg.createdAt),
        unreadCount: existing?.unreadCount || 0,
      })
    }
    if (!msg.read) {
      const c = contactsMap.get(msg.senderId)!
      c.unreadCount = (existing?.unreadCount || 0) + 1
    }
  }

  // Recalculate unread counts properly (query unread messages from each sender)
  const contactIds = Array.from(contactsMap.keys())
  const contacts = []

  for (const contactId of contactIds) {
    const contactUser = await db.user.findUnique({
      where: { id: contactId },
      select: { id: true, username: true, avatar: true, customAvatar: true }
    })
    if (!contactUser) continue

    const unreadCount = await db.directMessage.count({
      where: { senderId: contactId, recipientId: user.id, read: false }
    })

    const info = contactsMap.get(contactId)!
    contacts.push({
      userId: contactUser.id,
      username: contactUser.username,
      avatar: contactUser.avatar,
      customAvatar: contactUser.customAvatar,
      lastMessage: info.lastMessage,
      lastMessageAt: info.lastMessageAt.toISOString(),
      unreadCount,
    })
  }

  // Sort by last message time (most recent first)
  contacts.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())

  return NextResponse.json({ contacts })
}
