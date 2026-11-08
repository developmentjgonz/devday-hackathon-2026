import { lazy, Suspense, useEffect, useId, useRef, useState } from 'react'
import { CircleAlert, LocateFixed, Search } from 'lucide-react'
import type { Coordinates } from '../../../shared/types/directory'
import { addressLabel, addressResults } from '@/lib/address-search'
import { geocodingUrl } from '@/lib/geocoding-service'
import { AddressSearch } from './address-search'
import { Alert } from './alert'
import { Button } from './button'
import { Card } from './card'
import { EmptyState } from './empty-state'
import { Input } from './input'
import { Label } from './label'
import { LoadingIndicator } from './loading-indicator'
import { Text } from './typography'

const PickerMap = lazy(() => import('./map/location-picker-map'))

export type LocationDraft = { latitude: string; longitude: string; address: string }

export function locationDraft(coordinates?: Coordinates, address = ''): LocationDraft {
  return coordinates ? { longitude: String(coordinates[0]), latitude: String(coordinates[1]), address } : { longitude: '', latitude: '', address: '' }
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
  const addressId = useId()
  const errorId = useId()
  const [centerRequest, setCenterRequest] = useState(0)
  const [locating, setLocating] = useState(false)
  const [locationError, setLocationError] = useState('')
  const [findingAddress, setFindingAddress] = useState(false)
  const [addressError, setAddressError] = useState<'unavailable' | 'empty' | null>(null)
  const request = useRef(0)
  const locationPending = useRef(false)
  const addressRequest = useRef<AbortController | null>(null)
  const busyCallback = useRef(onLocatingChange)
  busyCallback.current = onLocatingChange
  const selected = locationCoordinates(value)
  const incomplete = !locationIsEmpty(value) && !selected

  useEffect(() => () => { request.current += 1; addressRequest.current?.abort(); addressRequest.current = null; busyCallback.current?.(false) }, [])

  function cancelAddressLookup() {
    if (!addressRequest.current) return
    addressRequest.current.abort()
    addressRequest.current = null
    setFindingAddress(false)
    onLocatingChange?.(locationPending.current)
  }

  function stopLocating() {
    request.current += 1
    locationPending.current = false
    setLocating(false)
    onLocatingChange?.(Boolean(addressRequest.current))
  }

  function choose(coordinates: Coordinates, center = false, address = '') {
    cancelAddressLookup()
    stopLocating()
    onChange({ longitude: String(Number(coordinates[0].toFixed(6))), latitude: String(Number(coordinates[1].toFixed(6))), address })
    setLocationError('')
    setAddressError(null)
    if (center) setCenterRequest((current) => current + 1)
  }
  function useCurrentLocation() {
    if (!navigator.geolocation) { setLocationError('Location is not available in this browser. Choose a point on the map.'); return }
    cancelAddressLookup()
    const currentRequest = ++request.current
    locationPending.current = true
    setLocating(true)
    onLocatingChange?.(true)
    setLocationError('')
    navigator.geolocation.getCurrentPosition(
      (position) => { if (request.current === currentRequest) choose([position.coords.longitude, position.coords.latitude], true) },
      () => { if (request.current === currentRequest) { stopLocating(); setLocationError('Could not get your location. Check your location settings or choose a point on the map.') } },
      { timeout: 10000, maximumAge: 0 },
    )
  }
  async function findNearbyAddress() {
    if (!selected || disabled || locating || findingAddress) return
    const controller = new AbortController()
    addressRequest.current = controller
    setFindingAddress(true); setAddressError(null); onLocatingChange?.(true)
    try {
      const url = geocodingUrl('reverse')
      url.searchParams.set('lon', String(selected[0]))
      url.searchParams.set('lat', String(selected[1]))
      url.searchParams.set('limit', '1')
      const response = await fetch(url, { signal: controller.signal, credentials: 'omit', referrerPolicy: 'no-referrer' })
      if (!response.ok) throw new Error('Address lookup unavailable')
      const [result] = addressResults(await response.json())
      if (!controller.signal.aborted) {
        if (result) onChange({ ...value, address: addressLabel(result) })
        else setAddressError('empty')
      }
    } catch {
      if (!controller.signal.aborted) setAddressError('unavailable')
    } finally {
      if (addressRequest.current === controller) { addressRequest.current = null; setFindingAddress(false); onLocatingChange?.(locationPending.current) }
    }
  }

  return <div className="space-y-3">
    <AddressSearch disabled={disabled} onSelect={(result) => choose(result.coordinates, true, addressLabel(result))} />
    <Text size="small" tone="muted">Click or tap the map to place a pin. You can also enter coordinates.</Text>
    <Card padding="none" className="h-72">
      <Suspense fallback={<div role="status" className="flex h-full items-center justify-center gap-3"><LoadingIndicator decorative /><Text size="small" tone="muted">Loading map…</Text></div>}>
        <PickerMap initialCenter={initialCenter} selected={selected} onPick={choose} centerRequest={centerRequest} disabled={disabled} />
      </Suspense>
    </Card>
    <Button type="button" variant="outline" size="sm" disabled={disabled} loading={locating} onClick={useCurrentLocation}><LocateFixed aria-hidden="true" />Use my location</Button>
    {locationError ? <Alert>{locationError}</Alert> : null}
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="grid gap-2"><Label htmlFor={latitudeId}>Latitude</Label><Input id={latitudeId} inputMode="decimal" value={value.latitude} disabled={disabled} aria-invalid={incomplete || undefined} aria-describedby={incomplete ? errorId : undefined} onChange={(event) => { cancelAddressLookup(); stopLocating(); setAddressError(null); onChange({ ...value, latitude: event.target.value, address: '' }) }} onBlur={() => setCenterRequest((current) => current + 1)} /></div>
      <div className="grid gap-2"><Label htmlFor={longitudeId}>Longitude</Label><Input id={longitudeId} inputMode="decimal" value={value.longitude} disabled={disabled} aria-invalid={incomplete || undefined} aria-describedby={incomplete ? errorId : undefined} onChange={(event) => { cancelAddressLookup(); stopLocating(); setAddressError(null); onChange({ ...value, longitude: event.target.value, address: '' }) }} onBlur={() => setCenterRequest((current) => current + 1)} /></div>
    </div>
    {incomplete ? <Text id={errorId} size="caption" tone="danger" role="status">Enter a latitude from -90 to 90 and a longitude from -180 to 180.</Text> : null}
    <div className="grid gap-2">
      <Label htmlFor={addressId}>Address or landmark (optional)</Label>
      <Input id={addressId} maxLength={500} value={value.address} disabled={disabled || !selected} onChange={(event) => { cancelAddressLookup(); stopLocating(); setAddressError(null); onChange({ ...value, address: event.target.value }) }} />
      <Text size="caption" tone="muted">Moving the pin clears the address. Check it before saving.</Text>
      <div><Button type="button" variant="outline" size="sm" disabled={disabled || !selected || locating} loading={findingAddress} onClick={() => void findNearbyAddress()}><Search aria-hidden="true" />Find nearby address</Button></div>
      {addressError ? <EmptyState role={addressError === 'unavailable' ? 'alert' : 'status'} tone={addressError === 'unavailable' ? 'danger' : 'default'} icon={addressError === 'unavailable' ? <CircleAlert /> : <Search />} title={addressError === 'unavailable' ? 'Address lookup unavailable' : 'No nearby address found'} description="You can enter an address or landmark above." /> : null}
    </div>
  </div>
}
