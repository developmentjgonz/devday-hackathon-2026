import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { HTTPException } from 'hono/http-exception'
import { communityPostSchema, communityPostStatusSchema, communitySectionSchema } from '../../shared/schemas/community.ts'
import { createCommunityPost, createCommunitySection, readCommunityBoard, setCommunityPostPublished, updateCommunityPost, updateCommunitySection } from '../db/community.ts'
import { requireActiveUser, requireAdministrator, requireSameOrigin } from '../middleware/auth.ts'
import { requireJson, validateJson } from '../middleware/validation.ts'
import type { AppEnv } from '../types.ts'

export const communityRoutes = new Hono<AppEnv>()
const limitBoardBody = bodyLimit({ maxSize: 16 * 1024, onError: () => { throw new HTTPException(413, { message: 'Post details are too large.' }) } })
communityRoutes.use('*', requireActiveUser, requireAdministrator)
communityRoutes.get('/', async (c) => c.json(await readCommunityBoard(c.env.DB)))
communityRoutes.post('/sections', requireSameOrigin, requireJson, limitBoardBody, validateJson(communitySectionSchema), async (c) => {
  await createCommunitySection(c.env.DB, c.req.valid('json'))
  return c.json(await readCommunityBoard(c.env.DB), 201)
})
communityRoutes.patch('/sections/:id', requireSameOrigin, requireJson, limitBoardBody, validateJson(communitySectionSchema), async (c) => {
  await updateCommunitySection(c.env.DB, c.req.param('id'), c.req.valid('json'))
  return c.json(await readCommunityBoard(c.env.DB))
})
communityRoutes.post('/posts', requireSameOrigin, requireJson, limitBoardBody, validateJson(communityPostSchema), async (c) => {
  await createCommunityPost(c.env.DB, c.req.valid('json'))
  return c.json(await readCommunityBoard(c.env.DB), 201)
})
communityRoutes.patch('/posts/:id', requireSameOrigin, requireJson, limitBoardBody, validateJson(communityPostSchema), async (c) => {
  await updateCommunityPost(c.env.DB, c.req.param('id'), c.req.valid('json'))
  return c.json(await readCommunityBoard(c.env.DB))
})
communityRoutes.patch('/posts/:id/status', requireSameOrigin, requireJson, limitBoardBody, validateJson(communityPostStatusSchema), async (c) => {
  await setCommunityPostPublished(c.env.DB, c.req.param('id'), c.req.valid('json').published)
  return c.json(await readCommunityBoard(c.env.DB))
})
