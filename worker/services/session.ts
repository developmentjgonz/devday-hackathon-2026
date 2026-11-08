import type { SessionUser } from '../../shared/types/auth.ts'
import { deleteSession, findSessionUser, insertSession } from '../db/sessions.ts'
import { demoAccessEnabled } from '../db/demo-access.ts'
import { HTTPException } from 'hono/http-exception'

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
  const session = await findSessionUser(db, await hashToken(token), Math.floor(Date.now() / 1000))
  if (!session) return null
  const url = new URL(request.url)
  const local = url.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)
  if (session.demoIdentity && !local && (url.protocol !== 'https:' || session.googleIdentity || session.user.role !== 'member' || !await demoAccessEnabled(db))) return null
  return session.user
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

export async function createDemoSession(request: Request, db: D1Database, userId: string): Promise<string> {
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) => byte.toString(16).padStart(2, '0')).join('')
  const tokenHash = await hashToken(token)
  const now = Math.floor(Date.now() / 1000)
  // Check the switch and account in the same database statement as the insert.
  const inserted = await db.prepare(`INSERT INTO sessions (token_hash, user_id, expires_at)
    SELECT ?, u.id, ? FROM users u
    WHERE u.id = ? AND u.role = 'member'
      AND EXISTS (SELECT 1 FROM demo_access WHERE id = 1 AND enabled = 1)
      AND EXISTS (SELECT 1 FROM sign_in_identities i WHERE i.user_id = u.id AND i.provider = 'demo')
      AND NOT EXISTS (SELECT 1 FROM sign_in_identities i WHERE i.user_id = u.id AND i.provider = 'google')
    RETURNING token_hash`).bind(tokenHash, now + sessionSeconds, userId).first<{ token_hash: string }>()
  if (!inserted) throw new HTTPException(404, { message: 'Demo account was not found.' })
  const previousToken = requestToken(request)
  if (previousToken) await deleteSession(db, await hashToken(previousToken))
  return sessionCookie(request, token, sessionSeconds)
}

export async function endSession(request: Request, db: D1Database): Promise<string> {
  const token = requestToken(request)
  if (token) await deleteSession(db, await hashToken(token))
  return sessionCookie(request, '', 0)
}
