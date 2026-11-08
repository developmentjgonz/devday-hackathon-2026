import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { colonyLocationSchema, createCatSchema, createColonySchema } from '../../shared/schemas/directory.ts'
import { getCatPhoto, insertColony, listDirectory, saveCat, updateColonyLocation } from '../db/directory.ts'
import { requireActiveUser, requireSameOrigin } from '../middleware/auth.ts'
import { limitCatBody, limitFormBody, requireJson, validateJson } from '../middleware/validation.ts'
import type { AppEnv } from '../types.ts'

export const directoryRoutes = new Hono<AppEnv>()
directoryRoutes.use('*', requireActiveUser)
directoryRoutes.get('/', async (c) => c.json(await listDirectory(c.env.DB)))
directoryRoutes.post('/colonies', requireSameOrigin, requireJson, limitFormBody, validateJson(createColonySchema), async (c) => {
  const { name, coordinates } = c.req.valid('json')
  const colony = await insertColony(c.env.DB, name, c.get('user').id, coordinates)
  return c.json({ colony }, 201)
})
directoryRoutes.patch('/colonies/:id/location', requireSameOrigin, requireJson, limitFormBody, validateJson(colonyLocationSchema), async (c) => {
  const colony = await updateColonyLocation(c.env.DB, c.req.param('id'), c.req.valid('json').coordinates)
  if (!colony) throw new HTTPException(404, { message: 'The colony was not found.' })
  return c.json({ colony })
})
directoryRoutes.post('/cats', requireSameOrigin, requireJson, limitCatBody, validateJson(createCatSchema), async (c) => {
  const cat = await saveCat(c.env.DB, c.req.valid('json'), c.get('user').id)
  if (!cat) throw new HTTPException(404, { message: 'Choose an existing colony.' })
  return c.json({ cat }, 201)
})
directoryRoutes.patch('/cats/:id', requireSameOrigin, requireJson, limitCatBody, validateJson(createCatSchema), async (c) => {
  const cat = await saveCat(c.env.DB, c.req.valid('json'), c.get('user').id, c.req.param('id'))
  if (!cat) throw new HTTPException(404, { message: 'The cat or colony was not found.' })
  return c.json({ cat })
})
directoryRoutes.get('/cats/:id/photo', async (c) => {
  const photo = await getCatPhoto(c.env.DB, c.req.param('id'))
  if (!photo) throw new HTTPException(404, { message: 'Photo not found.' })
  const binary = atob(photo.data)
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
  return new Response(bytes, { headers: { 'Content-Type': photo.mimeType, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } })
})
