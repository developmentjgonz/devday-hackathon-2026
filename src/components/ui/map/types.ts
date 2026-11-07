import type { Polygon } from 'geojson'

export type PublicMapArea = {
  id: string
  name: string
  /** Broad area boundaries prepared by the server, never a colony position. */
  boundary: Polygon
  activity: 'low' | 'medium' | 'high'
  colonyCountBand: string
}

export type TeamMapColony = {
  id: string
  name: string
  coordinates: [longitude: number, latitude: number]
  status: 'routine' | 'needs-visit' | 'urgent'
  catCount: number
}

/** Public data has no field for individual colony coordinates or identifiers. */
export type ColonyMapData =
  | { audience: 'public'; areas: readonly PublicMapArea[] }
  | { audience: 'team'; colonies: readonly TeamMapColony[] }

export function areaCenter(area: PublicMapArea): [number, number] {
  const ring = area.boundary.coordinates[0].slice(0, -1)
  if (ring.length === 0) return [0, 0]
  return [
    ring.reduce((sum, point) => sum + point[0], 0) / ring.length,
    ring.reduce((sum, point) => sum + point[1], 0) / ring.length,
  ]
}

export type MapInitialView = {
  center: [longitude: number, latitude: number]
  zoom: number
}
