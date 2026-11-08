import { Hono } from 'hono'
import { methodNotAllowed } from 'hono/method-not-allowed'
import type { AppEnv } from './types.ts'
import { handleError } from './lib/errors.ts'
import { authRoutes } from './routes/auth.ts'
import { healthRoutes } from './routes/health.ts'
import { workspaceRoutes } from './routes/workspace.ts'
import { directoryRoutes } from './routes/directory.ts'
import { workspaceDataRoutes } from './routes/workspace-data.ts'
import { userRoutes } from './routes/users.ts'
import { publicContentRoutes } from './routes/public-content.ts'
import { configurationRoutes } from './routes/configuration.ts'
import { publicReportRoutes } from './routes/public-reports.ts'

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
api.route('/directory', directoryRoutes)
api.route('/', workspaceDataRoutes)
api.route('/users', userRoutes)
api.route('/public-content', publicContentRoutes)
api.route('/public-reports', publicReportRoutes)
api.route('/configuration', configurationRoutes)
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
