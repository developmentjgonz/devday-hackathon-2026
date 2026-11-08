import type { Coordinates } from './types/directory.ts'

export type AddressResult = { label: string; detail: string; coordinates: Coordinates; areas?: string[]; bounds?: [number, number, number, number] }

export function addressLabel(result: AddressResult): string {
  return [result.label, result.detail].filter(Boolean).join(', ').slice(0, 500)
}

function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function field(value: unknown): string {
  return typeof value === 'string' ? value.trim().slice(0, 160) : ''
}

/** Convert Photon GeoJSON to the short labels shown in the picker. */
export function addressResults(data: unknown): AddressResult[] {
  const collection = object(data)
  if (!Array.isArray(collection?.features)) throw new Error('Invalid address search response')
  return collection.features.flatMap((feature: unknown): AddressResult[] => {
    const item = object(feature)
    const properties = object(item?.properties)
    const geometry = object(item?.geometry)
    const coordinates = geometry?.coordinates
    if (geometry?.type !== 'Point' || !Array.isArray(coordinates) || coordinates.length < 2) return []
    const [longitude, latitude] = coordinates
    if (typeof longitude !== 'number' || typeof latitude !== 'number' || !Number.isFinite(longitude) || !Number.isFinite(latitude) || Math.abs(longitude) > 180 || Math.abs(latitude) > 90) return []
    const street = [field(properties?.housenumber), field(properties?.street)].filter(Boolean).join(' ')
    const city = field(properties?.city) || field(properties?.locality) || field(properties?.district)
    const label = field(properties?.name) || street || city || field(properties?.country)
    if (!label) return []
    const seen = new Set([label.toLocaleLowerCase()])
    const detail = [street, city, field(properties?.state), field(properties?.postcode), field(properties?.country)]
      .filter((part) => { const key = part.toLocaleLowerCase(); if (!part || seen.has(key)) return false; seen.add(key); return true })
      .join(', ')
    const extent = properties?.extent
    const bounds = Array.isArray(extent) && extent.length === 4 && extent.every((value) => typeof value === 'number' && Number.isFinite(value))
      && extent[0] >= -180 && extent[2] <= 180 && extent[0] < extent[2] && extent[3] >= -90 && extent[1] <= 90 && extent[3] < extent[1]
      ? [extent[0], extent[3], extent[2], extent[1]] as [number, number, number, number] : undefined
    const areas = [...new Set(['city', 'locality', 'district', 'county', 'state', 'country'].map((key) => field(properties?.[key])).filter(Boolean))]
    return [{ label, detail, coordinates: [longitude, latitude], ...(areas.length ? { areas } : {}), ...(bounds ? { bounds } : {}) }]
  }).slice(0, 5)
}
