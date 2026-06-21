import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

export async function GET() {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
  }

  const fullUser = await db.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      username: true,
      avatar: true,
      gamesPlayed: true,
      gamesWon: true,
      gamesLost: true,
      gamesDraw: true,
      createdAt: true,
    }
  })

  if (!fullUser) {
    return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })
  }

  const winRate = fullUser.gamesPlayed > 0
    ? Math.round((fullUser.gamesWon / fullUser.gamesPlayed) * 100)
    : 0

  return NextResponse.json({
    user: {
      ...fullUser,
      winRate,
    }
  })
}

export async function PATCH(req: Request) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const body = await req.json()
    const { avatar } = body as { avatar?: string }

    if (avatar) {
      const updated = await db.user.update({
        where: { id: user.id },
        data: { avatar },
        select: { id: true, username: true, avatar: true, gamesPlayed: true, gamesWon: true, gamesLost: true, gamesDraw: true }
      })
      return NextResponse.json({ user: updated })
    }

    return NextResponse.json({ error: 'Нечего обновлять' }, { status: 400 })
  } catch (e) {
    console.error('Profile PATCH error:', e)
    return NextResponse.json({ error: 'Внутренняя ошибка' }, { status: 500 })
  }
}
