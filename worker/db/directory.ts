import type { Cat, Colony, Coordinates, Directory } from '../../shared/types/directory.ts'
import type { ValidCatInput } from '../../shared/schemas/directory.ts'
import type { SessionUser } from '../../shared/types/auth.ts'
import { activityStatement } from './record-activity.ts'

type ColonyRow = { id: string; name: string; photoUrl: string | null; longitude: number | null; latitude: number | null; address: string | null }
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
const colonySelect = 'id, name, photo_url AS photoUrl, longitude, latitude, address'

function colonyFromRow({ photoUrl, longitude, latitude, address, ...colony }: ColonyRow): Colony {
  return { ...colony,
    ...(photoUrl ? { photoUrl } : {}),
    ...(longitude !== null && latitude !== null ? { coordinates: [longitude, latitude] as Coordinates } : {}),
    ...(address ? { address } : {}),
  }
}

export async function listDirectory(db: D1Database): Promise<Directory> {
  const [colonies, cats] = await Promise.all([
    db.prepare(`SELECT ${colonySelect} FROM colonies ORDER BY name COLLATE NOCASE, id`).all<ColonyRow>(),
    db.prepare(`${catSelect} ORDER BY c.name COLLATE NOCASE, c.id`).all<CatRow>(),
  ])
  return {
    colonies: colonies.results.map(colonyFromRow),
    cats: cats.results.map(catFromRow),
  }
}

export async function insertColony(db: D1Database, name: string, actor: SessionUser, coordinates?: Coordinates, address = ''): Promise<Colony> {
  const colony: Colony = { id: crypto.randomUUID(), name, ...(coordinates ? { coordinates } : {}), ...(address ? { address } : {}) }
  const location = coordinates ? `${address || 'Pin'} (${coordinates[1]}, ${coordinates[0]})` : ''
  const event = { operationId: crypto.randomUUID(), actor, kind: 'profile' as const, summary: 'Colony created', changes: [{ field: 'Name', before: '', after: name }, ...(location ? [{ field: 'Location', before: '', after: location }] : [])], occurredAt: new Date().toISOString() }
  await db.batch([
    db.prepare('INSERT INTO colonies (id, name, longitude, latitude, address, created_by) VALUES (?, ?, ?, ?, ?, ?)').bind(colony.id, name, coordinates?.[0] ?? null, coordinates?.[1] ?? null, address || null, actor.id),
    activityStatement(db, 'colony', colony.id, event),
  ])
  return colony
}

export async function updateColonyLocation(db: D1Database, id: string, actor: SessionUser, coordinates: Coordinates | null, address: string): Promise<Colony | null> {
  if (!await db.prepare('SELECT id FROM colonies WHERE id = ?').bind(id).first()) return null
  await db.batch([
    db.prepare(`WITH i AS (SELECT ? AS colonyId, ? AS longitude, ? AS latitude, ? AS address, ? AS eventId, ? AS operationId, ? AS actorId, ? AS actorName, ? AS occurredAt)
      INSERT INTO record_activity (id, operation_id, record_type, record_id, kind, summary, changes_json, actor_id, actor_name, occurred_at)
      SELECT i.eventId, i.operationId, 'colony', c.id, 'profile', 'Location updated', json_array(json_object(
        'field', 'Location',
        'before', CASE WHEN c.longitude IS NOT NULL THEN COALESCE(NULLIF(c.address, ''), 'Pin') || ' (' || c.latitude || ', ' || c.longitude || ')' ELSE '' END,
        'after', CASE WHEN i.longitude IS NOT NULL THEN COALESCE(NULLIF(i.address, ''), 'Pin') || ' (' || i.latitude || ', ' || i.longitude || ')' ELSE '' END
      )), i.actorId, i.actorName, i.occurredAt FROM colonies c, i
      WHERE c.id = i.colonyId AND (c.longitude IS NOT i.longitude OR c.latitude IS NOT i.latitude OR COALESCE(c.address, '') <> i.address)`)
      .bind(id, coordinates?.[0] ?? null, coordinates?.[1] ?? null, address, crypto.randomUUID(), crypto.randomUUID(), actor.id, actor.name, new Date().toISOString()),
    db.prepare('UPDATE colonies SET longitude = ?, latitude = ?, address = ? WHERE id = ?')
      .bind(coordinates?.[0] ?? null, coordinates?.[1] ?? null, address || null, id),
  ])
  const row = await db.prepare(`SELECT ${colonySelect} FROM colonies WHERE id = ?`).bind(id).first<ColonyRow>()
  return row ? colonyFromRow(row) : null
}

