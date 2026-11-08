import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { openAiConfiguration } from '../db/configuration.ts'
import { configurationKey } from '../lib/configuration-secret.ts'
import { requireActiveUser, requireSameOrigin } from '../middleware/auth.ts'
import { analyzeReport, reportAnalysisAllowed } from '../services/report-analysis.ts'
import type { AppEnv } from '../types.ts'
import { analysisDuplicateCandidates } from '../db/duplicate-reports.ts'

export const reportAnalysisRoutes = new Hono<AppEnv>()

reportAnalysisRoutes.post('/reports/:id/analyze', requireActiveUser, requireSameOrigin, async (c) => {
  const user = c.get('user')
  if (!await reportAnalysisAllowed(c.req.raw, c.env, user.id)) throw new HTTPException(403, { message: 'Report analysis is not available for demo accounts.' })
  const report = await c.env.DB.prepare(`SELECT r.title, r.message, r.submitted_at AS submittedAt, COALESCE(co.name, '') AS colony, COALESCE(ca.name, '') AS cat
    FROM reports r LEFT JOIN colonies co ON co.id = r.colony_id LEFT JOIN cats ca ON ca.id = r.cat_id WHERE r.id = ?`)
    .bind(c.req.param('id')).first<{ title: string; message: string; submittedAt: string; colony: string; cat: string }>()
  if (!report) throw new HTTPException(404, { message: 'Report not found.' })
  const settings = await openAiConfiguration(c.env.DB, await configurationKey(c.env.CONFIG_ENCRYPTION_KEY))
  if (!c.env.AI_ANALYSIS_RATE_LIMITER) throw new HTTPException(503, { message: 'Report analysis is unavailable. Try again later.' })
  const { success } = await c.env.AI_ANALYSIS_RATE_LIMITER.limit({ key: 'workspace' })
  if (!success) throw new HTTPException(429, { message: 'Too many analysis requests. Try again in a minute.' })
  const id = c.req.param('id')
  const [tasks, candidates, attachments] = await Promise.all([
    c.env.DB.prepare('SELECT title FROM tasks WHERE report_id = ? ORDER BY created_at LIMIT 20').bind(id).all<{ title: string }>(),
    analysisDuplicateCandidates(c.env.DB, id),
    c.env.DB.prepare('SELECT storage_key AS key, name, mime_type AS mimeType, size FROM report_attachments WHERE report_id = ? ORDER BY rowid').bind(id).all<{ key: string; name: string; mimeType: string; size: number }>(),
  ])
  const suggestions = await analyzeReport(settings, { ...report, taskTitles: tasks.results.map((task) => task.title) }, candidates, c.env.UPLOADS, attachments.results)
  return c.json({ suggestions })
})
