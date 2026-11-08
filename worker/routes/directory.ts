import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { colonyLocationSchema, createCatSchema, createColonySchema } from '../../shared/schemas/directory.ts'
import { getCatPhoto, insertColony, listDirectory, saveCat, updateColonyLocation } from '../db/directory.ts'
import { listRecordActivity } from '../db/record-activity.ts'
import { requireActiveUser, requireSameOrigin } from '../middleware/auth.ts'
import { limitCatBody, limitFormBody, requireJson, validateJson } from '../middleware/validation.ts'
import type { AppEnv } from '../types.ts'

export const directoryRoutes = new Hono<AppEnv>()
directoryRoutes.use('*', requireActiveUser)
directoryRoutes.get('/', async (c) => c.json(await listDirectory(c.env.DB)))
directoryRoutes.post('/colonies', requireSameOrigin, requireJson, limitFormBody, validateJson(createColonySchema), async (c) => {
  const { name, coordinates, address } = c.req.valid('json')
  const colony = await insertColony(c.env.DB, name, c.get('user'), coordinates, address)
  return c.json({ colony }, 201)
})
directoryRoutes.patch('/colonies/:id/location', requireSameOrigin, requireJson, limitFormBody, validateJson(colonyLocationSchema), async (c) => {
  const { coordinates, address } = c.req.valid('json')
  const colony = await updateColonyLocation(c.env.DB, c.req.param('id'), c.get('user'), coordinates, address)
  if (!colony) throw new HTTPException(404, { message: 'The colony was not found.' })
  return c.json({ colony })
})
directoryRoutes.post('/cats', requireSameOrigin, requireJson, limitCatBody, validateJson(createCatSchema), async (c) => {
  const cat = await saveCat(c.env.DB, c.req.valid('json'), c.get('user'))
  if (!cat) throw new HTTPException(404, { message: 'Choose an existing colony.' })
  return c.json({ cat }, 201)
})
directoryRoutes.patch('/cats/:id', requireSameOrigin, requireJson, limitCatBody, validateJson(createCatSchema), async (c) => {
  const cat = await saveCat(c.env.DB, c.req.valid('json'), c.get('user'), c.req.param('id'))
  if (!cat) throw new HTTPException(404, { message: 'The cat or colony was not found.' })
  return c.json({ cat })
})
directoryRoutes.get('/:kind{cats|colonies}/:id/activity', async (c) => {
  const type = c.req.param('kind') === 'cats' ? 'cat' : 'colony'
  const activity = await listRecordActivity(c.env.DB, type, c.req.param('id'))
  if (!activity) throw new HTTPException(404, { message: 'Record not found.' })
  return c.json({ activity })
})
directoryRoutes.get('/cats/:id/photo', async (c) => {
  const photo = await getCatPhoto(c.env.DB, c.req.param('id'))
  if (!photo) throw new HTTPException(404, { message: 'Photo not found.' })
  const binary = atob(photo.data)
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
  return new Response(bytes, { headers: { 'Content-Type': photo.mimeType, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } })
})
