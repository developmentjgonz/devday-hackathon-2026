import { Hono } from 'hono'
import { methodNotAllowed } from 'hono/method-not-allowed'
import type { AppEnv } from './types.ts'
import { handleError } from './lib/errors.ts'
import { authRoutes } from './routes/auth.ts'
import { healthRoutes } from './routes/health.ts'
import { workspaceRoutes } from './routes/workspace.ts'

const app = new Hono<AppEnv>()
const api = new Hono<AppEnv>()

api.use('*', async (c, next) => {
  c.header('Cache-Control', 'no-store')
  await next()
})
api.use('*', methodNotAllowed({
  app: api,
  onMethodNotAllowed: (c, methods) => c.json({ error: 'Method not allowed' }, 405, { Allow: methods.join(', ') }),
}))
api.route('/auth', authRoutes)
api.route('/health', healthRoutes)
api.route('/workspace', workspaceRoutes)
api.notFound((c) => c.json({ error: 'Not found' }, 404))

app.route('/api', api)
app.onError(handleError)
app.notFound((c) => {
  if (c.req.path === '/api' || c.req.path.startsWith('/api/')) {
    return c.json({ error: 'Not found' }, 404)
  }
  return c.env.ASSETS.fetch(c.req.raw)
})

export default app
