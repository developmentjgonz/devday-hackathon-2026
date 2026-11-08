import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { HTTPException } from 'hono/http-exception'
import { publicReportSchema } from '../../shared/schemas/public-report.ts'
import { requireSameOrigin } from '../middleware/auth.ts'
import { requireJson, validateJson } from '../middleware/validation.ts'
import type { AppEnv } from '../types.ts'

export const publicReportRoutes = new Hono<AppEnv>()

publicReportRoutes.post('/', requireSameOrigin, requireJson, bodyLimit({
  maxSize: 32 * 1024,
  onError: () => { throw new HTTPException(413, { message: 'Report is too large.' }) },
}), async (c, next) => {
  if (!c.env.PUBLIC_REPORT_RATE_LIMITER) throw new HTTPException(503, { message: 'Reports are unavailable. Try again later.' })
  const { success } = await c.env.PUBLIC_REPORT_RATE_LIMITER.limit({ key: c.req.header('CF-Connecting-IP') ?? 'unknown' })
  if (!success) throw new HTTPException(429, { message: 'Too many reports. Please try again later.' })
  await next()
}, validateJson(publicReportSchema), async (c) => {
  const { location, details, urgent } = c.req.valid('json')
  const title = Array.from(`Community report: ${location.replace(/\s+/g, ' ')}`).slice(0, 160).join('')
  const message = `Location: ${location}\n\nDetails: ${details}`
  await c.env.DB.prepare(`INSERT INTO reports (id, title, message, category, reporter_id, submitted_at, urgent)
    VALUES (?, ?, ?, 'Community report', NULL, ?, ?)`).bind(crypto.randomUUID(), title, message, new Date().toISOString(), Number(urgent)).run()
  return c.json({ submitted: true }, 201)
})
