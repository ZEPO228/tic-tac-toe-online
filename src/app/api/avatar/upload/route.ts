import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

// Force dynamic rendering — this is an API route that handles POST requests
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// POST /api/avatar/upload — upload a custom avatar (base64 data URI)
// Body: { "image": "data:image/jpeg;base64,..." }
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const body = await req.json()
    const { image } = body as { image?: string }

    if (!image) {
      return NextResponse.json({ error: 'Изображение не предоставлено' }, { status: 400 })
    }

    // Validate it's a data URI with image type
    if (!image.startsWith('data:image/')) {
      return NextResponse.json({ error: 'Неверный формат изображения' }, { status: 400 })
    }

    // Check size — max 2MB base64 string (≈1.5MB actual image)
    if (image.length > 2_000_000) {
      return NextResponse.json({ error: 'Изображение слишком большое (макс 1.5MB)' }, { status: 400 })
    }

    // Validate content type is jpeg, png, or webp
    const validTypes = ['data:image/jpeg', 'data:image/png', 'data:image/webp', 'data:image/jpg']
    if (!validTypes.some(t => image.startsWith(t))) {
      return NextResponse.json({ error: 'Поддерживаются только JPEG, PNG, WebP' }, { status: 400 })
    }

    // Update user with custom avatar
    const updated = await db.user.update({
      where: { id: user.id },
      data: {
        avatar: 'custom',
        customAvatar: image,
      },
      select: {
        id: true,
        username: true,
        avatar: true,
        customAvatar: true,
        gamesPlayed: true,
        gamesWon: true,
        gamesLost: true,
        gamesDraw: true,
      }
    })

    return NextResponse.json({ user: updated })
  } catch (e: any) {
    console.error('Avatar upload error:', e)
    return NextResponse.json(
      { error: e?.message || 'Внутренняя ошибка сервера при загрузке аватара' },
      { status: 500 }
    )
  }
}
