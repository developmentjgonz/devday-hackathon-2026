import { HTTPException } from 'hono/http-exception'
import type { PublicReportInput } from '../../shared/schemas/public-report.ts'
import type { StoredAttachment } from './workspace.ts'

export async function publicReportExists(db: D1Database, id: string, hash: string): Promise<boolean> {
  const row = await db.prepare('SELECT public_submission_hash AS hash FROM reports WHERE id = ?').bind(id).first<{ hash: string | null }>()
  if (row && row.hash !== hash) throw new HTTPException(409, { message: 'This report was already sent with different details or attachments.' })
  return Boolean(row)
}

export async function insertPublicReport(db: D1Database, id: string, hash: string, input: PublicReportInput, files: StoredAttachment[]) {
  const location = input.location || 'Selected map location'
  const title = Array.from(`Community report: ${location.replace(/\s+/g, ' ')}`).slice(0, 160).join('')
  const map = input.mapLocation
  const contact = input.contact
  const submittedAt = new Date().toISOString()
  await db.batch([
    db.prepare(`INSERT INTO reports (id, title, message, category, reporter_id, submitted_at, urgent, public_latitude, public_longitude, public_google_place_id, public_submission_hash, public_contact_phone, public_contact_email, public_contact_consented_at)
      VALUES (?, ?, ?, 'Community report', NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING`)
      .bind(id, title, `Location: ${location}\n\nDetails: ${input.details}`, submittedAt, Number(input.urgent), map?.type === 'pin' ? map.latitude : null, map?.type === 'pin' ? map.longitude : null, map?.type === 'google-place' ? map.placeId : null, hash, contact?.phone ?? null, contact?.email ?? null, contact ? submittedAt : null),
    ...files.map((file) => db.prepare(`INSERT INTO report_attachments (id, report_id, storage_key, name, mime_type, size)
      SELECT ?, ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM reports WHERE id = ? AND public_submission_hash = ?)
      ON CONFLICT(id) DO NOTHING`).bind(file.id, id, file.key, file.name, file.mimeType, file.size, id, hash)),
  ])
  await publicReportExists(db, id, hash)
}

export async function publicReportAttachmentKeys(db: D1Database, reportId: string): Promise<Set<string>> {
  const saved = await db.prepare('SELECT storage_key AS key FROM report_attachments WHERE report_id = ?').bind(reportId).all<{ key: string }>()
  return new Set(saved.results.map((file) => file.key))
}
