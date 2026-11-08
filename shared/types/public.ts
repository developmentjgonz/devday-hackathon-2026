import type { Polygon } from 'geojson'

export type PublicArea = { id: string; name: string; boundary: Polygon; activity: 'low' | 'medium' | 'high'; colonyCountBand: string }
export type CommunityOpening = { id: string; title: string; area: string; schedule: string; description: string }
export type CommunityNews = { id: string; title: string; date: string; description: string }
export type PublicContent = { areas: PublicArea[]; openings: CommunityOpening[]; news: CommunityNews[] }
