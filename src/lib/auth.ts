import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import { db } from './db'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me-in-production'
const COOKIE_NAME = 'ttt_token'
const TOKEN_EXPIRY = '30d'
// Short-lived token for Socket.io auth (5 minutes).
// Even if leaked, becomes useless quickly.
const SOCKET_TOKEN_EXPIRY = '5m'

export interface AuthPayload {
  userId: string
  username: string
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

/** Sign the main 30-day JWT (stored in httpOnly cookie) */
export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY } as jwt.SignOptions)
}

/** Sign a short-lived token (5 min) for Socket.io authentication */
export function signSocketToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: SOCKET_TOKEN_EXPIRY } as jwt.SignOptions)
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthPayload
  } catch {
    return null
  }
}

export async function setAuthCookie(payload: AuthPayload): Promise<void> {
  const token = signToken(payload)
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, token, {
    // httpOnly: true — JavaScript cannot read this cookie.
    // This is the critical XSS protection: even if an attacker injects
    // a script on the page, they cannot steal the token.
    // Socket.io gets its token via /api/auth/socket-token (server-side reads
    // the httpOnly cookie and returns a short-lived token).
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    path: '/',
  })
}

export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}

export async function getAuthUser(): Promise<{ id: string; username: string; avatar: string; customAvatar: string | null; gamesPlayed: number; gamesWon: number; gamesLost: number; gamesDraw: number } | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(COOKIE_NAME)?.value
    if (!token) return null
    const payload = verifyToken(token)
    if (!payload) return null
    const user = await db.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, username: true, avatar: true, customAvatar: true, gamesPlayed: true, gamesWon: true, gamesLost: true, gamesDraw: true }
    })
    return user
  } catch {
    return null
  }
}

// NOTE: JWT_SECRET is intentionally NOT exported — only verifyToken/signToken
// use it inside this module. Exporting it would let any code in the project
// (including client-bundled code if imported accidentally) read the secret.
export { COOKIE_NAME }
