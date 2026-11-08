import { publicMapData } from '@/data/demo-public-map'
import { sampleNews, sampleOpenings } from '@/features/community/data/sample-posts'
import type { PublicContent } from '../../../shared/types/public'

export const storyPublicContent: PublicContent = { areas: publicMapData.areas, board: {
  sections: [
    { id: 'volunteer-openings', title: 'Volunteer openings', layout: 'cards' },
    { id: 'community-news', title: 'Community news', layout: 'list' },
  ],
  posts: [
    ...sampleOpenings.map((post) => ({ ...post, sectionId: 'volunteer-openings', date: '', published: true })),
    ...sampleNews.map(({ dateLabel: _, ...post }) => ({ ...post, sectionId: 'community-news', area: '', schedule: '', published: true })),
  ],
} }
