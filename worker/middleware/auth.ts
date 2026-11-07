import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'
import type { AppEnv, Bindings } from '../types.ts'
import { getSessionUser } from '../services/session.ts'

export function localSignInEnabled(request: Request, env: Bindings): boolean {
  const url = new URL(request.url)
  return env.LOCAL_TEST_SIGN_IN === 'true'
    && url.protocol === 'http:'
    && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)
}

export const requireLocalSignIn = createMiddleware<AppEnv>(async (c, next) => {
  if (!localSignInEnabled(c.req.raw, c.env)) throw new HTTPException(404, { message: 'Not found' })
  await next()
})

export const requireSameOrigin = createMiddleware<AppEnv>(async (c, next) => {
  // Vite and Wrangler use separate local ports. Do not trust forwarded headers.
  const expectedOrigin = c.env.APP_ORIGIN ?? new URL(c.req.url).origin
  if (c.req.header('Origin') !== expectedOrigin) {
    throw new HTTPException(403, { message: 'Request origin is not allowed' })
  }
  await next()
})

export const requireActiveUser = createMiddleware<AppEnv>(async (c, next) => {
  const user = await getSessionUser(c.req.raw, c.env.DB)
  if (!user) throw new HTTPException(401, { message: 'Sign in to continue' })
  if (user.status !== 'active') {
    throw new HTTPException(403, {
      message: user.status === 'pending' ? 'Your account is waiting for approval' : 'Your account is suspended',
    })
  }
  c.set('user', user)
  await next()
})
