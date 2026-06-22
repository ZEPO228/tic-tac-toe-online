'use client'

import { io as ioClient, Socket } from 'socket.io-client'
import { getCookie } from './cookies'

let socket: Socket | null = null

/**
 * Returns the current socket instance, or creates a new one.
 *
 * Auth token is fetched dynamically via the `auth` callback on every
 * connection — so re-login (which sets a new cookie) works correctly
 * without needing to destroy the socket manually.
 *
 * WebSocket transport is enabled alongside polling — this gives much
 * better latency on Railway. If WS fails for any reason, polling is
 * used as a fallback automatically.
 */
export function getSocket(): Socket | null {
  if (typeof window === 'undefined') return null
  if (socket) return socket

  // NOTE: token is read here only as an early-out check; the actual
  // token sent to the server comes from the `auth` callback below,
  // which is invoked on every connection attempt.
  const token = getCookie('ttt_token')
  if (!token) return null

  const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  // Allow override via env var; fallback to dev port or production origin.
  const socketUrl =
    process.env.NEXT_PUBLIC_SOCKET_URL ||
    (isLocalDev ? `http://${window.location.hostname}:3001` : window.location.origin)

  socket = ioClient(socketUrl, {
    // Send token dynamically so re-login uses the new token.
    auth: (cb) => cb({ token: getCookie('ttt_token') }),
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
}

/**
 * Force re-create the socket on next `getSocket()` call.
 * Useful when the user logs in as a different user — the new
 * socket will pick up the new cookie via the `auth` callback.
 */
export function resetSocket() {
  disconnectSocket()
}
