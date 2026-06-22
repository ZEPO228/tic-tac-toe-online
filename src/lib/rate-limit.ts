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

/** Extract client IP from NextRequest headers.
 *
 * Railway's load balancer sets `x-forwarded-for` with the real client IP
 * as the first entry. We also check `x-real-ip` as a fallback (some proxies
 * set this instead). The `cf-connecting-ip` header is checked for Cloudflare.
 *
 * NOTE: On Railway with multiple replicas, in-memory rate limiting is per-instance.
 * For true cross-instance rate limiting, use Upstash Ratelimit (Redis-based).
 * The current implementation still helps against abusive single-IP clients
 * and prevents accidental spam from a single user agent.
 */
export function getClientIp(req: Request): string {
  const headers = new Headers(req.headers)
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    headers.get('cf-connecting-ip') ||
    'unknown'
  )
}

/**
 * Get a rate-limit key that combines IP + user ID (if available) + a
 * User-Agent fingerprint. This provides better discrimination than IP alone
 * on Railway, where the load balancer may rotate egress IPs.
 *
 * Use this for authenticated endpoints where you have the user ID.
 */
export function getRateLimitKey(req: Request, userId?: string): string {
  const ip = getClientIp(req)
  const ua = req.headers.get('user-agent')?.slice(0, 100) || 'no-ua'
  // Simple UA hash (not crypto-secure, just for key uniqueness)
  const uaHash = ua.split('').reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0)
  if (userId) {
    return `u:${userId}:${uaHash}`
  }
  return `ip:${ip}:${uaHash}`
}
