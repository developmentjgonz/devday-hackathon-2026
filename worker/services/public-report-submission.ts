import { attachmentType } from '../../shared/attachments.ts'
import type { PublicReportInput } from '../../shared/schemas/public-report.ts'
import { insertPublicReport, publicReportAttachmentKeys, publicReportExists } from '../db/public-reports.ts'
import type { StoredAttachment } from '../db/workspace.ts'

async function digest(value: BufferSource): Promise<string> {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', value)), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function submitPublicReport(db: D1Database, bucket: R2Bucket, id: string, input: PublicReportInput, uploads: File[]): Promise<void> {
  const files = []
  for (const file of uploads) {
    files.push({ name: file.name.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 200) || 'Attachment', mimeType: attachmentType(file)!, size: file.size, hash: await digest(await file.arrayBuffer()) })
  }
  const hash = await digest(new TextEncoder().encode(JSON.stringify({ ...input, files })))
  if (await publicReportExists(db, id, hash)) return
  const stored: StoredAttachment[] = []
  try {
    for (const [index, file] of uploads.entries()) {
      const metadata = files[index]!
      // Each upload attempt has its own R2 key. Stable row IDs prevent duplicate
      // attachments if two retries reach the database at the same time.
      const key = `reports/${id}/${crypto.randomUUID()}`
      stored.push({ id: `${id}-attachment-${index}`, key, name: metadata.name, mimeType: metadata.mimeType, size: metadata.size })
      await bucket.put(key, file.stream(), { httpMetadata: { contentType: metadata.mimeType } })
    }
    await insertPublicReport(db, id, hash, input, stored)
  } finally {
    if (stored.length) {
      // A failed HTTP response may still follow a committed transaction. Remove
      // only objects that no attachment row references.
      const referenced = await publicReportAttachmentKeys(db, id)
      await Promise.allSettled(stored.filter((file) => !referenced.has(file.key)).map((file) => bucket.delete(file.key)))
    }
  }
}
