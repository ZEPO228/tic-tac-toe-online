import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { withAdminFlag } from '@/lib/admin'

export async function GET() {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ user: null }, { status: 200 })
  }
  return NextResponse.json({
    user: withAdminFlag(user)
  })
}
