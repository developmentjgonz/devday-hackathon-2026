import type { Polygon } from 'geojson'

export type PublicArea = { id: string; name: string; boundary: Polygon; activity: 'low' | 'medium' | 'high'; colonyCountBand: string }
export type CommunitySection = { id: string; title: string; layout: 'cards' | 'list' }
export type CommunityPost = { id: string; sectionId: string; title: string; description: string; area: string; schedule: string; date: string; published: boolean }
export type CommunityBoard = { sections: CommunitySection[]; posts: CommunityPost[] }
export type PublicContent = { areas: PublicArea[]; board: CommunityBoard }
