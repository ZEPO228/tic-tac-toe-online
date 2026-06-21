'use client'

import { io as ioClient, Socket } from 'socket.io-client'
import { getCookie } from './cookies'

let socket: Socket | null = null

export function getSocket(): Socket | null {
  if (typeof window === 'undefined') return null
  if (socket) return socket

  const token = getCookie('ttt_token')
  if (!token) return null

  // Production (Railway): same-origin connection via custom server (server.ts)
  // Local dev: connect directly to mini-service on port 3001
  const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  const socketUrl = isLocalDev
    ? `http://${window.location.hostname}:3001`
    : window.location.origin

  socket = ioClient(socketUrl, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  })

  socket.on('connect_error', (err) => {
    console.warn('[socket] connect_error:', err.message)
  })

  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
