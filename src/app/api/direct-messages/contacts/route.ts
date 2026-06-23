import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { withAdminFlag } from '@/lib/admin'

// GET /api/direct-messages/contacts — list of users the current user has chatted with
// Performance: uses groupBy instead of loading all messages + N+1 user lookups.
export async function GET() {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
  }

  // 1) Find every contact this user has exchanged messages with, plus
  //    the timestamp of the latest message in each direction. Using
  //    groupBy avoids loading all messages into memory.
  const [sentAgg, receivedAgg] = await Promise.all([
    db.directMessage.groupBy({
      by: ['recipientId'],
      where: { senderId: user.id },
      _max: { createdAt: true },
    }),
    db.directMessage.groupBy({
      by: ['senderId'],
      where: { recipientId: user.id },
      _max: { createdAt: true },
    }),
  ])

  // Build a map contactId -> lastMessageAt
  const lastMessageAtMap = new Map<string, Date>()
  for (const row of sentAgg) {
    if (row._max.createdAt) {
      const existing = lastMessageAtMap.get(row.recipientId)
      if (!existing || row._max.createdAt > existing) {
        lastMessageAtMap.set(row.recipientId, row._max.createdAt)
      }
    }
  }
  for (const row of receivedAgg) {
    if (row._max.createdAt) {
      const existing = lastMessageAtMap.get(row.senderId)
      if (!existing || row._max.createdAt > existing) {
        lastMessageAtMap.set(row.senderId, row._max.createdAt)
      }
    }
  }

  const contactIds = Array.from(lastMessageAtMap.keys())
  if (contactIds.length === 0) {
    return NextResponse.json({ contacts: [] })
  }

  // 2) Batch-fetch all contact users in a single query (no N+1).
  const contactUsers = await db.user.findMany({
    where: { id: { in: contactIds } },
    select: { id: true, username: true, avatar: true, customAvatar: true, role: true },
  })

  // 3) Batch-fetch the latest message text per contact (single query).
  // We use a raw-ish approach: for each contactId, find the latest message.
  // To stay efficient, do ONE findMany with OR conditions and sort + dedup client-side.
  const latestMessages = await db.directMessage.findMany({
    where: {
      OR: contactIds.flatMap(cid => [
        { senderId: user.id, recipientId: cid },
        { senderId: cid, recipientId: user.id },
      ])
    },
    orderBy: { createdAt: 'desc' },
    // Take a generous upper bound to ensure we get the latest for each contact.
    take: contactIds.length * 2,
    select: { senderId: true, recipientId: true, text: true, createdAt: true },
  })

  const latestTextMap = new Map<string, string>()
  for (const msg of latestMessages) {
    const otherId = msg.senderId === user.id ? msg.recipientId : msg.senderId
    if (!latestTextMap.has(otherId)) {
      latestTextMap.set(otherId, msg.text)
    }
  }

  // 4) Batch-fetch unread counts (single groupBy).
  const unreadAgg = await db.directMessage.groupBy({
    by: ['senderId'],
    where: { recipientId: user.id, read: false },
    _count: true,
  })
  const unreadMap = new Map<string, number>()
  for (const row of unreadAgg) {
    unreadMap.set(row.senderId, row._count)
  }

  // 5) Build the contacts list
  const contacts = contactUsers.map(c => {
    const lastAt = lastMessageAtMap.get(c.id) || new Date(0)
    return withAdminFlag({
      userId: c.id,
      username: c.username,
      avatar: c.avatar,
      customAvatar: c.customAvatar,
      role: c.role,
      lastMessage: latestTextMap.get(c.id) || '',
      lastMessageAt: lastAt.toISOString(),
      unreadCount: unreadMap.get(c.id) || 0,
    })
  })

  // Sort by last message time (most recent first)
  contacts.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())

  return NextResponse.json({ contacts })
}
