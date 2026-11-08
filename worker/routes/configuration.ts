import { Hono } from 'hono'
import { z } from 'zod'
import { demoAccessEnabled, setDemoAccess } from '../db/demo-access.ts'
import { requireActiveUser, requireAdministrator, requireSameOrigin } from '../middleware/auth.ts'
import { limitFormBody, requireJson, validateJson } from '../middleware/validation.ts'
import type { AppEnv } from '../types.ts'

const demoAccessSchema = z.strictObject({ enabled: z.boolean() })
export const configurationRoutes = new Hono<AppEnv>()
configurationRoutes.use('*', requireActiveUser, requireAdministrator)
configurationRoutes.get('/', async (c) => c.json({ demoSignInEnabled: await demoAccessEnabled(c.env.DB) }))
configurationRoutes.post('/demo-access', requireSameOrigin, requireJson, limitFormBody, validateJson(demoAccessSchema), async (c) => {
  await setDemoAccess(c.env.DB, c.req.valid('json').enabled)
  return c.json({ demoSignInEnabled: await demoAccessEnabled(c.env.DB) })
})
