// Simple in-memory rate limiter for Next.js API routes.
// Uses a sliding window per IP+key. Resets on server restart.
// For multi-instance production, consider Upstash Ratelimit.

interface RateLimitEntry {
  count: number
  resetAt: number
}

const buckets = new Map<string, RateLimitEntry>()

// Periodic cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of buckets) {
      if (entry.resetAt < now) buckets.delete(key)
    }
  }, 5 * 60 * 1000).unref?.()
}

interface RateLimitOptions {
  /** Window in ms (default: 60s) */
  windowMs?: number
  /** Max requests per window (default: 10) */
  max?: number
}

interface RateLimitResult {
  ok: boolean
  remaining: number
  resetAt: number
}

/**
 * Check rate limit for a given key (typically IP or userId).
 * Returns { ok: true } if request is allowed, { ok: false } if blocked.
 */
export function rateLimit(key: string, opts: RateLimitOptions = {}): RateLimitResult {
  const windowMs = opts.windowMs ?? 60_000
  const max = opts.max ?? 10
  const now = Date.now()
  const resetAt = now + windowMs

  const entry = buckets.get(key)
  if (!entry || entry.resetAt < now) {
    buckets.set(key, { count: 1, resetAt })
    return { ok: true, remaining: max - 1, resetAt }
  }

  entry.count++
  if (entry.count > max) {
    return { ok: false, remaining: 0, resetAt: entry.resetAt }
  }

  return { ok: true, remaining: max - entry.count, resetAt: entry.resetAt }
}

/** Extract client IP from NextRequest headers */
export function getClientIp(req: Request): string {
  const headers = new Headers(req.headers)
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    'unknown'
  )
}
