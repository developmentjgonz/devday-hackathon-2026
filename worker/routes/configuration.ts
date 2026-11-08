import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { bodyLimit } from 'hono/body-limit'
import { aiSchema, channelsSchema, demoAccessSchema } from '../../shared/schemas/configuration.ts'
import { hasOpenAiConfiguration, publicReportChatEnabled, readConfiguration, removeAiKey, saveAi, saveChannels } from '../db/configuration.ts'
import { setDemoAccess } from '../db/demo-access.ts'
import { configurationKey } from '../lib/configuration-secret.ts'
import { localSignInEnabled, requireActiveUser, requireAdministrator, requireSameOrigin } from '../middleware/auth.ts'
import { limitFormBody, requireJson, validateJson } from '../middleware/validation.ts'
import type { AppEnv } from '../types.ts'
import { reportAnalysisAllowed } from '../services/report-analysis.ts'

export const configurationRoutes = new Hono<AppEnv>()
configurationRoutes.use('*', requireActiveUser, requireAdministrator)

configurationRoutes.get('/', async (c) => c.json(await readConfiguration(c.env.DB, await configurationKey(c.env.CONFIG_ENCRYPTION_KEY))))
configurationRoutes.post('/demo-access', requireSameOrigin, requireJson, limitFormBody, validateJson(demoAccessSchema), async (c) => {
  await setDemoAccess(c.env.DB, c.req.valid('json').enabled)
  return c.json(await readConfiguration(c.env.DB, await configurationKey(c.env.CONFIG_ENCRYPTION_KEY)))
})
configurationRoutes.post('/channels', requireSameOrigin, requireJson, limitFormBody, validateJson(channelsSchema), async (c) => {
  if (c.req.valid('json').reportChatEnabled && !await publicReportChatEnabled(c.env.DB)) {
    if (!await hasOpenAiConfiguration(c.env.DB, await configurationKey(c.env.CONFIG_ENCRYPTION_KEY))) {
      throw new HTTPException(400, { message: 'Add an OpenAI key in AI analysis before enabling report chat.' })
    }
    if (!c.env.PUBLIC_CHAT_RATE_LIMITER || !c.env.PUBLIC_CHAT_TOTAL_LIMITER) {
      throw new HTTPException(503, { message: 'Report chat is unavailable. Ask the site operator for help.' })
    }
  }
  await saveChannels(c.env.DB, c.req.valid('json'))
  return c.json(await readConfiguration(c.env.DB, await configurationKey(c.env.CONFIG_ENCRYPTION_KEY)))
})
configurationRoutes.post('/ai', requireSameOrigin, requireJson, bodyLimit({ maxSize: 32 * 1024, onError: () => { throw new HTTPException(413, { message: 'AI settings are too large.' }) } }), validateJson(aiSchema), async (c) => {
  if (c.req.valid('json').autopilot?.enabled && !await reportAnalysisAllowed(c.req.raw, c.env, c.get('user').id)) {
    throw new HTTPException(403, { message: 'Autopilot is not available for demo accounts.' })
  }
  if (c.req.valid('json').apiKey && new URL(c.req.url).protocol !== 'https:' && !localSignInEnabled(c.req.raw, c.env)) {
    throw new HTTPException(400, { message: 'Use a secure connection to save an API key.' })
  }
  const key = await configurationKey(c.env.CONFIG_ENCRYPTION_KEY)
  await saveAi(c.env.DB, key, c.req.valid('json'), c.get('user').id)
  return c.json(await readConfiguration(c.env.DB, key))
})
configurationRoutes.post('/ai-key/remove', requireSameOrigin, async (c) => {
  await removeAiKey(c.env.DB)
  return c.json(await readConfiguration(c.env.DB, await configurationKey(c.env.CONFIG_ENCRYPTION_KEY)))
})
