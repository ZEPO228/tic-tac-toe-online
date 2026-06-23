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
 * On Railway, the load balancer adds itself to x-forwarded-for. The header
 * looks like: "x-forwarded-for: <edge-ip>, <real-client-ip>". The FIRST
 * entry is the Railway edge node (which rotates between requests), and the
 * LAST entry is the real client IP. We want the real client IP for rate
 * limiting.
 *
 * Header priority:
 *   1. x-forwarded-for (split, take LAST entry = real client IP)
 *   2. x-real-ip (Railway sets this to the edge IP — least useful)
 *   3. cf-connecting-ip (Cloudflare, if used)
 *   4. 'unknown' (last resort)
 *
 * NOTE: On Railway with multiple replicas, in-memory rate limiting is per-instance.
 * For true cross-instance rate limiting, use Upstash Ratelimit (Redis-based).
 */
export function getClientIp(req: Request): string {
  const headers = new Headers(req.headers)
  const xff = headers.get('x-forwarded-for')
  if (xff) {
    const parts = xff.split(',').map(s => s.trim()).filter(Boolean)
    // The LAST IP in x-forwarded-for is the original client IP.
    // The first IPs are intermediary proxies (Railway edge, etc.).
    if (parts.length > 0) {
      return parts[parts.length - 1]
    }
  }
  return (
    headers.get('cf-connecting-ip') ||
    headers.get('x-real-ip') || // Less reliable on Railway (edge IP, rotates)
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
