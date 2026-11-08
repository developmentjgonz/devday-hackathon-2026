import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { aiSchema, channelsSchema } from '../../shared/schemas/configuration.ts'
import { readConfiguration, removeAiKey, saveAi, saveChannels } from '../db/configuration.ts'
import { configurationKey } from '../lib/configuration-secret.ts'
import { localSignInEnabled, requireActiveUser, requireAdministrator, requireSameOrigin } from '../middleware/auth.ts'
import { limitFormBody, requireJson, validateJson } from '../middleware/validation.ts'
import type { AppEnv } from '../types.ts'

export const configurationRoutes = new Hono<AppEnv>()
configurationRoutes.use('*', requireActiveUser, requireAdministrator)

configurationRoutes.get('/', async (c) => c.json(await readConfiguration(c.env.DB, await configurationKey(c.env.CONFIG_ENCRYPTION_KEY))))
configurationRoutes.post('/channels', requireSameOrigin, requireJson, limitFormBody, validateJson(channelsSchema), async (c) => {
  await saveChannels(c.env.DB, c.req.valid('json'))
  return c.json(await readConfiguration(c.env.DB, await configurationKey(c.env.CONFIG_ENCRYPTION_KEY)))
})
configurationRoutes.post('/ai', requireSameOrigin, requireJson, limitFormBody, validateJson(aiSchema), async (c) => {
  if (c.req.valid('json').apiKey && new URL(c.req.url).protocol !== 'https:' && !localSignInEnabled(c.req.raw, c.env)) {
    throw new HTTPException(400, { message: 'Use a secure connection to save an API key.' })
  }
  const key = await configurationKey(c.env.CONFIG_ENCRYPTION_KEY)
  await saveAi(c.env.DB, key, c.req.valid('json'))
  return c.json(await readConfiguration(c.env.DB, key))
})
configurationRoutes.post('/ai-key/remove', requireSameOrigin, async (c) => {
  await removeAiKey(c.env.DB)
  return c.json(await readConfiguration(c.env.DB, await configurationKey(c.env.CONFIG_ENCRYPTION_KEY)))
})
