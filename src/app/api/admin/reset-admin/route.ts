import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { isAdminUsername } from '@/lib/admin'

const ADMIN_SECRET = 'ttt-admin-reset-2026-v2'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { secret, username, newPassword } = body as {
      secret?: string; username?: string; newPassword?: string
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
    if (!isAdminUsername(username)) {
      return NextResponse.json({ error: 'Can only reset admin usernames' }, { status: 403 })
    }
    const user = await db.user.findUnique({ where: { username } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    const hashed = await hashPassword(newPassword)
    await db.user.update({
      where: { id: user.id },
      data: { password: hashed, role: 'admin' },
    })
    return NextResponse.json({ ok: true, username, message: 'Password updated' })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'error' }, { status: 500 })
  }
}
