'use client'

import { io as ioClient, Socket } from 'socket.io-client'
import { getCookie } from './cookies'

let socket: Socket | null = null

export function getSocket(): Socket | null {
  if (typeof window === 'undefined') return null
  if (socket) return socket

  const token = getCookie('ttt_token')
  if (!token) return null

  const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  const socketUrl = isLocalDev
    ? `http://${window.location.hostname}:3001`
    : window.location.origin

  socket = ioClient(socketUrl, {
    auth: { token },
    // Polling only - Railway's proxy has issues with websocket upgrades
    transports: ['polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    upgrade: false,
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

  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
