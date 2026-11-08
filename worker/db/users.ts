import type { ManagedUser, UserAccessChange } from '../../shared/types/auth.ts'
import { userFromRow, type UserRow } from './user-profile.ts'

const fields = 'id, name, email, phone, role, status, created_at AS createdAt, (SELECT revision FROM user_photos WHERE user_id = users.id) AS photoRevision'
const select = `SELECT u.id, u.name, u.email, u.phone, u.role, u.status, u.created_at AS createdAt, p.revision AS photoRevision FROM users u LEFT JOIN user_photos p ON p.user_id = u.id`
type ManagedUserRow = UserRow & { createdAt: number }

export async function listUsers(db: D1Database): Promise<ManagedUser[]> {
  const { results } = await db.prepare(`
    ${select}
    ORDER BY CASE u.status WHEN 'pending' THEN 0 WHEN 'active' THEN 1 ELSE 2 END, u.name COLLATE NOCASE, u.id
  `).all<ManagedUserRow>()
  return results.map(userFromRow)
}

export async function findUser(db: D1Database, id: string): Promise<ManagedUser | null> {
  const row = await db.prepare(`${select} WHERE u.id = ?`).bind(id).first<ManagedUserRow>()
  return row ? userFromRow(row) : null
}

/** Check the actor, previous values, and last administrator in the same atomic update. */
export async function changeUserAccess(db: D1Database, id: string, actorId: string, change: UserAccessChange): Promise<ManagedUser | null> {
  const changed = await db.prepare(`
    UPDATE users
    SET role = ?, status = ?,
      approved_by = CASE WHEN status = 'pending' AND ? = 'active' THEN ? ELSE approved_by END,
      approved_at = CASE WHEN status = 'pending' AND ? = 'active' THEN unixepoch() ELSE approved_at END
    WHERE id = ? AND id <> ? AND role = ? AND status = ?
      AND (? <> 'administrator' OR NOT EXISTS (SELECT 1 FROM sign_in_identities demo WHERE demo.user_id = users.id AND demo.provider = 'demo'))
      AND (NOT EXISTS (SELECT 1 FROM sign_in_identities actor_demo WHERE actor_demo.user_id = ? AND actor_demo.provider = 'demo-admin')
        OR EXISTS (SELECT 1 FROM sign_in_identities target_demo WHERE target_demo.user_id = users.id AND target_demo.provider = 'demo'))
      AND EXISTS (SELECT 1 FROM users AS actor WHERE actor.id = ? AND actor.role = 'administrator' AND actor.status = 'active')
      AND ((? = 'administrator' AND ? = 'active') OR role <> 'administrator' OR status <> 'active'
        OR EXISTS (SELECT 1 FROM sign_in_identities demo_admin WHERE demo_admin.user_id = users.id AND demo_admin.provider = 'demo-admin')
        OR (SELECT count(*) FROM users real_admin WHERE real_admin.role = 'administrator' AND real_admin.status = 'active'
          AND NOT EXISTS (SELECT 1 FROM sign_in_identities demo_admin WHERE demo_admin.user_id = real_admin.id AND demo_admin.provider = 'demo-admin')) > 1)
    RETURNING ${fields}
  `).bind(
    change.role, change.status, change.status, actorId, change.status,
    id, actorId, change.expectedRole, change.expectedStatus, change.role, actorId, actorId, change.role, change.status,
  ).first<ManagedUserRow>()
  return changed ? userFromRow(changed) : null
}
