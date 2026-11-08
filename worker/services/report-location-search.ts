import { addressLabel, addressResults, type AddressResult } from '../../shared/address-search.ts'
import type { ChatCoordinates, ChatLocation, ChatPlace } from '../../shared/schemas/public-report-chat.ts'

const endpoint = 'https://photon.komoot.io/'
const areaName = (value: string) => value.toLocaleLowerCase().trim().replace(/^(city|town|village|borough) of /, '')
const words = (value: string) => value.normalize('NFKC').toLocaleLowerCase().replace(/['’‘ʼ]/g, '').match(/[\p{L}\p{N}]+/gu) ?? []

/** Photon can return fuzzy matches such as Domino One for Domino's. */
function matchesLandmark(query: string, result: AddressResult) {
  const actual = new Set(words(addressLabel(result)))
  const expected = words(query)
  return expected.length > 0 && expected.every((word) => actual.has(word))
}

function distance(a: ChatCoordinates, b: ChatCoordinates) {
  const radians = Math.PI / 180
  const latitude = (b.latitude - a.latitude) * radians
  const longitude = (b.longitude - a.longitude) * radians
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.sin(latitude / 2) ** 2
    + Math.cos(a.latitude * radians) * Math.cos(b.latitude * radians) * Math.sin(longitude / 2) ** 2)))
}

async function lookup(path: 'api' | 'reverse', params: Record<string, string>, signal: AbortSignal): Promise<AddressResult[]> {
  const url = new URL(path, endpoint)
  url.search = new URLSearchParams({ lang: 'en', ...params }).toString()
  const response = await fetch(url, { signal, headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error('Location search unavailable')
  return addressResults(await response.json())
}

/** Resolve the visitor's named area first, then keep landmark results inside it. */
export async function searchReportLocations(query: string, area: string, selected?: ChatLocation): Promise<ChatPlace[]> {
  const signal = AbortSignal.timeout(7000)
  const anchor = area ? (await lookup('api', { q: area, limit: '1' }, signal))[0] : undefined
  const center = anchor ? { longitude: anchor.coordinates[0], latitude: anchor.coordinates[1] } : selected
  // Never fall back to worldwide landmark results when the area cannot be found.
  if (!center) return []
  const radius = area ? 10 : 5
  const latitudeSpan = radius / 111
  const longitudeSpan = Math.min(180, latitudeSpan / Math.max(0.01, Math.cos(center.latitude * Math.PI / 180)))
  // A locality result can describe a small mapped footprint, not the town.
  // Treat bounds under 1 km across like a missing boundary and check locality.
  const areaBounds = anchor?.bounds && distance(
    { longitude: anchor.bounds[0], latitude: anchor.bounds[1] },
    { longitude: anchor.bounds[2], latitude: anchor.bounds[3] },
  ) >= 1 ? anchor.bounds : undefined
  const bounds = areaBounds ?? [Math.max(-180, center.longitude - longitudeSpan), Math.max(-90, center.latitude - latitudeSpan),
    Math.min(180, center.longitude + longitudeSpan), Math.min(90, center.latitude + latitudeSpan)]
  const params = {
    limit: '5', lat: String(center.latitude), lon: String(center.longitude), location_bias_scale: '0.1',
    bbox: bounds.join(','),
  }
  // The bounds already supply the area. Including the city in q can make Photon
  // return the city itself when the requested landmark does not exist there.
  // Photon can miss possessive names such as McDonald's with an apostrophe.
  // Keep the name as one word, including when the model adds an apostrophe.
  const searchQuery = query.replace(/['’‘ʼ]/g, '')
  const results = await lookup('api', { ...params, q: searchQuery }, signal)
  const seen = new Set<string>()
  return results.flatMap((result): ChatPlace[] => {
    if (!matchesLandmark(query, result)) return []
    const [longitude, latitude] = result.coordinates
    const label = addressLabel(result).slice(0, 200)
    const key = `${label.toLowerCase()}:${latitude.toFixed(5)}:${longitude.toFixed(5)}`
    // A nearby town is still the wrong town. Without provider bounds, require
    // its locality metadata to match the named area as well as the radius.
    if (anchor && !areaBounds && !result.areas?.some((name) => areaName(name) === areaName(anchor.label))) return []
    if (longitude < bounds[0]! || longitude > bounds[2]! || latitude < bounds[1]! || latitude > bounds[3]!
      || (!areaBounds && distance(center, { latitude, longitude }) > radius) || seen.has(key)) return []
    seen.add(key)
    return [{ label, title: result.label, description: result.detail, latitude, longitude }]
  }).slice(0, 3)
}

/** An address can describe a device pin, but must never move that pin. */
export async function describeCurrentLocation(point: ChatCoordinates): Promise<ChatPlace> {
  const coordinates = `${point.latitude.toFixed(6)}, ${point.longitude.toFixed(6)}`
  let nearby = ''
  try {
    const [result] = await lookup('reverse', { lat: String(point.latitude), lon: String(point.longitude), limit: '1', radius: '0.2' }, AbortSignal.timeout(4000))
    if (result && distance(point, { latitude: result.coordinates[1], longitude: result.coordinates[0] }) <= 0.2) nearby = addressLabel(result)
  } catch { /* A device pin is still usable when the address service is unavailable. */ }
  return {
    label: (nearby ? `Current location near ${nearby}` : `Current location (${coordinates})`).slice(0, 200),
    title: 'Your current location',
    description: `${nearby ? `Near ${nearby}. ` : `${coordinates}. `}${point.accuracy !== undefined ? `Approximate accuracy: ${Math.max(1, Math.round(point.accuracy))} m.` : ''}`.trim(),
    latitude: point.latitude, longitude: point.longitude,
  }
}
