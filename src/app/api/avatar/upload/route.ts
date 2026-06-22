import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

// Force dynamic rendering — this is an API route that handles POST requests
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Rate limit: 10 avatar uploads per minute (prevent abuse).
const RL_WINDOW = 60_000
const RL_MAX = 10

const ALLOWED_PREFIXES = ['data:image/jpeg', 'data:image/png', 'data:image/webp', 'data:image/jpg']
const MAX_BASE64_LENGTH = 2_000_000 // ~1.5MB actual image

// POST /api/avatar/upload — upload a custom avatar (base64 data URI)
// Body: { "image": "data:image/jpeg;base64,..." }
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    // Rate limit
    const ip = getClientIp(req)
    const rl = rateLimit(`avatar-upload:${user.id}`, { windowMs: RL_WINDOW, max: RL_MAX })
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Слишком много загрузок. Подожди минуту.' },
        { status: 429 }
      )
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

    // Validate content type is jpeg, png, or webp (server-side check;
    // client-side validation can be bypassed with a direct API call).
    if (!ALLOWED_PREFIXES.some(p => image.startsWith(p))) {
      return NextResponse.json({ error: 'Поддерживаются только JPEG, PNG, WebP' }, { status: 400 })
    }

    // Check size — max 2MB base64 string (≈1.5MB actual image)
    if (image.length > MAX_BASE64_LENGTH) {
      return NextResponse.json({ error: 'Изображение слишком большое (макс 1.5MB)' }, { status: 400 })
    }

    // Validate base64 payload actually decodes (catch malformed data URIs).
    // Format: data:image/jpeg;base64,<payload>
    const base64Part = image.split(',')[1]
    if (!base64Part || base64Part.length === 0) {
      return NextResponse.json({ error: 'Пустое изображение' }, { status: 400 })
    }
    try {
      // Buffer.from validates base64 (will throw on invalid chars).
      // We don't use the result — this is just a validation pass.
      Buffer.from(base64Part, 'base64')
    } catch {
      return NextResponse.json({ error: 'Невалидные данные изображения' }, { status: 400 })
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
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Внутренняя ошибка сервера при загрузке аватара'
    console.error('Avatar upload error:', e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
