/// <reference types="google.maps" />
import { setOptions } from '@googlemaps/js-api-loader'

// The demo key is deliberately available only to local development builds.
const demoKey = import.meta.env.DEV ? import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() : ''
export const googleMapsEnabled = Boolean(demoKey) && import.meta.env.VITE_GOOGLE_MAPS_ENABLED === 'true'
let configured = false

export function configureGoogleMaps() {
  if (!demoKey && !window.google?.maps?.importLibrary) throw new Error('Google Maps is unavailable')
  if (!configured) {
    if (!window.google?.maps?.importLibrary) setOptions({ key: demoKey, v: 'weekly' })
    configured = true
  }
}

export async function googleLibrary<T extends keyof google.maps.ImportLibraryMap>(name: T) {
  configureGoogleMaps()
  return google.maps.importLibrary(name)
}
