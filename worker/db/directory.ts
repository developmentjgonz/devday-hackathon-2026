import type { Cat, Colony, Directory } from '../../shared/types/directory.ts'
import type { ValidCatInput } from '../../shared/schemas/directory.ts'

type ColonyRow = { id: string; name: string; photoUrl: string | null; longitude: number | null; latitude: number | null }
type CatRow = { id: string; name: string; colonyId: string; photoUrl: string | null; birthDate: string | null; birthDateEstimated: number; description: string; photoRevision: string | null }

function catFromRow(row: CatRow): Cat {
  const { photoRevision, photoUrl, birthDate, birthDateEstimated, description, ...cat } = row
  return { ...cat,
    ...(photoRevision ? { photoUrl: `/api/directory/cats/${encodeURIComponent(cat.id)}/photo?v=${encodeURIComponent(photoRevision)}` } : photoUrl ? { photoUrl } : {}),
    ...(birthDate ? { birthDate, birthDateEstimated: Boolean(birthDateEstimated) } : {}),
    ...(description ? { description } : {}),
  }
}
const catSelect = 'SELECT c.id, c.colony_id AS colonyId, c.name, c.photo_url AS photoUrl, c.birth_date AS birthDate, c.birth_date_estimated AS birthDateEstimated, c.description, p.revision AS photoRevision FROM cats c LEFT JOIN cat_photos p ON p.cat_id = c.id'

export async function listDirectory(db: D1Database): Promise<Directory> {
  const [colonies, cats] = await Promise.all([
    db.prepare('SELECT id, name, photo_url AS photoUrl, longitude, latitude FROM colonies ORDER BY name COLLATE NOCASE, id').all<ColonyRow>(),
    db.prepare(`${catSelect} ORDER BY c.name COLLATE NOCASE, c.id`).all<CatRow>(),
  ])
  return {
    colonies: colonies.results.map(({ photoUrl, longitude, latitude, ...colony }) => ({ ...colony,
      ...(photoUrl ? { photoUrl } : {}),
      ...(longitude !== null && latitude !== null ? { coordinates: [longitude, latitude] as [number, number] } : {}),
    })),
    cats: cats.results.map(catFromRow),
  }
}

export async function insertColony(db: D1Database, name: string, userId: string): Promise<Colony> {
  const colony = { id: crypto.randomUUID(), name }
  await db.prepare('INSERT INTO colonies (id, name, created_by) VALUES (?, ?, ?)').bind(colony.id, name, userId).run()
  return colony
}

export async function saveCat(db: D1Database, input: ValidCatInput, userId: string, existingId?: string): Promise<Cat | null> {
  const colony = await db.prepare('SELECT id FROM colonies WHERE id = ?').bind(input.colonyId).first<{ id: string }>()
  if (!colony) return null
  const id = existingId ?? crypto.randomUUID()
  if (existingId && !await db.prepare('SELECT id FROM cats WHERE id = ?').bind(id).first()) return null
  const statements = [existingId
    ? db.prepare('UPDATE cats SET name = ?, colony_id = ?, birth_date = ?, birth_date_estimated = ?, description = ?, photo_url = CASE WHEN ? THEN NULL ELSE photo_url END WHERE id = ?').bind(input.name, input.colonyId, input.birthDate || null, input.birthDate && input.birthDateEstimated ? 1 : 0, input.description, input.photo === null ? 1 : 0, id)
    : db.prepare('INSERT INTO cats (id, name, colony_id, birth_date, birth_date_estimated, description, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(id, input.name, input.colonyId, input.birthDate || null, input.birthDate && input.birthDateEstimated ? 1 : 0, input.description, userId)]
  if (input.photo) statements.push(db.prepare('INSERT INTO cat_photos (cat_id, mime_type, data, revision) VALUES (?, ?, ?, ?) ON CONFLICT(cat_id) DO UPDATE SET mime_type = excluded.mime_type, data = excluded.data, revision = excluded.revision').bind(id, input.photo.mimeType, input.photo.data, crypto.randomUUID()))
  else if (input.photo === null) statements.push(db.prepare('DELETE FROM cat_photos WHERE cat_id = ?').bind(id))
  await db.batch(statements)
  const row = await db.prepare(`${catSelect} WHERE c.id = ?`).bind(id).first<CatRow>()
  return row ? catFromRow(row) : null
}

export async function getCatPhoto(db: D1Database, id: string) {
  return db.prepare('SELECT mime_type AS mimeType, data FROM cat_photos WHERE cat_id = ?').bind(id).first<{ mimeType: string; data: string }>()
}
