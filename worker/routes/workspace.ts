import { Hono } from 'hono'
import type { AppEnv } from '../types.ts'
import { requireActiveUser } from '../middleware/auth.ts'

export const workspaceRoutes = new Hono<AppEnv>()

workspaceRoutes.get('/', requireActiveUser, (c) => c.json({ user: c.get('user') }))
