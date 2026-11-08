/// <reference types="google.maps" />
import { useEffect, useState } from 'react'
import type { Coordinates } from '../../shared/types/directory'
import { googleLibrary } from './google-maps'

type PlaceDetails = { coordinates: Coordinates; address: string }
type PlaceState = { key: string; values: Record<string, PlaceDetails>; failed: string[]; loading: boolean }

/** Resolve only the places needed by the screen. Results remain in memory. */
export function useGooglePlaces(ids: readonly string[], enabled: boolean) {
  const key = JSON.stringify([...new Set(ids)].sort())
  const [state, setState] = useState<PlaceState>({ key: '', values: {}, failed: [], loading: false })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const requested = JSON.parse(key) as string[]
    let cancelled = false
    if (!requested.length) { setState({ key, values: {}, failed: [], loading: false }); return }
    if (!enabled) { setState({ key, values: {}, failed: requested, loading: false }); return }
    setState({ key, values: {}, failed: [], loading: true })
    async function load() {
      try {
        const { Place } = await googleLibrary('places')
        const results = await Promise.allSettled(requested.map(async (id) => {
          const place = new Place({ id })
          await place.fetchFields({ fields: ['location', 'formattedAddress'] })
          if (!place.location) throw new Error('Location unavailable')
          return { coordinates: [place.location.lng(), place.location.lat()] as Coordinates, address: place.formattedAddress ?? '' }
        }))
        if (cancelled) return
        const values: Record<string, PlaceDetails> = {}
        const failed: string[] = []
        results.forEach((result, index) => { if (result.status === 'fulfilled') values[requested[index]] = result.value; else failed.push(requested[index]) })
        setState({ key, values, failed, loading: false })
      } catch { if (!cancelled) setState({ key, values: {}, failed: requested, loading: false }) }
    }
    void load()
    return () => { cancelled = true }
  }, [key, enabled, attempt])

  const current = state.key === key ? state : { key, values: {}, failed: [], loading: ids.length > 0 }
  return { ...current, retry: () => setAttempt((value) => value + 1) }
}
