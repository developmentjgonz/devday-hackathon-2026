import type { ValidProfileInput } from '../../shared/schemas/auth.ts'
import type { SessionUser } from '../../shared/types/auth.ts'

export type UserRow = SessionUser & { photoRevision: string | null }

export function userFromRow<T extends UserRow>(row: T): Omit<T, 'photoRevision'> {
  const { photoRevision, ...user } = row
  return {
    ...user,
    ...(photoRevision ? { avatarUrl: `/api/auth/photos/${encodeURIComponent(user.id)}?v=${encodeURIComponent(photoRevision)}` } : {}),
  }
}

export async function saveProfile(db: D1Database, id: string, profile: ValidProfileInput): Promise<void> {
  const statements = [db.prepare('UPDATE users SET name = ?, email = ?, phone = ? WHERE id = ?')
    .bind(profile.name, profile.email, profile.phone, id)]
  if (profile.photo) {
    statements.push(db.prepare('INSERT INTO user_photos (user_id, mime_type, data, revision) VALUES (?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET mime_type = excluded.mime_type, data = excluded.data, revision = excluded.revision')
      .bind(id, profile.photo.mimeType, profile.photo.data, crypto.randomUUID()))
  } else if (profile.photo === null) {
    statements.push(db.prepare('DELETE FROM user_photos WHERE user_id = ?').bind(id))
  }
  await db.batch(statements)
}

export function getUserPhoto(db: D1Database, id: string) {
  return db.prepare('SELECT mime_type AS mimeType, data FROM user_photos WHERE user_id = ?').bind(id).first<{ mimeType: string; data: string }>()
}
