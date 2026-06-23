import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, verifyPassword, hashPassword, clearAuthCookie } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'

// Rate limit: 5 password changes per hour per user (prevents abuse).
const RL_WINDOW = 60 * 60 * 1000
const RL_MAX = 5

/**
 * POST /api/auth/change-password
 *
 * Changes the current user's password. Requires:
 *   - currentPassword: the existing password (verified against DB hash)
 *   - newPassword: the new password (min 6 chars)
 *
 * After successful change, the auth cookie is cleared so the client must
 * re-login with the new password. This is by design — it invalidates any
 * stolen tokens and forces the user to verify they know the new password.
 *
 * Body: { currentPassword: string, newPassword: string }
 * Returns: { ok: true } on success (cookie is cleared)
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    // Rate limit per user (this is an authenticated endpoint).
    const rl = rateLimit(`change-password:${user.id}`, { windowMs: RL_WINDOW, max: RL_MAX })
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Слишком много попыток. Попробуй позже.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
      )
    }

    const body = await req.json()
    const { currentPassword, newPassword } = body as { currentPassword?: string; newPassword?: string }

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Текущий и новый пароль обязательны' }, { status: 400 })
    }
    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Новый пароль минимум 6 символов' }, { status: 400 })
    }
    if (newPassword.length > 200) {
      return NextResponse.json({ error: 'Новый пароль слишком длинный' }, { status: 400 })
    }
    if (currentPassword === newPassword) {
      return NextResponse.json({ error: 'Новый пароль должен отличаться от текущего' }, { status: 400 })
    }

    // Fetch the stored password hash
    const dbUser = await db.user.findUnique({
      where: { id: user.id },
      select: { password: true },
    })
    if (!dbUser) {
      // User was deleted mid-session — clear the cookie and 401
      await clearAuthCookie()
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 401 })
    }

    // Verify the current password
    const valid = await verifyPassword(currentPassword, dbUser.password)
    if (!valid) {
      return NextResponse.json({ error: 'Неверный текущий пароль' }, { status: 401 })
    }

    // Hash the new password and save
    const newHash = await hashPassword(newPassword)
    await db.user.update({
      where: { id: user.id },
      data: { password: newHash },
    })

    // Clear the auth cookie — forces re-login with the new password.
    // This also invalidates any leaked tokens (the 30-day JWT in the old cookie
    // is now useless since the user must re-authenticate).
    await clearAuthCookie()

    return NextResponse.json({ ok: true, message: 'Пароль изменён. Войдите заново.' })
  } catch (e) {
    console.error('Change password error:', e)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}
