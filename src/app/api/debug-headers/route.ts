import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const headers: Record<string, string> = {}
  req.headers.forEach((value, key) => {
    if (key.toLowerCase().includes('ip') || key.toLowerCase().includes('forward') || key.toLowerCase().includes('agent')) {
      headers[key] = value.slice(0, 100)
    }
  })
  return NextResponse.json(headers)
}
