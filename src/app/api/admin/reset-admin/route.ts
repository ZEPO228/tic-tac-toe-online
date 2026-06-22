import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { isAdminUsername } from '@/lib/admin'

const ADMIN_SECRET = 'ttt-admin-reset-2026'

/**
 * Temporary endpoint to set DDR_ZIK's password AND role='admin'.
 * Secured by a one-shot secret. Will be removed after use.
 *
 * This is needed because:
 *   1. We don't know DDR_ZIK's current password (user registered themselves)
 *   2. We need to set role='admin' in the DB (the migration added the column
 *      with default 'user' for all existing rows)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { secret, username, newPassword } = body as {
      secret?: string
      username?: string
      newPassword?: string
    }
    if (secret !== ADMIN_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!username || !newPassword) {
      return NextResponse.json({ error: 'username and newPassword required' }, { status: 400 })
    }
    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 chars' }, { status: 400 })
    }
    // Safety: only allow resetting admin usernames (prevent abuse)
    if (!isAdminUsername(username)) {
      return NextResponse.json({ error: 'Can only reset admin usernames via this endpoint' }, { status: 403 })
    }

    const user = await db.user.findUnique({ where: { username } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const hashed = await hashPassword(newPassword)
    await db.user.update({
      where: { id: user.id },
      data: {
        password: hashed,
        role: 'admin', // ensure role is set
      },
    })

    return NextResponse.json({
      ok: true,
      username,
      role: 'admin',
      message: 'Password updated, role set to admin',
    })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'error' }, { status: 500 })
  }
}
