import { publicMapData } from '@/data/demo-public-map'
import { sampleNews, sampleOpenings } from '@/features/community/data/sample-posts'
import type { PublicContent } from '../../../shared/types/public'

export const storyPublicContent: PublicContent = { areas: publicMapData.areas, openings: sampleOpenings, news: sampleNews }
