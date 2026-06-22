import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword, setAuthCookie } from '@/lib/auth'
import { rateLimit, getRateLimitKey } from '@/lib/rate-limit'

// Rate limit: 10 login attempts per IP+UA per 5 minutes (anti-brute-force).
const RL_WINDOW = 5 * 60 * 1000
const RL_MAX = 10

export async function POST(req: NextRequest) {
  // Rate limit (per IP + User-Agent fingerprint — better than IP alone on Railway).
  const rlKey = getRateLimitKey(req)
  const rl = rateLimit(`login:${rlKey}`, { windowMs: RL_WINDOW, max: RL_MAX })
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Слишком много попыток входа. Попробуй позже.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    )
  }

  try {
    const body = await req.json()
    const { username, password } = body as { username?: string; password?: string }

    if (!username || !password) {
      return NextResponse.json({ error: 'Имя пользователя и пароль обязательны' }, { status: 400 })
    }

    const user = await db.user.findUnique({ where: { username } })
    // Always run verifyPassword even if user not found — this prevents timing
    // attacks that would reveal whether a username exists via response timing.
    const dummyHash = '$2a$10$abcdefghijklmnopqrstuvABCDEFGHIJKLMNOPQRSTUV1234567890abcdefghijklmnopqrstuv'
    const valid = user ? await verifyPassword(password, user.password) : await verifyPassword(password, dummyHash)
    if (!user || !valid) {
      return NextResponse.json({ error: 'Неверное имя пользователя или пароль' }, { status: 401 })
    }

    await setAuthCookie({ userId: user.id, username: user.username })

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        avatar: user.avatar,
        customAvatar: user.customAvatar,
        gamesPlayed: user.gamesPlayed,
        gamesWon: user.gamesWon,
        gamesLost: user.gamesLost,
        gamesDraw: user.gamesDraw,
      }
    })
  } catch (e) {
    console.error('Login error:', e)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}
