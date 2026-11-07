import { Hono } from 'hono'
import type { AppEnv } from '../types.ts'

const service = 'devday-js-2026'
export const healthRoutes = new Hono<AppEnv>()

healthRoutes.get('/', async (c) => {
  try {
    const result = await c.env.DB.prepare('SELECT 1 AS ok').first<{ ok: number }>()
    if (result?.ok !== 1) return c.json({ ok: false, service, database: 'unavailable' }, 503)
    return c.json({ ok: true, service, database: 'connected' })
  } catch {
    return c.json({ ok: false, service, database: 'unavailable' }, 503)
  }
})
