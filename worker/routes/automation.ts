import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import type { AppEnv } from '../types.ts'
import { automationSnapshot, autopilotConfiguration } from '../db/automation.ts'
import { requireActiveUser, requireAdministrator, requireSameOrigin } from '../middleware/auth.ts'
import { reportAnalysisAllowed } from '../services/report-analysis.ts'
import { reviewAutomationProposal, runAutopilot } from '../services/autopilot.ts'

export const automationRoutes = new Hono<AppEnv>()
automationRoutes.use('*', requireActiveUser, requireAdministrator)
automationRoutes.get('/', async (c) => {
  const offset = Number(c.req.query('offset') ?? 0)
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > 100000) throw new HTTPException(400, { message: 'Invalid activity page.' })
  return c.json(await automationSnapshot(c.env.DB, offset))
})
automationRoutes.use('*', requireSameOrigin, async (c, next) => {
  if (!await reportAnalysisAllowed(c.req.raw, c.env, c.get('user').id)) throw new HTTPException(403, { message: 'Autopilot changes are not available for demo accounts.' })
  if (!(await autopilotConfiguration(c.env.DB)).settings.enabled) throw new HTTPException(409, { message: 'Enable autopilot in AI setup first.' })
  await next()
})
automationRoutes.post('/run', async (c) => {
  await runAutopilot(c.env)
  return c.json(await automationSnapshot(c.env.DB))
})
automationRoutes.post('/reviews/:id/:decision', async (c) => {
  const decision = c.req.param('decision')
  if (decision !== 'approve' && decision !== 'reject') throw new HTTPException(400, { message: 'Choose approve or reject.' })
  await reviewAutomationProposal(c.env, c.req.param('id'), c.get('user').id, decision === 'approve')
  return c.json(await automationSnapshot(c.env.DB))
})
