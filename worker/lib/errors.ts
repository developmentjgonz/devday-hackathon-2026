import type { ErrorHandler } from 'hono'
import { HTTPException } from 'hono/http-exception'
import type { AppEnv } from '../types.ts'

export const handleError: ErrorHandler<AppEnv> = (error, c) => {
  if (error instanceof HTTPException) {
    return c.json({ error: error.message }, error.status)
  }
  console.error('API request failed', { method: c.req.method, path: c.req.path, error })
  const message = c.req.path.startsWith('/api/directory') ? 'The directory is unavailable. Try again.'
    : c.req.path.startsWith('/api/public-content') ? 'Public content is unavailable. Try again.'
    : /^\/api\/(workspace-data|reports|tasks|attachments)(\/|$)/.test(c.req.path) ? 'The workspace is unavailable. Try again.' : 'Account service is unavailable. Try again.'
  return c.json({ error: message }, 503)
}
