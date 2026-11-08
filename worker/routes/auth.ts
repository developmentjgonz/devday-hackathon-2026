import { Hono } from 'hono'
import { localSignInSchema, signUpSchema } from '../../shared/schemas/auth.ts'
import type { SignInOptions } from '../../shared/types/auth.ts'
import type { AppEnv } from '../types.ts'
import { listLocalUsers } from '../db/accounts.ts'
import { localSignInEnabled, requireLocalSignIn, requireSameOrigin } from '../middleware/auth.ts'
import { limitFormBody, requireJson, validateJson } from '../middleware/validation.ts'
import { signInLocalUser, signUpLocalUser } from '../services/accounts.ts'
import { createSession, endSession, getSessionUser } from '../services/session.ts'
import { signInGoogleUser } from '../db/google-identities.ts'
import { clearGoogleCookie, googleConfig, startGoogleSignIn, verifyGoogleCallback } from '../services/google-auth.ts'

export const authRoutes = new Hono<AppEnv>()

authRoutes.get('/session', async (c) => c.json({ user: await getSessionUser(c.req.raw, c.env.DB) }))

authRoutes.get('/options', async (c) => {
  const enabled = localSignInEnabled(c.req.raw, c.env)
  const options: SignInOptions = { localSignInEnabled: enabled, googleSignInEnabled: Boolean(googleConfig(c.env)), users: enabled ? await listLocalUsers(c.env.DB) : [] }
  return c.json(options)
})

authRoutes.get('/google/start', async (c) => {
  const config = googleConfig(c.env)
  if (!config) return c.redirect('/sign-in?google=unavailable', 302)
  const result = await startGoogleSignIn(c.req.raw, config)
  c.header('Set-Cookie', result.cookie)
  c.header('Referrer-Policy', 'no-referrer')
  return c.redirect(result.url, 302)
})

authRoutes.get('/google/callback', async (c) => {
  const config = googleConfig(c.env)
  c.header('Set-Cookie', clearGoogleCookie(c.req.raw), { append: true })
  c.header('Referrer-Policy', 'no-referrer')
  if (!config) return c.redirect('/sign-in?google=unavailable', 302)
  try {
    const identity = await verifyGoogleCallback(c.req.raw, config)
    const user = await signInGoogleUser(c.env.DB, identity, config.adminEmail)
    c.header('Set-Cookie', await createSession(c.req.raw, c.env.DB, user.id), { append: true })
    return c.redirect(user.status === 'active' ? '/app' : '/account-status', 302)
  } catch {
    return c.redirect('/sign-in?google=error', 302)
  }
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
