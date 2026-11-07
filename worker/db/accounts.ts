import type { SessionUser, SignInOptions } from '../../shared/types/auth.ts'

export async function listLocalUsers(db: D1Database): Promise<SignInOptions['users']> {
  const { results } = await db.prepare(`
    SELECT u.id, u.name, u.email, u.role, u.status
    FROM users u JOIN sign_in_identities i ON i.user_id = u.id
    WHERE i.provider = 'local'
    ORDER BY CASE WHEN u.role = 'administrator' THEN 0 ELSE 1 END, u.created_at, u.name
  `).all<SignInOptions['users'][number]>()
  return results
}

export function findLocalUser(db: D1Database, userId: string): Promise<SessionUser | null> {
  return db.prepare(`
    SELECT u.id, u.name, u.email, u.phone, u.role, u.status
    FROM users u JOIN sign_in_identities i ON i.user_id = u.id
    WHERE u.id = ? AND i.provider = 'local'
  `).bind(userId).first<SessionUser>()
}

export function findUserByEmail(db: D1Database, email: string): Promise<{ id: string } | null> {
  return db.prepare('SELECT id FROM users WHERE email = ?').bind(email).first<{ id: string }>()
}

export async function insertLocalUser(db: D1Database, user: SessionUser): Promise<void> {
  await db.batch([
    db.prepare("INSERT INTO users (id, name, email, phone, role, status) VALUES (?, ?, ?, ?, 'member', 'pending')")
      .bind(user.id, user.name, user.email, user.phone),
    db.prepare("INSERT INTO sign_in_identities (provider, subject, user_id) VALUES ('local', ?, ?)")
      .bind(user.id, user.id),
  ])
}
