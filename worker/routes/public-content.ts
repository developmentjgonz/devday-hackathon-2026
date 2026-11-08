import { Hono } from 'hono'
import type { PublicArea, CommunityOpening, CommunityNews } from '../../shared/types/public.ts'
import type { AppEnv } from '../types.ts'

export const publicContentRoutes = new Hono<AppEnv>()
publicContentRoutes.get('/', async (c) => {
  const [areas, openings, news] = await Promise.all([
    c.env.DB.prepare('SELECT id, name, boundary, activity, colony_count_band AS colonyCountBand FROM public_areas WHERE published = 1 ORDER BY position, id').all<Omit<PublicArea, 'boundary'> & { boundary: string }>(),
    c.env.DB.prepare("SELECT id, title, area, schedule, description FROM community_posts WHERE published = 1 AND kind = 'opening' ORDER BY position, id").all<CommunityOpening>(),
    c.env.DB.prepare("SELECT id, title, published_date AS date, description FROM community_posts WHERE published = 1 AND kind = 'news' ORDER BY position, id").all<CommunityNews>(),
  ])
  return c.json({ areas: areas.results.map((area) => ({ ...area, boundary: JSON.parse(area.boundary) })), openings: openings.results, news: news.results })
})
