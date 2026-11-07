import type { FeatureCollection, Point, Polygon } from 'geojson'
import { areaCenter, type ColonyMapData } from './types.ts'

export function createMapSources(data: ColonyMapData) {
  const areas: FeatureCollection<Polygon> = {
    type: 'FeatureCollection',
    features: [],
  }
  const heat: FeatureCollection<Point> = {
    type: 'FeatureCollection',
    features: [],
  }
  const colonies: FeatureCollection<Point> = {
    type: 'FeatureCollection',
    features: [],
  }

  if (data.audience === 'public') {
    for (const area of data.areas) {
      // An allowlist keeps extra metadata out of the rendering sources.
      const properties = { id: area.id, activity: area.activity }
      areas.features.push({
        type: 'Feature',
        geometry: area.boundary,
        properties,
      })
      heat.features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: areaCenter(area) },
        properties,
      })
    }
  } else {
    for (const colony of data.colonies) {
      colonies.features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: colony.coordinates },
        properties: { id: colony.id, status: colony.status },
      })
    }
  }
  return { areas, heat, colonies }
}
