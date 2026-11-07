import type { SessionUser } from '../../shared/types/auth.ts'
import { deleteSession, findSessionUser, insertSession } from '../db/sessions.ts'

const cookieName = 'mews_session'
const sessionSeconds = 60 * 60 * 12

export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function requestToken(request: Request): string | null {
  const cookie = request.headers.get('Cookie') ?? ''
  const token = cookie.split(';').map((part) => part.trim())
    .find((part) => part.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1)
  return token && /^[a-f0-9]{64}$/.test(token) ? token : null
}

function sessionCookie(request: Request, token: string, maxAge: number): string {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : ''
  return `${cookieName}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`
}

export async function getSessionUser(request: Request, db: D1Database): Promise<SessionUser | null> {
  const token = requestToken(request)
  if (!token) return null
  // Read the current account so approval and role changes take effect immediately.
  return findSessionUser(db, await hashToken(token), Math.floor(Date.now() / 1000))
}

export async function createSession(request: Request, db: D1Database, userId: string): Promise<string> {
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) => byte.toString(16).padStart(2, '0')).join('')
  const now = Math.floor(Date.now() / 1000)
  const previousToken = requestToken(request)
  await insertSession(db, {
    tokenHash: await hashToken(token), userId, now, expiresAt: now + sessionSeconds,
    previousTokenHash: previousToken ? await hashToken(previousToken) : null,
  })
  return sessionCookie(request, token, sessionSeconds)
}

export async function endSession(request: Request, db: D1Database): Promise<string> {
  const token = requestToken(request)
  if (token) await deleteSession(db, await hashToken(token))
  return sessionCookie(request, '', 0)
}
