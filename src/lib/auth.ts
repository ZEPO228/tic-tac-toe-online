import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import { db } from './db'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me-in-production'
const COOKIE_NAME = 'ttt_token'
const TOKEN_EXPIRY = '30d'

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

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY } as jwt.SignOptions)
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
    httpOnly: false, // needs to be accessible by client-side socket.io
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

export { COOKIE_NAME, JWT_SECRET }
