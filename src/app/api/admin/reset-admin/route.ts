import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, verifyPassword } from '@/lib/auth'
import { isAdminUsername } from '@/lib/admin'

const ADMIN_SECRET = 'ttt-admin-reset-2026'

/**
 * Diagnostic + reset endpoint. Tests bcrypt flow on the server.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { secret, username, newPassword, action } = body as {
      secret?: string
      username?: string
      newPassword?: string
      action?: 'reset' | 'diagnose'
    }
    if (secret !== ADMIN_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!username) {
      return NextResponse.json({ error: 'username required' }, { status: 400 })
    }
    if (!isAdminUsername(username)) {
      return NextResponse.json({ error: 'Can only reset admin usernames via this endpoint' }, { status: 403 })
    }

    if (action === 'diagnose') {
      const user = await db.user.findUnique({ where: { username } })
      if (!user) return NextResponse.json({ error: 'not found' }, { status: 404 })
      // Test bcrypt locally
      const testHash = await hashPassword('test123')
      const t1 = Date.now()
      const verifyOk = await verifyPassword('test123', testHash)
      const t2 = Date.now()
      const verifyUserHash = await verifyPassword('test123', user.password)
      const t3 = Date.now()
      return NextResponse.json({
        username,
        role: user.role,
        storedHashPrefix: user.password.slice(0, 30),
        storedHashLength: user.password.length,
        testHashPrefix: testHash.slice(0, 30),
        testHashTimeMs: t2 - t1,
        verifyTestHashOk: verifyOk,
        verifyUserHashWithTest123Ok: verifyUserHash,
        verifyUserHashTimeMs: t3 - t2,
      })
    }

    // action === 'reset' (default)
    if (!newPassword) {
      return NextResponse.json({ error: 'newPassword required' }, { status: 400 })
    }
    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 chars' }, { status: 400 })
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
        role: 'admin',
      },
    })

    // Verify the hash we just saved
    const refreshed = await db.user.findUnique({ where: { id: user.id }, select: { password: true } })
    const verifyAfterSave = await verifyPassword(newPassword, refreshed?.password || '')

    return NextResponse.json({
      ok: true,
      username,
      role: 'admin',
      hashedPrefix: hashed.slice(0, 30),
      savedHashPrefix: refreshed?.password.slice(0, 30),
      verifyAfterSave,
    })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'error' }, { status: 500 })
  }
}
