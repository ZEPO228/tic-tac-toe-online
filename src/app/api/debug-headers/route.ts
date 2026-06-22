import { NextRequest, NextResponse } from 'next/server'
import { getClientIp } from '@/lib/rate-limit'

// Temporary: shows what IP the server sees for rate-limit purposes.
// Will be removed after verification.
export async function GET(req: NextRequest) {
  const headers: Record<string, string> = {}
  req.headers.forEach((value, key) => {
    if (key.toLowerCase().includes('ip') || key.toLowerCase().includes('forward') || key.toLowerCase().includes('agent')) {
      headers[key] = value.slice(0, 150)
    }
  })
  return NextResponse.json({
    headers,
    resolvedClientIp: getClientIp(req),
  })
}
