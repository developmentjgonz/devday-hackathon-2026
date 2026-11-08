import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { HTTPException } from 'hono/http-exception'
import { publicReportSchema } from '../../shared/schemas/public-report.ts'
import { publicReportChatSchema } from '../../shared/schemas/public-report-chat.ts'
import { hasOpenAiConfiguration, openAiConfiguration, publicReportChatEnabled, readPublicContacts } from '../db/configuration.ts'
import { configurationKey } from '../lib/configuration-secret.ts'
import { requireSameOrigin } from '../middleware/auth.ts'
import { requireJson, validateJson } from '../middleware/validation.ts'
import { preparePublicReport } from '../services/public-report-chat.ts'
import { submitPublicReport } from '../services/public-report-submission.ts'
import { attachmentError, maxAttachments, maxAttachmentSize } from '../../shared/attachments.ts'
import type { AppEnv } from '../types.ts'

export const publicReportRoutes = new Hono<AppEnv>()

publicReportRoutes.get('/contact', async (c) => {
  const [contacts, enabled] = await Promise.all([readPublicContacts(c.env.DB), publicReportChatEnabled(c.env.DB)])
  const chatAvailable = Boolean(enabled && c.env.PUBLIC_CHAT_RATE_LIMITER && c.env.PUBLIC_CHAT_TOTAL_LIMITER
    && await hasOpenAiConfiguration(c.env.DB, await configurationKey(c.env.CONFIG_ENCRYPTION_KEY)))
  return c.json({ ...contacts, chatAvailable })
})

publicReportRoutes.post('/chat', requireSameOrigin, requireJson, bodyLimit({
  maxSize: 32 * 1024,
  onError: () => { throw new HTTPException(413, { message: 'The conversation is too long.' }) },
}), validateJson(publicReportChatSchema), async (c) => {
  if (!await publicReportChatEnabled(c.env.DB)) throw new HTTPException(404, { message: 'The assistant is unavailable. Use the report form.' })
  if (!c.env.PUBLIC_CHAT_RATE_LIMITER || !c.env.PUBLIC_CHAT_TOTAL_LIMITER) throw new HTTPException(503, { message: 'The assistant is unavailable. Use the report form.' })
  const [perVisitor, total] = await Promise.all([
    c.env.PUBLIC_CHAT_RATE_LIMITER.limit({ key: c.req.header('CF-Connecting-IP') ?? 'unknown' }),
    c.env.PUBLIC_CHAT_TOTAL_LIMITER.limit({ key: 'public-report-chat' }),
  ])
  if (!perVisitor.success || !total.success) throw new HTTPException(429, { message: 'The assistant is busy. Try again later or use the report form.' })
  const settings = await openAiConfiguration(c.env.DB, await configurationKey(c.env.CONFIG_ENCRYPTION_KEY))
  const input = c.req.valid('json')
  return c.json(await preparePublicReport(settings, input.messages, input))
})

publicReportRoutes.post('/', requireSameOrigin, bodyLimit({
  maxSize: maxAttachments * maxAttachmentSize + 65536,
  onError: () => { throw new HTTPException(413, { message: 'Report is too large.' }) },
}), async (c, next) => {
  if (!c.env.PUBLIC_REPORT_RATE_LIMITER) throw new HTTPException(503, { message: 'Reports are unavailable. Try again later.' })
  const { success } = await c.env.PUBLIC_REPORT_RATE_LIMITER.limit({ key: c.req.header('CF-Connecting-IP') ?? 'unknown' })
  if (!success) throw new HTTPException(429, { message: 'Too many reports. Please try again later.' })
  await next()
}, async (c) => {
  let value: unknown
  let uploads: File[] = []
  const contentType = c.req.header('Content-Type') ?? ''
  if (/^multipart\/form-data(?:\s*;|$)/i.test(contentType)) {
    let form: FormData
    try { form = await c.req.raw.formData() } catch { throw new HTTPException(400, { message: 'Report data is invalid.' }) }
    const data = form.get('data')
    if (typeof data !== 'string' || data.length > 32 * 1024) throw new HTTPException(400, { message: 'Report data is invalid.' })
    try { value = JSON.parse(data) } catch { throw new HTTPException(400, { message: 'Report data is invalid.' }) }
    const files = form.getAll('files')
    if (files.some((file) => !(file instanceof File))) throw new HTTPException(400, { message: 'Choose valid attachments.' })
    uploads = files as File[]
    const error = attachmentError(uploads)
    if (error) throw new HTTPException(uploads.some((file) => file.size > maxAttachmentSize) ? 413 : 400, { message: error })
  } else if (/^application\/json(?:\s*;|$)/i.test(contentType)) {
    const body = await c.req.text()
    if (body.length > 32 * 1024) throw new HTTPException(413, { message: 'Report is too large.' })
    try { value = JSON.parse(body) } catch { throw new HTTPException(400, { message: 'Report data is invalid.' }) }
  } else throw new HTTPException(415, { message: 'Send report data and optional attachments.' })
  const parsed = publicReportSchema.safeParse(value)
  if (!parsed.success) throw new HTTPException(400, { message: parsed.error.issues[0]?.message ?? 'Report data is invalid.' })
  const submissionKey = c.req.header('Idempotency-Key')
  if (submissionKey && !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(submissionKey)) {
    throw new HTTPException(400, { message: 'The report could not be identified. Try again.' })
  }
  const id = submissionKey ? `public-${submissionKey.toLowerCase()}` : crypto.randomUUID()
  await submitPublicReport(c.env.DB, c.env.UPLOADS, id, parsed.data, uploads)
  return c.json({ submitted: true }, 201)
})
