/// <reference types="google.maps" />
import { useEffect, useId, useRef, useState } from 'react'
import { CircleAlert, Search } from 'lucide-react'
import { googleLibrary } from '@/lib/google-maps'
import { Button } from './button'
import { EmptyState } from './empty-state'
import { GoogleMapsAttribution } from './google-maps-attribution'
import { Input } from './input'
import { Label } from './label'
import { RecordButton } from './record-button'
import { Text } from './typography'

export type GooglePlaceSelection = { point: google.maps.LatLngLiteral; placeId: string; address: string }

/** Search on submit so typing does not consume the demo key's daily quota. */
export function GooglePlaceSearch({ onSelect, cancelVersion, disabled = false, onBusyChange }: { onSelect: (place: GooglePlaceSelection) => void; cancelVersion: number; disabled?: boolean; onBusyChange?: (busy: boolean) => void }) {
  const id = useId()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<google.maps.places.PlacePrediction[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [selecting, setSelecting] = useState<string | null>(null)
  const [error, setError] = useState(false)
  const request = useRef(0)
  const latestCancelVersion = useRef(cancelVersion)
  latestCancelVersion.current = cancelVersion
  const busyCallback = useRef(onBusyChange)
  busyCallback.current = onBusyChange

  useEffect(() => () => { request.current += 1; busyCallback.current?.(false) }, [])
  useEffect(() => {
    if (!cancelVersion) return
    request.current += 1
    setQuery(''); setResults(null); setSearching(false); setSelecting(null); setError(false)
    busyCallback.current?.(false)
  }, [cancelVersion])

  function updateQuery(value: string) {
    request.current += 1
    setQuery(value); setResults(null); setSearching(false); setSelecting(null); setError(false)
    busyCallback.current?.(false)
  }
  async function search() {
    const input = query.trim()
    if (!input || searching || selecting || disabled) return
    const current = ++request.current
    const version = cancelVersion
    setSearching(true); setResults(null); setError(false); busyCallback.current?.(true)
    try {
      const { AutocompleteSessionToken, AutocompleteSuggestion } = await googleLibrary('places')
      const sessionToken = new AutocompleteSessionToken()
      const response = await AutocompleteSuggestion.fetchAutocompleteSuggestions({ input, sessionToken })
      if (current === request.current && version === latestCancelVersion.current) setResults(response.suggestions.flatMap((item) => item.placePrediction ? [item.placePrediction] : []))
    } catch { if (current === request.current && version === latestCancelVersion.current) setError(true) }
    finally { if (current === request.current && version === latestCancelVersion.current) { setSearching(false); busyCallback.current?.(false) } }
  }
  async function select(prediction: google.maps.places.PlacePrediction) {
    if (searching || selecting || disabled) return
    const current = ++request.current
    const version = cancelVersion
    setSelecting(prediction.placeId); setError(false); busyCallback.current?.(true)
    try {
      const place = prediction.toPlace()
      await place.fetchFields({ fields: ['id', 'location', 'formattedAddress'] })
      if (current !== request.current || version !== latestCancelVersion.current) return
      if (!place.location || !place.id) { setError(true); return }
      setResults(null)
      onSelect({ point: place.location.toJSON(), placeId: place.id, address: place.formattedAddress ?? '' })
    } catch { if (current === request.current && version === latestCancelVersion.current) setError(true) }
    finally { if (current === request.current && version === latestCancelVersion.current) { setSelecting(null); busyCallback.current?.(false) } }
  }

  return <div className="space-y-2">
    <Label htmlFor={id}>Search for an address or place</Label>
    <div className="flex items-start gap-2">
      <Input id={id} type="search" maxLength={200} placeholder="Street address, city…" value={query} disabled={disabled} onChange={(event) => updateQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.nativeEvent.isComposing) { event.preventDefault(); void search() } }} />
      <Button type="button" variant="outline" loading={searching} disabled={disabled || Boolean(selecting) || !query.trim()} onClick={() => void search()}><Search aria-hidden="true" />Search</Button>
    </div>
    {error ? <EmptyState role="alert" tone="danger" icon={<CircleAlert />} title="Address search unavailable" description="Try again later, or place a pin on the map." /> : null}
    {results && !results.length ? <EmptyState role="status" icon={<Search />} title="No matching addresses" description="Try another address or include the city." /> : null}
    {results?.length ? <>
      <Text role="status" className="sr-only">{results.length} {results.length === 1 ? 'address' : 'addresses'} found.</Text>
      <ul aria-label="Address search results" className="grid max-h-56 gap-2 overflow-y-auto p-0">
        {results.map((prediction) => <li key={prediction.placeId}><RecordButton type="button" className="w-full" title={prediction.mainText?.toString() ?? prediction.text.toString()} description={prediction.secondaryText?.toString() ?? ''} disabled={disabled || Boolean(selecting && selecting !== prediction.placeId)} loading={selecting === prediction.placeId} onClick={() => void select(prediction)} /></li>)}
      </ul>
      <GoogleMapsAttribution />
    </> : null}
  </div>
}
