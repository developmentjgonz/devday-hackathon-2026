import type { SessionUser } from '../../shared/types/auth.ts'
import { userFromRow, type UserRow } from './user-profile.ts'

export async function findSessionUser(db: D1Database, tokenHash: string, now: number): Promise<{ user: SessionUser; authMethod: 'standard' | 'demo' | 'demo-admin'; demoIdentity: boolean; demoAdminIdentity: boolean; googleIdentity: boolean } | null> {
  const row = await db.prepare(`
    SELECT u.id, u.name, u.email, u.phone, u.role, u.status, p.revision AS photoRevision, s.auth_method AS authMethod,
      EXISTS (SELECT 1 FROM sign_in_identities i WHERE i.user_id = u.id AND i.provider = 'demo') AS demoIdentity,
      EXISTS (SELECT 1 FROM sign_in_identities i WHERE i.user_id = u.id AND i.provider = 'demo-admin') AS demoAdminIdentity,
      EXISTS (SELECT 1 FROM sign_in_identities i WHERE i.user_id = u.id AND i.provider = 'google') AS googleIdentity
    FROM sessions s JOIN users u ON u.id = s.user_id
    LEFT JOIN user_photos p ON p.user_id = u.id
    WHERE s.token_hash = ? AND s.expires_at > ?
  `).bind(tokenHash, now).first<UserRow & { authMethod: 'standard' | 'demo' | 'demo-admin'; demoIdentity: number; demoAdminIdentity: number; googleIdentity: number }>()
  return row ? { user: userFromRow(row), authMethod: row.authMethod, demoIdentity: Boolean(row.demoIdentity), demoAdminIdentity: Boolean(row.demoAdminIdentity), googleIdentity: Boolean(row.googleIdentity) } : null
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
