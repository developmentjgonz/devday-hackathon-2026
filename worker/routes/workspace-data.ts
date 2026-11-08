import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { HTTPException } from 'hono/http-exception'
import { createReportSchema, duplicateSchema, finishReportSchema, questionSchema, taskInputSchema, taskStatusSchema } from '../../shared/schemas/workspace.ts'
import { addQuestion, changeTaskStatus, createTask, editTask, findAttachment, finishReport, insertReport, linkDuplicate, listReports, listWorkspace, reopenReport, type StoredAttachment } from '../db/workspace.ts'
import { requireActiveUser, requireSameOrigin } from '../middleware/auth.ts'
import { requireJson, validateJson } from '../middleware/validation.ts'
import type { AppEnv } from '../types.ts'

export const workspaceDataRoutes = new Hono<AppEnv>()
workspaceDataRoutes.get('/workspace-data', requireActiveUser, async (c) => c.json(await listWorkspace(c.env.DB)))
const limitWorkspaceBody = bodyLimit({ maxSize: 32 * 1024, onError: () => { throw new HTTPException(413, { message: 'Form data is too large.' }) } })

const imageTypes = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif'])
const documents: Record<string, string> = { pdf: 'application/pdf', txt: 'text/plain', csv: 'text/csv', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }
function attachmentType(file: File): string | null {
  const mime = file.type.toLowerCase()
  if (imageTypes.has(mime) || /^audio\/[a-z0-9.+-]+$/.test(mime)) return mime
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  return documents[extension] ?? null
}

workspaceDataRoutes.post('/reports', requireActiveUser, requireSameOrigin, bodyLimit({ maxSize: 5 * 10 * 1024 * 1024 + 65536, onError: () => { throw new HTTPException(413, { message: 'Attachments are too large.' }) } }), async (c) => {
  if (!/^multipart\/form-data(?:\s*;|$)/i.test(c.req.header('Content-Type') ?? '')) throw new HTTPException(415, { message: 'Send report data and attachments.' })
  let form: FormData
  try { form = await c.req.raw.formData() } catch { throw new HTTPException(400, { message: 'Report data is invalid.' }) }
  const raw = form.get('data')
  if (typeof raw !== 'string') throw new HTTPException(400, { message: 'Report data is required.' })
  let value: unknown
  try { value = JSON.parse(raw) } catch { throw new HTTPException(400, { message: 'Report data is invalid.' }) }
  const parsed = createReportSchema.safeParse(value)
  if (!parsed.success) throw new HTTPException(400, { message: parsed.error.issues[0]?.message ?? 'Report data is invalid.' })
  const files = form.getAll('files')
  if (files.length > 5 || files.some((file) => !(file instanceof File))) throw new HTTPException(400, { message: 'Add up to 5 attachments.' })
  const uploads = files as File[]
  if (uploads.some((file) => file.size > 10 * 1024 * 1024)) throw new HTTPException(413, { message: 'Each attachment must be 10 MB or smaller.' })
  if (uploads.some((file) => !attachmentType(file))) throw new HTTPException(400, { message: 'Choose supported photos, audio, PDF, text, Word, or CSV files.' })

  const id = crypto.randomUUID()
  const stored: StoredAttachment[] = []
  let committed = false
  try {
    for (const file of uploads) {
      const attachmentId = crypto.randomUUID()
      const key = `reports/${id}/${attachmentId}`
      const mimeType = attachmentType(file)!
      const name = file.name.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 200) || 'Attachment'
      await c.env.UPLOADS.put(key, file.stream(), { httpMetadata: { contentType: mimeType } })
      stored.push({ id: attachmentId, key, name, mimeType, size: file.size })
    }
    await insertReport(c.env.DB, id, c.get('user'), parsed.data, stored)
    committed = true
    const report = (await listReports(c.env.DB, id))[0]!
    return c.json({ report }, 201)
  } catch (error) {
    if (!committed) await Promise.allSettled(stored.map((file) => c.env.UPLOADS.delete(file.key)))
    throw error
  }
})

workspaceDataRoutes.post('/reports/:id/finish', requireActiveUser, requireSameOrigin, requireJson, limitWorkspaceBody, validateJson(finishReportSchema), async (c) => c.json({ report: await finishReport(c.env.DB, c.req.param('id'), c.get('user'), c.req.valid('json')) }))
workspaceDataRoutes.post('/reports/:id/reopen', requireActiveUser, requireSameOrigin, async (c) => c.json({ report: await reopenReport(c.env.DB, c.req.param('id'), c.get('user')) }))
workspaceDataRoutes.post('/reports/:id/questions', requireActiveUser, requireSameOrigin, requireJson, limitWorkspaceBody, validateJson(questionSchema), async (c) => c.json({ report: await addQuestion(c.env.DB, c.req.param('id'), c.get('user'), c.req.valid('json').text) }))
workspaceDataRoutes.post('/reports/:id/duplicate', requireActiveUser, requireSameOrigin, requireJson, limitWorkspaceBody, validateJson(duplicateSchema), async (c) => c.json({ report: await linkDuplicate(c.env.DB, c.req.param('id'), c.req.valid('json').targetId, c.get('user')) }))

workspaceDataRoutes.post('/tasks', requireActiveUser, requireSameOrigin, requireJson, limitWorkspaceBody, validateJson(taskInputSchema), async (c) => {
  const task = await createTask(c.env.DB, c.get('user'), c.req.valid('json'))
  const report = task.reportId ? (await listReports(c.env.DB, task.reportId))[0] ?? null : null
  return c.json({ task, report }, 201)
})
workspaceDataRoutes.post('/tasks/:id/edit', requireActiveUser, requireSameOrigin, requireJson, limitWorkspaceBody, validateJson(taskInputSchema), async (c) => {
  const task = await editTask(c.env.DB, c.req.param('id'), c.get('user'), c.req.valid('json'))
  const report = task.reportId ? (await listReports(c.env.DB, task.reportId))[0] ?? null : null
  return c.json({ task, report })
})
workspaceDataRoutes.post('/tasks/:id/status', requireActiveUser, requireSameOrigin, requireJson, limitWorkspaceBody, validateJson(taskStatusSchema), async (c) => {
  const task = await changeTaskStatus(c.env.DB, c.req.param('id'), c.get('user'), c.req.valid('json').status)
  const report = task.reportId ? (await listReports(c.env.DB, task.reportId))[0] ?? null : null
  return c.json({ task, report })
})

workspaceDataRoutes.get('/attachments/:id', requireActiveUser, async (c) => {
  const attachment = await findAttachment(c.env.DB, c.req.param('id'))
  if (!attachment) throw new HTTPException(404, { message: 'Attachment not found.' })
  const object = await c.env.UPLOADS.get(attachment.key)
  if (!object) throw new HTTPException(404, { message: 'Attachment not found.' })
  const inline = imageTypes.has(attachment.mimeType) || attachment.mimeType.startsWith('audio/') || attachment.mimeType === 'application/pdf'
  const disposition = `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(attachment.name)}`
  return new Response(object.body, { headers: {
    'Content-Type': attachment.mimeType,
    'Content-Disposition': disposition,
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'none'; sandbox",
  } })
})
