const endpoint = import.meta.env.VITE_GEOCODER_URL || 'https://photon.komoot.io/api'

/** Build a Photon-compatible search or reverse-geocoding URL. */
export function geocodingUrl(kind: 'search' | 'reverse'): URL {
  const url = new URL(endpoint)
  if (kind === 'reverse') {
    if (!/\/api\/?$/.test(url.pathname)) throw new Error('The address service does not support pin lookups')
    url.pathname = url.pathname.replace(/\/api\/?$/, '/reverse')
  }
  return url
}
