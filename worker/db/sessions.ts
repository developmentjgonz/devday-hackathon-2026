import type { SessionUser } from '../../shared/types/auth.ts'

export function findSessionUser(db: D1Database, tokenHash: string, now: number): Promise<SessionUser | null> {
  return db.prepare(`
    SELECT u.id, u.name, u.email, u.phone, u.role, u.status
    FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ? AND s.expires_at > ?
  `).bind(tokenHash, now).first<SessionUser>()
}

export async function insertSession(db: D1Database, session: {
  tokenHash: string
  userId: string
  now: number
  expiresAt: number
  previousTokenHash: string | null
}): Promise<void> {
  const statements = [
    db.prepare('DELETE FROM sessions WHERE expires_at <= ?').bind(session.now),
    db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
      .bind(session.tokenHash, session.userId, session.expiresAt),
  ]
  if (session.previousTokenHash) {
    statements.push(db.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(session.previousTokenHash))
  }
  await db.batch(statements)
}

export async function deleteSession(db: D1Database, tokenHash: string): Promise<void> {
  await db.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(tokenHash).run()
}