export async function saveCat(db: D1Database, input: ValidCatInput, actor: SessionUser, existingId?: string): Promise<Cat | null> {
  const colony = await db.prepare('SELECT id, name FROM colonies WHERE id = ?').bind(input.colonyId).first<{ id: string; name: string }>()
  if (!colony) return null
  const id = existingId ?? crypto.randomUUID()
  if (existingId && !await db.prepare('SELECT id FROM cats WHERE id = ?').bind(id).first()) return null
  const operationId = crypto.randomUUID()
  const occurredAt = new Date().toISOString()
  const statements: D1PreparedStatement[] = []
  if (existingId) {
    const photoMode = input.photo === undefined ? '' : input.photo === null ? 'removed' : 'updated'
    const fields = `c.name <> i.name OR c.colony_id <> i.colonyId OR COALESCE(c.birth_date, '') <> i.birthDate
      OR c.birth_date_estimated <> i.estimated OR c.description <> i.description OR i.photoMode = 'updated'
      OR (i.photoMode = 'removed' AND (c.photo_url IS NOT NULL OR EXISTS (SELECT 1 FROM cat_photos p WHERE p.cat_id = c.id)))`
    const inputCte = `WITH i AS (SELECT ? AS catId, ? AS name, ? AS colonyId, ? AS birthDate, ? AS estimated, ? AS description, ? AS photoMode, ? AS operationId, ? AS actorId, ? AS actorName, ? AS occurredAt)`
    const bind = () => [id, input.name, input.colonyId, input.birthDate, input.birthDate && input.birthDateEstimated ? 1 : 0, input.description, photoMode, operationId, actor.id, actor.name, occurredAt] as const
    statements.push(db.prepare(`${inputCte}
      INSERT INTO record_activity (id, operation_id, record_type, record_id, kind, summary, changes_json, actor_id, actor_name, occurred_at)
      SELECT lower(hex(randomblob(16))), i.operationId, 'cat', c.id, 'profile', 'Cat profile updated', json_array(
        CASE WHEN c.name <> i.name THEN json_object('field', 'Name', 'before', c.name, 'after', i.name) END,
        CASE WHEN c.colony_id <> i.colonyId THEN json_object('field', 'Colony', 'before', COALESCE((SELECT name FROM colonies WHERE id = c.colony_id), c.colony_id), 'after', COALESCE((SELECT name FROM colonies WHERE id = i.colonyId), i.colonyId)) END,
        CASE WHEN COALESCE(c.birth_date, '') <> i.birthDate THEN json_object('field', 'Birth date', 'before', COALESCE(c.birth_date, ''), 'after', i.birthDate) END,
        CASE WHEN (CASE WHEN c.birth_date IS NULL THEN '' WHEN c.birth_date_estimated THEN 'Estimated' ELSE 'Exact' END) <> (CASE WHEN i.birthDate = '' THEN '' WHEN i.estimated THEN 'Estimated' ELSE 'Exact' END)
          THEN json_object('field', 'Birth date type', 'before', CASE WHEN c.birth_date IS NULL THEN '' WHEN c.birth_date_estimated THEN 'Estimated' ELSE 'Exact' END, 'after', CASE WHEN i.birthDate = '' THEN '' WHEN i.estimated THEN 'Estimated' ELSE 'Exact' END) END,
        CASE WHEN c.description <> i.description THEN json_object('field', 'Details', 'before', c.description, 'after', i.description) END,
        CASE WHEN i.photoMode = 'updated' THEN json_object('field', 'Photo', 'before', CASE WHEN c.photo_url IS NOT NULL OR EXISTS (SELECT 1 FROM cat_photos p WHERE p.cat_id = c.id) THEN 'Existing photo' ELSE 'None' END, 'after', 'New photo')
          WHEN i.photoMode = 'removed' AND (c.photo_url IS NOT NULL OR EXISTS (SELECT 1 FROM cat_photos p WHERE p.cat_id = c.id)) THEN json_object('field', 'Photo', 'before', 'Existing photo', 'after', 'None') END
      ), i.actorId, i.actorName, i.occurredAt FROM cats c, i WHERE c.id = i.catId AND (${fields})`).bind(...bind()))
    statements.push(db.prepare(`${inputCte}
      INSERT OR IGNORE INTO record_activity (id, operation_id, record_type, record_id, kind, summary, actor_id, actor_name, occurred_at)
      SELECT lower(hex(randomblob(16))), i.operationId, 'colony', c.colony_id, 'profile',
        CASE WHEN c.colony_id <> i.colonyId THEN 'Cat moved out: ' || c.name ELSE 'Cat profile updated: ' || i.name END,
        i.actorId, i.actorName, i.occurredAt FROM cats c, i WHERE c.id = i.catId AND (${fields})`).bind(...bind()))
    statements.push(db.prepare(`${inputCte}
      INSERT OR IGNORE INTO record_activity (id, operation_id, record_type, record_id, kind, summary, actor_id, actor_name, occurred_at)
      SELECT lower(hex(randomblob(16))), i.operationId, 'colony', i.colonyId, 'profile', 'Cat moved in: ' || i.name,
        i.actorId, i.actorName, i.occurredAt FROM cats c, i WHERE c.id = i.catId AND c.colony_id <> i.colonyId`).bind(...bind()))
  }
  statements.push(existingId
    ? db.prepare('UPDATE cats SET name = ?, colony_id = ?, birth_date = ?, birth_date_estimated = ?, description = ?, photo_url = CASE WHEN ? THEN NULL ELSE photo_url END WHERE id = ?').bind(input.name, input.colonyId, input.birthDate || null, input.birthDate && input.birthDateEstimated ? 1 : 0, input.description, input.photo === null ? 1 : 0, id)
    : db.prepare('INSERT INTO cats (id, name, colony_id, birth_date, birth_date_estimated, description, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(id, input.name, input.colonyId, input.birthDate || null, input.birthDate && input.birthDateEstimated ? 1 : 0, input.description, actor.id))
  if (input.photo) statements.push(db.prepare('INSERT INTO cat_photos (cat_id, mime_type, data, revision) VALUES (?, ?, ?, ?) ON CONFLICT(cat_id) DO UPDATE SET mime_type = excluded.mime_type, data = excluded.data, revision = excluded.revision').bind(id, input.photo.mimeType, input.photo.data, crypto.randomUUID()))
  else if (input.photo === null) statements.push(db.prepare('DELETE FROM cat_photos WHERE cat_id = ?').bind(id))
  if (!existingId) {
    const event = { operationId, actor, kind: 'profile' as const, summary: 'Cat created', changes: [
      { field: 'Name', before: '', after: input.name }, { field: 'Colony', before: '', after: colony.name },
      ...(input.birthDate ? [{ field: 'Birth date', before: '', after: input.birthDate }, { field: 'Birth date type', before: '', after: input.birthDateEstimated ? 'Estimated' : 'Exact' }] : []),
      ...(input.description ? [{ field: 'Details', before: '', after: input.description }] : []),
      ...(input.photo ? [{ field: 'Photo', before: '', after: 'New photo' }] : []),
    ], occurredAt }
    statements.push(activityStatement(db, 'cat', id, event), activityStatement(db, 'colony', input.colonyId, { ...event, summary: `Cat added: ${input.name}`, changes: [] }))
  }
  await db.batch(statements)
  const row = await db.prepare(`${catSelect} WHERE c.id = ?`).bind(id).first<CatRow>()
  return row ? catFromRow(row) : null
}

export async function getCatPhoto(db: D1Database, id: string) {
  return db.prepare('SELECT mime_type AS mimeType, data FROM cat_photos WHERE cat_id = ?').bind(id).first<{ mimeType: string; data: string }>()
}
