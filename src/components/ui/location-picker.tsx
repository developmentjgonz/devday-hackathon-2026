import { lazy, Suspense, useEffect, useId, useRef, useState } from 'react'
import { LocateFixed } from 'lucide-react'
import type { Coordinates } from '../../../shared/types/directory'
import { AddressSearch } from './address-search'
import { Alert } from './alert'
import { Button } from './button'
import { Card } from './card'
import { Input } from './input'
import { Label } from './label'
import { LoadingIndicator } from './loading-indicator'
import { Text } from './typography'

const PickerMap = lazy(() => import('./map/location-picker-map'))

export type LocationDraft = { latitude: string; longitude: string }

export function locationDraft(coordinates?: Coordinates): LocationDraft {
  return coordinates ? { longitude: String(coordinates[0]), latitude: String(coordinates[1]) } : { longitude: '', latitude: '' }
}

export function locationCoordinates(value: LocationDraft): Coordinates | null {
  if (!value.latitude.trim() || !value.longitude.trim()) return null
  const latitude = Number(value.latitude)
  const longitude = Number(value.longitude)
  return Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180
    ? [longitude, latitude] : null
}

export function locationIsEmpty(value: LocationDraft) {
  return !value.latitude.trim() && !value.longitude.trim()
}

/** A map pin and coordinate fields for choosing one location. */
export function LocationPicker({ value, onChange, initialCenter, disabled = false, onLocatingChange }: {
  value: LocationDraft
  onChange: (value: LocationDraft) => void
  initialCenter: Coordinates
  disabled?: boolean
  onLocatingChange?: (locating: boolean) => void
}) {
  const latitudeId = useId()
  const longitudeId = useId()
  const errorId = useId()
  const [centerRequest, setCenterRequest] = useState(0)
  const [locating, setLocating] = useState(false)
  const [locationError, setLocationError] = useState('')
  const request = useRef(0)
  const busyCallback = useRef(onLocatingChange)
  busyCallback.current = onLocatingChange
  const selected = locationCoordinates(value)
  const incomplete = !locationIsEmpty(value) && !selected

  useEffect(() => () => { request.current += 1; busyCallback.current?.(false) }, [])

  function stopLocating() {
    request.current += 1
    setLocating(false)
    onLocatingChange?.(false)
  }

  function choose(coordinates: Coordinates, center = false) {
    stopLocating()
    onChange({ longitude: String(Number(coordinates[0].toFixed(6))), latitude: String(Number(coordinates[1].toFixed(6))) })
    setLocationError('')
    if (center) setCenterRequest((current) => current + 1)
  }
  function useCurrentLocation() {
    if (!navigator.geolocation) { setLocationError('Location is not available in this browser. Choose a point on the map.'); return }
    const currentRequest = ++request.current
    setLocating(true)
    onLocatingChange?.(true)
    setLocationError('')
    navigator.geolocation.getCurrentPosition(
      (position) => { if (request.current === currentRequest) choose([position.coords.longitude, position.coords.latitude], true) },
      () => { if (request.current === currentRequest) { stopLocating(); setLocationError('Could not get your location. Check your location settings or choose a point on the map.') } },
      { timeout: 10000, maximumAge: 0 },
    )
  }

  return <div className="space-y-3">
    <AddressSearch disabled={disabled} onSelect={(result) => choose(result.coordinates, true)} />
    <Text size="small" tone="muted">Click or tap the map to place a pin. You can also enter coordinates.</Text>
    <Card padding="none" className="h-72">
      <Suspense fallback={<div role="status" className="flex h-full items-center justify-center gap-3"><LoadingIndicator decorative /><Text size="small" tone="muted">Loading map…</Text></div>}>
        <PickerMap initialCenter={initialCenter} selected={selected} onPick={choose} centerRequest={centerRequest} disabled={disabled} />
      </Suspense>
    </Card>
    <Button type="button" variant="outline" size="sm" disabled={disabled} loading={locating} onClick={useCurrentLocation}><LocateFixed aria-hidden="true" />Use my location</Button>
    {locationError ? <Alert>{locationError}</Alert> : null}
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="grid gap-2"><Label htmlFor={latitudeId}>Latitude</Label><Input id={latitudeId} inputMode="decimal" value={value.latitude} disabled={disabled} aria-invalid={incomplete || undefined} aria-describedby={incomplete ? errorId : undefined} onChange={(event) => { stopLocating(); onChange({ ...value, latitude: event.target.value }) }} onBlur={() => setCenterRequest((current) => current + 1)} /></div>
      <div className="grid gap-2"><Label htmlFor={longitudeId}>Longitude</Label><Input id={longitudeId} inputMode="decimal" value={value.longitude} disabled={disabled} aria-invalid={incomplete || undefined} aria-describedby={incomplete ? errorId : undefined} onChange={(event) => { stopLocating(); onChange({ ...value, longitude: event.target.value }) }} onBlur={() => setCenterRequest((current) => current + 1)} /></div>
    </div>
    {incomplete ? <Text id={errorId} size="caption" tone="danger" role="status">Enter a latitude from -90 to 90 and a longitude from -180 to 180.</Text> : null}
  </div>
}
