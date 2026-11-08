import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { localSignInSchema, profileSchema, signUpSchema } from '../../shared/schemas/auth.ts'
import type { SignInOptions } from '../../shared/types/auth.ts'
import type { AppEnv } from '../types.ts'
import { findDemoUser, findUserByEmail, listDemoUsers, listLocalUsers } from '../db/accounts.ts'
import { demoAccessEnabled } from '../db/demo-access.ts'
import { getUserPhoto, saveProfile } from '../db/user-profile.ts'
import { localSignInEnabled, requireActiveUser, requireLocalSignIn, requireSameOrigin } from '../middleware/auth.ts'
import { limitFormBody, limitProfileBody, requireJson, validateJson } from '../middleware/validation.ts'
import { signInLocalUser, signUpLocalUser } from '../services/accounts.ts'
import { createDemoSession, createSession, endSession, getSessionUser } from '../services/session.ts'
import { signInGoogleUser } from '../db/google-identities.ts'
import { clearGoogleCookie, googleConfig, startGoogleSignIn, verifyGoogleCallback } from '../services/google-auth.ts'

export const authRoutes = new Hono<AppEnv>()

authRoutes.get('/session', async (c) => c.json({ user: await getSessionUser(c.req.raw, c.env.DB) }))

authRoutes.patch('/profile', requireActiveUser, requireSameOrigin, requireJson, limitProfileBody, validateJson(profileSchema), async (c) => {
  const id = c.get('user').id
  const profile = c.req.valid('json')
  const existing = await findUserByEmail(c.env.DB, profile.email)
  if (existing && existing.id !== id) throw new HTTPException(409, { message: 'This email already belongs to another account.' })
  try {
    await saveProfile(c.env.DB, id, profile)
  } catch (error) {
    const conflicting = await findUserByEmail(c.env.DB, profile.email)
    if (conflicting && conflicting.id !== id) throw new HTTPException(409, { message: 'This email already belongs to another account.' })
    throw error
  }
  const user = await getSessionUser(c.req.raw, c.env.DB)
  if (!user) throw new HTTPException(401, { message: 'Sign in to continue' })
  return c.json({ user })
})

authRoutes.get('/photos/:id', requireActiveUser, async (c) => {
  const photo = await getUserPhoto(c.env.DB, c.req.param('id'))
  if (!photo) throw new HTTPException(404, { message: 'Photo not found.' })
  const bytes = Uint8Array.from(atob(photo.data), (character) => character.charCodeAt(0))
  return new Response(bytes, { headers: { 'Content-Type': photo.mimeType, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } })
})

authRoutes.get('/options', async (c) => {
  const enabled = localSignInEnabled(c.req.raw, c.env)
  const demo = new URL(c.req.url).protocol === 'https:' && await demoAccessEnabled(c.env.DB)
  const options: SignInOptions = { localSignInEnabled: enabled, demoSignInEnabled: demo, googleSignInEnabled: Boolean(googleConfig(c.env)), users: enabled ? await listLocalUsers(c.env.DB) : demo ? await listDemoUsers(c.env.DB) : [] }
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

authRoutes.post('/demo/sign-in', requireSameOrigin, requireJson, limitFormBody, validateJson(localSignInSchema), async (c) => {
  if (new URL(c.req.url).protocol !== 'https:' || !await demoAccessEnabled(c.env.DB)) throw new HTTPException(404, { message: 'Not found' })
  const user = await findDemoUser(c.env.DB, c.req.valid('json').userId)
  if (!user) throw new HTTPException(404, { message: 'Demo account was not found.' })
  c.header('Set-Cookie', await createDemoSession(c.req.raw, c.env.DB, user.id))
  return c.json({ user })
})

authRoutes.post('/sign-out', requireSameOrigin, async (c) => {
  c.header('Set-Cookie', await endSession(c.req.raw, c.env.DB))
  return c.json({ ok: true })
})
