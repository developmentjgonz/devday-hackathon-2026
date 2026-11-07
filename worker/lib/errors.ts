import type { ErrorHandler } from 'hono'
import { HTTPException } from 'hono/http-exception'
import type { AppEnv } from '../types.ts'

export const handleError: ErrorHandler<AppEnv> = (error, c) => {
  if (error instanceof HTTPException) {
    return c.json({ error: error.message }, error.status)
  }
  console.error('API request failed', { method: c.req.method, path: c.req.path, error })
  return c.json({ error: 'Account service is unavailable. Try again.' }, 503)
}
