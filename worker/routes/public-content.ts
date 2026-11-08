import { Hono } from 'hono'
import type { PublicArea } from '../../shared/types/public.ts'
import type { AppEnv } from '../types.ts'
import { readCommunityBoard } from '../db/community.ts'

export const publicContentRoutes = new Hono<AppEnv>()
publicContentRoutes.get('/', async (c) => {
  const [areas, board] = await Promise.all([
    c.env.DB.prepare('SELECT id, name, boundary, activity, colony_count_band AS colonyCountBand FROM public_areas WHERE published = 1 ORDER BY position, id').all<Omit<PublicArea, 'boundary'> & { boundary: string }>(),
    readCommunityBoard(c.env.DB, true),
  ])
  return c.json({ areas: areas.results.map((area) => ({ ...area, boundary: JSON.parse(area.boundary) })), board })
})
