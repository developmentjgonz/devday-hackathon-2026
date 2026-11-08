import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { userAccessChangeSchema } from '../../shared/schemas/users.ts'
import { changeUserAccess, findUser, listUsers } from '../db/users.ts'
import { hasDemoIdentity } from '../db/accounts.ts'
import { requireActiveUser, requireAdministrator, requireSameOrigin } from '../middleware/auth.ts'
import { limitFormBody, requireJson, validateJson } from '../middleware/validation.ts'
import type { AppEnv } from '../types.ts'

export const userRoutes = new Hono<AppEnv>()
userRoutes.use('*', requireActiveUser, requireAdministrator)
userRoutes.get('/', async (c) => c.json({ users: await listUsers(c.env.DB) }))
userRoutes.post('/:id/access', requireSameOrigin, requireJson, limitFormBody, validateJson(userAccessChangeSchema), async (c) => {
  const id = c.req.param('id')
  const actor = c.get('user')
  const change = c.req.valid('json')
  if (id === actor.id) throw new HTTPException(400, { message: 'You cannot change your own access.' })
  if (change.expectedStatus === 'pending' && (change.status !== 'active' || change.role !== 'member')) {
    throw new HTTPException(400, { message: 'Approve a request as a member first.' })
  }
  const user = await changeUserAccess(c.env.DB, id, actor.id, change)
  if (!user) {
    if (!await findUser(c.env.DB, id)) throw new HTTPException(404, { message: 'This account was not found.' })
    if (change.role === 'administrator' && await hasDemoIdentity(c.env.DB, id)) throw new HTTPException(400, { message: 'Demo accounts cannot be administrators.' })
    throw new HTTPException(409, { message: 'Access could not be changed. Refresh the team list and try again.' })
  }
  return c.json({ user })
})
