import { NextResponse } from 'next/server'
import { getAuthUser, signSocketToken, COOKIE_NAME } from '@/lib/auth'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'

/**
 * GET /api/auth/socket-token
 *
 * Returns a short-lived token specifically for Socket.io authentication.
 *
 * Why this exists:
 * The main auth cookie (ttt_token) is httpOnly: true, so client-side JS
 * cannot read it directly. Socket.io needs the token in its handshake,
 * so we provide this endpoint which:
 *   1. Reads the httpOnly cookie (server-side only)
 *   2. Verifies the user still exists in DB
 *   3. Returns a fresh short-lived token (5 min) for Socket.io auth
 *
 * The short TTL means even if this token leaks (e.g., via devtools network
 * tab, referrer, or log), it becomes useless within 5 minutes — much safer
 * than re-using the 30-day JWT directly.
 *
 * Auth required: yes (valid httpOnly cookie)
 */
export async function GET() {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
  }

  // Double-check user still exists in DB (they may have been deleted)
  const exists = await db.user.findUnique({
    where: { id: user.id },
    select: { id: true },
  })
  if (!exists) {
    // Clear the stale cookie
    const cookieStore = await cookies()
    cookieStore.delete(COOKIE_NAME)
    return NextResponse.json({ error: 'Пользователь не найден' }, { status: 401 })
  }

  // Issue a short-lived token (5 minutes) for socket auth.
  // This is separate from the 30-day main JWT in the httpOnly cookie.
  const socketToken = signSocketToken({ userId: user.id, username: user.username })

  return NextResponse.json({
    token: socketToken,
    expiresIn: 300, // 5 minutes
  })
}

