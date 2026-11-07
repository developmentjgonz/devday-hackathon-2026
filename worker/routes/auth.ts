import { Hono } from 'hono'
import { localSignInSchema, signUpSchema } from '../../shared/schemas/auth.ts'
import type { SignInOptions } from '../../shared/types/auth.ts'
import type { AppEnv } from '../types.ts'
import { listLocalUsers } from '../db/accounts.ts'
import { localSignInEnabled, requireLocalSignIn, requireSameOrigin } from '../middleware/auth.ts'
import { limitFormBody, requireJson, validateJson } from '../middleware/validation.ts'
import { signInLocalUser, signUpLocalUser } from '../services/accounts.ts'
import { createSession, endSession, getSessionUser } from '../services/session.ts'

export const authRoutes = new Hono<AppEnv>()

authRoutes.get('/session', async (c) => c.json({ user: await getSessionUser(c.req.raw, c.env.DB) }))

authRoutes.get('/options', async (c) => {
  const enabled = localSignInEnabled(c.req.raw, c.env)
  const options: SignInOptions = { localSignInEnabled: enabled, users: enabled ? await listLocalUsers(c.env.DB) : [] }
  return c.json(options)
})

authRoutes.use('/local/*', requireLocalSignIn)

authRoutes.post('/local/sign-in', requireSameOrigin, requireJson, limitFormBody, validateJson(localSignInSchema), async (c) => {
  const user = await signInLocalUser(c.env.DB, c.req.valid('json').userId)
  c.header('Set-Cookie', await createSession(c.req.raw, c.env.DB, user.id))
  return c.json({ user })
})

authRoutes.post('/local/sign-up', requireSameOrigin, requireJson, limitFormBody, validateJson(signUpSchema), async (c) => {
  const user = await signUpLocalUser(c.env.DB, c.req.valid('json'))
  c.header('Set-Cookie', await createSession(c.req.raw, c.env.DB, user.id))
  return c.json({ user }, 201)
})

authRoutes.post('/sign-out', requireSameOrigin, async (c) => {
  c.header('Set-Cookie', await endSession(c.req.raw, c.env.DB))
  return c.json({ ok: true })
})
