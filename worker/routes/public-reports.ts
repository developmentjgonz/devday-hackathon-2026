import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { HTTPException } from 'hono/http-exception'
import { publicReportSchema } from '../../shared/schemas/public-report.ts'
import { publicReportChatSchema } from '../../shared/schemas/public-report-chat.ts'
import { hasOpenAiConfiguration, openAiConfiguration, publicReportChatEnabled, readPublicContacts } from '../db/configuration.ts'
import { configurationKey } from '../lib/configuration-secret.ts'
import { requireSameOrigin } from '../middleware/auth.ts'
import { preparePublicReport } from '../services/public-report-chat.ts'
import { submitPublicReport } from '../services/public-report-submission.ts'
import { maxAttachments, maxAttachmentSize } from '../../shared/attachments.ts'
import { readReportInput } from '../lib/report-input.ts'
import { uploadedAnalysisAttachments } from '../services/analysis-attachments.ts'
import type { AppEnv } from '../types.ts'

export const publicReportRoutes = new Hono<AppEnv>()

publicReportRoutes.get('/contact', async (c) => {
  const [contacts, enabled] = await Promise.all([readPublicContacts(c.env.DB), publicReportChatEnabled(c.env.DB)])
  const chatAvailable = Boolean(enabled && c.env.PUBLIC_CHAT_RATE_LIMITER && c.env.PUBLIC_CHAT_TOTAL_LIMITER
    && await hasOpenAiConfiguration(c.env.DB, await configurationKey(c.env.CONFIG_ENCRYPTION_KEY)))
  return c.json({ ...contacts, chatAvailable })
})

publicReportRoutes.post('/chat', requireSameOrigin, bodyLimit({
  maxSize: maxAttachments * maxAttachmentSize + 65536,
  onError: () => { throw new HTTPException(413, { message: 'The conversation or attachments are too large.' }) },
}), async (c) => {
  if (!await publicReportChatEnabled(c.env.DB)) throw new HTTPException(404, { message: 'The assistant is unavailable. Use the report form.' })
  if (!c.env.PUBLIC_CHAT_RATE_LIMITER || !c.env.PUBLIC_CHAT_TOTAL_LIMITER) throw new HTTPException(503, { message: 'The assistant is unavailable. Use the report form.' })
  const [perVisitor, total] = await Promise.all([
    c.env.PUBLIC_CHAT_RATE_LIMITER.limit({ key: c.req.header('CF-Connecting-IP') ?? 'unknown' }),
    c.env.PUBLIC_CHAT_TOTAL_LIMITER.limit({ key: 'public-report-chat' }),
  ])
  if (!perVisitor.success || !total.success) throw new HTTPException(429, { message: 'The assistant is busy. Try again later or use the report form.' })
  const settings = await openAiConfiguration(c.env.DB, await configurationKey(c.env.CONFIG_ENCRYPTION_KEY))
  const { value, uploads } = await readReportInput(c.req.raw)
  const parsed = publicReportChatSchema.safeParse(value)
  if (!parsed.success) throw new HTTPException(400, { message: parsed.error.issues[0]?.message ?? 'The conversation is invalid.' })
  const prepared = await uploadedAnalysisAttachments(settings.apiKey, uploads)
  const draft = await preparePublicReport(settings, parsed.data.messages, parsed.data, prepared)
  return c.json({ ...draft, ...(uploads.length ? { skippedAttachments: prepared.skipped } : {}) })
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
  const { value, uploads } = await readReportInput(c.req.raw)
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
