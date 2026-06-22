import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, setAuthCookie } from '@/lib/auth'
import { AVATARS } from '@/lib/avatars'
import { rateLimit, getRateLimitKey } from '@/lib/rate-limit'

// Rate limit: 5 registrations per IP+UA per 10 minutes (anti-brute-force + anti-spam).
// Anyone legitimately using the app will not hit this limit.
const RL_WINDOW = 10 * 60 * 1000
const RL_MAX = 5

export async function POST(req: NextRequest) {
  // Rate limit (per IP + User-Agent fingerprint — better than IP alone on Railway).
  const rlKey = getRateLimitKey(req)
  const rl = rateLimit(`register:${rlKey}`, { windowMs: RL_WINDOW, max: RL_MAX })
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Слишком много попыток регистрации. Попробуй позже.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    )
  }

  try {
    const body = await req.json()
    const { username, password, avatar } = body as { username?: string; password?: string; avatar?: string }

    if (!username || !password) {
      return NextResponse.json({ error: 'Имя пользователя и пароль обязательны' }, { status: 400 })
    }
    if (username.length < 3 || username.length > 20) {
      return NextResponse.json({ error: 'Имя пользователя должно быть от 3 до 20 символов' }, { status: 400 })
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      return NextResponse.json({ error: 'Только латинские буквы, цифры, _ и -' }, { status: 400 })
    }
    // Enforce a stronger password: min 6 chars (was 4).
    if (password.length < 6) {
      return NextResponse.json({ error: 'Пароль минимум 6 символов' }, { status: 400 })
    }
    if (password.length > 200) {
      return NextResponse.json({ error: 'Пароль слишком длинный' }, { status: 400 })
    }
    // Validate avatar: must be a preset (avatar-1..24) or 'custom' (uploaded separately)
    if (avatar && avatar !== 'custom' && !AVATARS.some(a => a.id === avatar)) {
      return NextResponse.json({ error: 'Неверная аватарка' }, { status: 400 })
    }

    const existing = await db.user.findUnique({ where: { username } })
    if (existing) {
      return NextResponse.json({ error: 'Это имя уже занято' }, { status: 409 })
    }

    const hashed = await hashPassword(password)
    const user = await db.user.create({
      data: {
        username,
        password: hashed,
        avatar: avatar || 'avatar-1',
      },
    })

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
    console.error('Register error:', e)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}
