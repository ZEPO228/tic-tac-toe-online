import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Force dynamic rendering — never pre-render this at build time.
// Without this, Next.js tries to execute the count() queries during the
// Docker build, which fails because DATABASE_URL is not available at build time.
export const dynamic = 'force-dynamic'

// In-memory cache to debounce DB hits — even multiple concurrent menu loads
// within the same instance only trigger the count() queries once per TTL.
let cache: { at: number; data: { totalUsers: number; totalGames: number; activeGames: number } } | null = null
const CACHE_TTL = 30_000 // 30 seconds

export async function GET() {
  const now = Date.now()
  if (cache && now - cache.at < CACHE_TTL) {
    return NextResponse.json(cache.data)
  }

  const [totalUsers, totalGames, activeGames] = await Promise.all([
    db.user.count(),
    db.game.count(),
    db.game.count({ where: { status: 'active' } }),
  ])

  const data = { totalUsers, totalGames, activeGames }
  cache = { at: now, data }

  return NextResponse.json(data)
}
