import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const totalUsers = await db.user.count()
  const totalGames = await db.game.count()
  const activeGames = await db.game.count({ where: { status: 'active' } })

  return NextResponse.json({
    totalUsers,
    totalGames,
    activeGames,
  })
}
