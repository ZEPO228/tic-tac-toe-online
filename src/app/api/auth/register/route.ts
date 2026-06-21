import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, setAuthCookie } from '@/lib/auth'
import { AVATARS } from '@/lib/avatars'

export async function POST(req: NextRequest) {
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
    if (password.length < 4) {
      return NextResponse.json({ error: 'Пароль минимум 4 символа' }, { status: 400 })
    }
    if (avatar && !AVATARS.some(a => a.id === avatar)) {
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
