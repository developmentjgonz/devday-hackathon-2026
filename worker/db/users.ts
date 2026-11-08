import type { ManagedUser, UserAccessChange } from '../../shared/types/auth.ts'

const fields = 'id, name, email, phone, role, status, created_at AS createdAt'

export async function listUsers(db: D1Database): Promise<ManagedUser[]> {
  const { results } = await db.prepare(`
    SELECT ${fields} FROM users
    ORDER BY CASE status WHEN 'pending' THEN 0 WHEN 'active' THEN 1 ELSE 2 END, name COLLATE NOCASE, id
  `).all<ManagedUser>()
  return results
}

export function findUser(db: D1Database, id: string): Promise<ManagedUser | null> {
  return db.prepare(`SELECT ${fields} FROM users WHERE id = ?`).bind(id).first<ManagedUser>()
}

/** Check the actor, previous values, and last administrator in the same atomic update. */
export function changeUserAccess(db: D1Database, id: string, actorId: string, change: UserAccessChange): Promise<ManagedUser | null> {
  return db.prepare(`
    UPDATE users
    SET role = ?, status = ?,
      approved_by = CASE WHEN status = 'pending' AND ? = 'active' THEN ? ELSE approved_by END,
      approved_at = CASE WHEN status = 'pending' AND ? = 'active' THEN unixepoch() ELSE approved_at END
    WHERE id = ? AND id <> ? AND role = ? AND status = ?
      AND EXISTS (SELECT 1 FROM users AS actor WHERE actor.id = ? AND actor.role = 'administrator' AND actor.status = 'active')
      AND ((? = 'administrator' AND ? = 'active') OR role <> 'administrator' OR status <> 'active'
        OR (SELECT count(*) FROM users WHERE role = 'administrator' AND status = 'active') > 1)
    RETURNING ${fields}
  `).bind(
    change.role, change.status, change.status, actorId, change.status,
    id, actorId, change.expectedRole, change.expectedStatus, actorId, change.role, change.status,
  ).first<ManagedUser>()
}
