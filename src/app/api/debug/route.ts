import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const users = await db.user.count()
    const games = await db.game.count()
    return NextResponse.json({
      users,
      games,
      timestamp: new Date().toISOString(),
      hasDb: !!process.env.DATABASE_URL,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
