import type { SessionUser, SignInOptions } from '../../shared/types/auth.ts'
import { userFromRow, type UserRow } from './user-profile.ts'

export async function listLocalUsers(db: D1Database): Promise<SignInOptions['users']> {
  const { results } = await db.prepare(`
    SELECT u.id, u.name, u.email, u.role, u.status
    FROM users u JOIN sign_in_identities i ON i.user_id = u.id
    WHERE i.provider = 'local'
    ORDER BY CASE WHEN u.role = 'administrator' THEN 0 ELSE 1 END, u.created_at, u.name
  `).all<SignInOptions['users'][number]>()
  return results
}

export async function findLocalUser(db: D1Database, userId: string): Promise<SessionUser | null> {
  const row = await db.prepare(`
    SELECT u.id, u.name, u.email, u.phone, u.role, u.status, p.revision AS photoRevision
    FROM users u JOIN sign_in_identities i ON i.user_id = u.id
    LEFT JOIN user_photos p ON p.user_id = u.id
    WHERE u.id = ? AND i.provider = 'local'
  `).bind(userId).first<UserRow>()
  return row ? userFromRow(row) : null
}

const eligibleDemo = `i.provider = 'demo' AND u.role = 'member'
  AND NOT EXISTS (SELECT 1 FROM sign_in_identities google WHERE google.user_id = u.id AND google.provider = 'google')`

export async function listDemoUsers(db: D1Database): Promise<SignInOptions['users']> {
  const { results } = await db.prepare(`
    SELECT u.id, u.name, u.email, u.role, u.status
    FROM users u JOIN sign_in_identities i ON i.user_id = u.id
    WHERE ${eligibleDemo} ORDER BY u.created_at, u.name
  `).all<SignInOptions['users'][number]>()
  return results
}

export async function findDemoUser(db: D1Database, userId: string): Promise<SessionUser | null> {
  const row = await db.prepare(`
    SELECT u.id, u.name, u.email, u.phone, u.role, u.status, p.revision AS photoRevision
    FROM users u JOIN sign_in_identities i ON i.user_id = u.id
    LEFT JOIN user_photos p ON p.user_id = u.id
    WHERE u.id = ? AND ${eligibleDemo}
  `).bind(userId).first<UserRow>()
  return row ? userFromRow(row) : null
}

export async function hasDemoIdentity(db: D1Database, userId: string): Promise<boolean> {
  return Boolean(await db.prepare("SELECT 1 FROM sign_in_identities WHERE user_id = ? AND provider = 'demo'").bind(userId).first())
}

export async function findDemoAdministrator(db: D1Database): Promise<SessionUser | null> {
  const row = await db.prepare(`
    SELECT u.id, u.name, u.email, u.phone, u.role, u.status, p.revision AS photoRevision
    FROM users u JOIN sign_in_identities i ON i.user_id = u.id
    LEFT JOIN user_photos p ON p.user_id = u.id
    WHERE i.provider = 'demo-admin' AND u.role = 'administrator' AND u.status = 'active'
      AND NOT EXISTS (SELECT 1 FROM sign_in_identities other WHERE other.user_id = u.id AND other.provider IN ('google', 'demo'))
    LIMIT 1
  `).first<UserRow>()
  return row ? userFromRow(row) : null
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
