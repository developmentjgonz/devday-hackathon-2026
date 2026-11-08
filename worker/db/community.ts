import { HTTPException } from 'hono/http-exception'
import type { CommunityBoard, CommunityPost, CommunitySection } from '../../shared/types/public.ts'
import type { CommunityPostInput, CommunitySectionInput } from '../../shared/schemas/community.ts'

export async function readCommunityBoard(db: D1Database, publishedOnly = false): Promise<CommunityBoard> {
  const [sections, posts] = await Promise.all([
    db.prepare('SELECT id, title, layout FROM community_sections ORDER BY position, id').all<CommunitySection>(),
    db.prepare(`SELECT id, section_id AS sectionId, title, description, area, schedule, published_date AS date, published FROM community_posts ${publishedOnly ? 'WHERE published = 1' : ''} ORDER BY position, id`).all<Omit<CommunityPost, 'published'> & { published: number }>(),
  ])
  return { sections: sections.results, posts: posts.results.map((post) => ({ ...post, published: Boolean(post.published) })) }
}

async function requireSection(db: D1Database, id: string) {
  if (!await db.prepare('SELECT id FROM community_sections WHERE id = ?').bind(id).first()) throw new HTTPException(404, { message: 'Section not found. Refresh the board and try again.' })
}

async function requirePost(db: D1Database, id: string) {
  if (!await db.prepare('SELECT id FROM community_posts WHERE id = ?').bind(id).first()) throw new HTTPException(404, { message: 'Post not found. Refresh the board and try again.' })
}

export async function createCommunitySection(db: D1Database, input: CommunitySectionInput) {
  await db.prepare('INSERT INTO community_sections (id, title, layout, position) SELECT ?, ?, ?, COALESCE(MAX(position), -1) + 1 FROM community_sections')
    .bind(crypto.randomUUID(), input.title, input.layout).run()
}

export async function updateCommunitySection(db: D1Database, id: string, input: CommunitySectionInput) {
  await requireSection(db, id)
  await db.prepare('UPDATE community_sections SET title = ?, layout = ? WHERE id = ?').bind(input.title, input.layout, id).run()
}

export async function createCommunityPost(db: D1Database, input: CommunityPostInput) {
  await requireSection(db, input.sectionId)
  await db.prepare('INSERT INTO community_posts (id, section_id, title, description, area, schedule, published_date, published, position) SELECT ?, ?, ?, ?, ?, ?, ?, 1, COALESCE(MAX(position), -1) + 1 FROM community_posts')
    .bind(crypto.randomUUID(), input.sectionId, input.title, input.description, input.area, input.schedule, input.date).run()
}

export async function updateCommunityPost(db: D1Database, id: string, input: CommunityPostInput) {
  await requirePost(db, id)
  await requireSection(db, input.sectionId)
  await db.prepare('UPDATE community_posts SET section_id = ?, title = ?, description = ?, area = ?, schedule = ?, published_date = ? WHERE id = ?')
    .bind(input.sectionId, input.title, input.description, input.area, input.schedule, input.date, id).run()
}

export async function setCommunityPostPublished(db: D1Database, id: string, published: boolean) {
  await requirePost(db, id)
  await db.prepare('UPDATE community_posts SET published = ? WHERE id = ?').bind(Number(published), id).run()
}
