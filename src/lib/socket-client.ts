'use client'

import { io as ioClient, Socket } from 'socket.io-client'

let socket: Socket | null = null
let cachedSocketToken: string | null = null
let tokenFetchPromise: Promise<string | null> | null = null

/**
 * Fetch a short-lived token for Socket.io auth.
 *
 * The main auth cookie is httpOnly: true, so JS cannot read it. This function
 * calls /api/auth/socket-token, which (server-side) reads the cookie and
 * returns a fresh 5-minute token.
 *
 * Caching:
 * - The token is cached in-memory for 4 minutes (token expires in 5 min).
 * - Concurrent callers share the same in-flight fetch (no duplicate requests).
 * - On fetch failure, the cache is cleared so the next call retries.
 *
 * @returns A short-lived JWT for Socket.io, or null if not authenticated.
 */
async function getSocketToken(): Promise<string | null> {
  // Return cached token if still valid (4 min buffer on 5 min TTL).
  if (cachedSocketToken) {
    return cachedSocketToken
  }

  // Deduplicate concurrent fetches.
  if (tokenFetchPromise) {
    return tokenFetchPromise
  }

  tokenFetchPromise = (async () => {
    try {
      const res = await fetch('/api/auth/socket-token', { credentials: 'same-origin' })
      if (!res.ok) {
        cachedSocketToken = null
        return null
      }
      const data = await res.json()
      if (!data.token) {
        cachedSocketToken = null
        return null
      }
      cachedSocketToken = data.token
      // Invalidate cache after 4 minutes (token TTL is 5 min — 1 min buffer
      // for in-flight socket connections to complete auth).
      setTimeout(() => {
        cachedSocketToken = null
      }, 4 * 60 * 1000)
      return cachedSocketToken
    } catch (e) {
      console.warn('[socket] Failed to fetch socket token:', e)
      cachedSocketToken = null
      return null
    } finally {
      tokenFetchPromise = null
    }
  })()

  return tokenFetchPromise
}

/**
 * Returns the current socket instance, or creates a new one.
 *
 * Auth flow:
 *   1. getSocket() is called
 *   2. We call /api/auth/socket-token to fetch a fresh 5-min token
 *   3. We pass the token to Socket.io via the `auth` callback
 *   4. On reconnect, the auth callback fires again and fetches a new token
 *
 * WebSocket transport is enabled alongside polling — this gives much
 * better latency on Railway. If WS fails for any reason, polling is
 * used as a fallback automatically.
 */
export function getSocket(): Socket | null {
  if (typeof window === 'undefined') return null
  if (socket) return socket

  const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  // Allow override via env var; fallback to dev port or production origin.
  const socketUrl =
    process.env.NEXT_PUBLIC_SOCKET_URL ||
    (isLocalDev ? `http://${window.location.hostname}:3001` : window.location.origin)

  socket = ioClient(socketUrl, {
    // Send token dynamically via auth callback. The callback is invoked
    // on every connection attempt, so reconnects fetch a fresh token.
    auth: async (cb: (data: { token: string | null }) => void) => {
      const token = await getSocketToken()
      cb({ token })
    },
    // Enable both transports — WS is primary, polling is fallback.
    transports: ['polling', 'websocket'],
    reconnection: true,
    // Cap reconnection attempts so we don't loop forever when the server is down.
    // 30 attempts ≈ 5 minutes of retries.
    reconnectionAttempts: 30,
    reconnectionDelay: 500,
    reconnectionDelayMax: 5000,
    // Allow upgrade from polling → websocket.
    upgrade: true,
    timeout: 20000,
  })

  socket.on('connect_error', (err) => {
    console.warn('[socket] connect_error:', err.message)
  })

  socket.on('connect', () => {
    console.log('[socket] connected:', socket?.id)
  })

  socket.on('disconnect', (reason) => {
    console.warn('[socket] disconnected:', reason)
  })

  socket.on('reconnect', (attempt) => {
    console.log('[socket] reconnected after', attempt, 'attempts')
    // Notify any listeners that we reconnected — page.tsx can re-subscribe
    // if needed. Game rejoin logic is handled in MatchmakingView / GameView.
    socket?.emit('rejoin_request')
  })

  socket.on('reconnect_failed', () => {
    console.error('[socket] reconnection failed after max attempts — server may be unreachable')
  })

  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners()
    socket.disconnect()
    socket = null
  }
  // Clear the cached token on disconnect — forces a fresh fetch on next connect.
  // This is critical for re-login: if the user logs in as a different user,
  // the old cached token must be discarded.
  cachedSocketToken = null
}

/**
 * Force re-create the socket on next `getSocket()` call.
 * Useful when the user logs in as a different user — the new
 * socket will pick up the new cookie via the `auth` callback.
 */
export function resetSocket() {
  disconnectSocket()
}
