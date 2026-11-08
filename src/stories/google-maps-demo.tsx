/// <reference types="google.maps" />
import { useEffect, useRef, useState } from 'react'
import { importLibrary, setOptions } from '@googlemaps/js-api-loader'
import { CircleAlert, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { LoadingIndicator } from '@/components/ui/loading-indicator'
import { RecordAvatar } from '@/components/ui/record-avatar'
import { RecordButton } from '@/components/ui/record-button'
import { Heading, Text } from '@/components/ui/typography'
import type { TeamMapColony } from '@/components/ui/map/types'
import { teamMapData } from './fixtures/team-map-data'

// This experiment is loaded only in local development. No Google data is saved.
const demoKey = import.meta.env.DEV ? import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() : ''
let configured = false

function configureGoogle() {
  if (!demoKey) throw new Error('No local demo key')
  if (!configured) {
    if (!window.google?.maps?.importLibrary) setOptions({ key: demoKey, v: 'weekly' })
    configured = true
  }
}

type Point = google.maps.LatLngLiteral
type GoogleMapProps = {
  colonies?: readonly TeamMapColony[]
  selectedColony?: string
  onSelectColony?: (id: string) => void
  selectedPoint?: Point | null
  centerVersion?: number
  onPick?: (point: Point) => void
}

function GoogleMap({ colonies = [], selectedColony, onSelectColony, selectedPoint, centerVersion = 0, onPick }: GoogleMapProps) {
  const element = useRef<HTMLDivElement>(null)
  const map = useRef<google.maps.Map | null>(null)
  const markers = useRef<google.maps.marker.AdvancedMarkerElement[]>([])
  const markerLibrary = useRef<google.maps.MarkerLibrary | null>(null)
  const callbacks = useRef({ onPick, onSelectColony })
  const lastCenterVersion = useRef(centerVersion)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  callbacks.current = { onPick, onSelectColony }

  useEffect(() => {
    const target = element.current
    if (!target) return
    let disposed = false
    let failed = false
    let clickListener: google.maps.MapsEventListener | undefined
    let tilesListener: google.maps.MapsEventListener | undefined
    const fail = () => { failed = true; if (!disposed) setStatus('error') }
    const timeout = window.setTimeout(fail, 20000)
    const googleWindow = window as Window & { gm_authFailure?: () => void }
    const previousAuthFailure = googleWindow.gm_authFailure
    const authFailure = () => { previousAuthFailure?.(); fail() }
    googleWindow.gm_authFailure = authFailure

    async function start() {
      try {
        configureGoogle()
        const [maps, marker] = await Promise.all([importLibrary('maps'), importLibrary('marker')])
        if (disposed || !target) return
        markerLibrary.current = marker
        const instance = new maps.Map(target, {
          center: { lat: 25.79, lng: -80.24 },
          zoom: 11,
          mapId: 'DEMO_MAP_ID',
          gestureHandling: 'cooperative',
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          maxZoom: 18,
        })
        map.current = instance
        clickListener = instance.addListener('click', (event: google.maps.MapMouseEvent) => {
          if (event.latLng) callbacks.current.onPick?.(event.latLng.toJSON())
        })
        tilesListener = instance.addListener('tilesloaded', () => {
          if (!disposed && !failed) { window.clearTimeout(timeout); setStatus('ready') }
        })
        if (colonies.length) {
          const bounds = new google.maps.LatLngBounds()
          colonies.forEach(({ coordinates: [lng, lat] }) => bounds.extend({ lat, lng }))
          instance.fitBounds(bounds, 48)
        }
      } catch { fail() }
    }
    void start()
    return () => {
      disposed = true
      window.clearTimeout(timeout)
      clickListener?.remove()
      tilesListener?.remove()
      markers.current.forEach((marker) => { marker.map = null })
      markers.current = []
      markerLibrary.current = null
      map.current = null
      if (googleWindow.gm_authFailure === authFailure) googleWindow.gm_authFailure = previousAuthFailure
    }
  // Each story has a fixed set of sample colonies for its lifetime.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const instance = map.current
    const library = markerLibrary.current
    if (!instance || !library || status !== 'ready') return
    markers.current.forEach((marker) => { marker.map = null })
    markers.current = colonies.map((colony) => {
      const color = colony.status === 'urgent' || colony.status === 'urgent-report' ? '#c23b42'
        : colony.status === 'needs-visit' ? '#d97706' : colony.status === 'unknown' ? '#6b7280' : '#16805a'
      const pin = new library.PinElement({ background: color, borderColor: '#ffffff', glyphColor: '#ffffff', scale: selectedColony === colony.id ? 1.25 : 1 })
      const marker = new library.AdvancedMarkerElement({
        map: instance,
        position: { lng: colony.coordinates[0], lat: colony.coordinates[1] },
        title: colony.name,
        gmpClickable: true,
      })
      marker.append(pin)
      marker.addListener('click', () => callbacks.current.onSelectColony?.(colony.id))
      return marker
    })
    if (selectedPoint) {
      markers.current.push(new library.AdvancedMarkerElement({ map: instance, position: selectedPoint, title: 'Selected location' }))
    }
    return () => {
      markers.current.forEach((marker) => { marker.map = null })
      markers.current = []
    }
  }, [colonies, selectedColony, selectedPoint, status])

  useEffect(() => {
    const selected = colonies.find((colony) => colony.id === selectedColony)
    if (!selected || !map.current || status !== 'ready') return
    const point = { lng: selected.coordinates[0], lat: selected.coordinates[1] }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) map.current.setCenter(point)
    else map.current.panTo(point)
  }, [colonies, selectedColony, status])

  useEffect(() => {
    if (!map.current || !selectedPoint || centerVersion === lastCenterVersion.current || status !== 'ready') return
    lastCenterVersion.current = centerVersion
    map.current.setCenter(selectedPoint)
    map.current.setZoom(16)
  }, [selectedPoint, centerVersion, status])

  return <div className="relative h-full w-full" data-google-map-status={status}>
    <div ref={element} className="h-full w-full" aria-label="Google map" />
    {status === 'loading' ? <div role="status" className="absolute inset-0 flex items-center justify-center gap-3 bg-card/90"><LoadingIndicator decorative /><Text size="small" tone="muted">Loading map…</Text></div> : null}
    {status === 'error' ? <div className="absolute inset-0 bg-card/95"><EmptyState role="alert" className="h-full" tone="danger" icon={<CircleAlert />} title="Map unavailable" description="Check the demo key and connection, then reload the page." action={<Button variant="outline" size="sm" onClick={() => window.location.reload()}>Reload</Button>} /></div> : null}
  </div>
}

function GooglePlaceSearch({ onSelect, cancelVersion }: { onSelect: (point: Point) => void; cancelVersion: number }) {
  const host = useRef<HTMLDivElement>(null)
  const widgetRef = useRef<google.maps.places.PlaceAutocompleteElement | null>(null)
  const latest = useRef(onSelect)
  const request = useRef(0)
  const [error, setError] = useState(false)
  latest.current = onSelect

  useEffect(() => {
    request.current += 1
    if (cancelVersion && widgetRef.current) widgetRef.current.value = ''
  }, [cancelVersion])

  useEffect(() => {
    const target = host.current
    if (!target) return
    let disposed = false
    let widget: google.maps.places.PlaceAutocompleteElement | undefined
    let themeObserver: MutationObserver | undefined
    async function start() {
      try {
        configureGoogle()
        const { PlaceAutocompleteElement } = await importLibrary('places')
        if (disposed || !target) return
        widget = new PlaceAutocompleteElement()
        widgetRef.current = widget
        widget.placeholder = 'Search for an address or place'
        widget.setAttribute('aria-label', 'Search for an address or place')
        const updateTheme = () => { if (widget) widget.style.colorScheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light' }
        updateTheme()
        themeObserver = new MutationObserver(updateTheme)
        themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
        widget.addEventListener('gmp-select', async (event: google.maps.places.PlacePredictionSelectEvent) => {
          const current = ++request.current
          try {
            const place = event.placePrediction.toPlace()
            await place.fetchFields({ fields: ['location'] })
            if (disposed || current !== request.current) return
            if (!place.location) { setError(true); return }
            setError(false)
            latest.current(place.location.toJSON())
          } catch { if (!disposed && current === request.current) setError(true) }
        })
        widget.addEventListener('gmp-error', () => { if (!disposed) setError(true) })
        target.replaceChildren(widget)
      } catch { if (!disposed) setError(true) }
    }
    void start()
    return () => { disposed = true; request.current += 1; themeObserver?.disconnect(); widget?.remove(); widgetRef.current = null }
  }, [])

  return <div className="space-y-2">
    <div ref={host} />
    {error ? <EmptyState role="alert" tone="danger" icon={<CircleAlert />} title="Address search unavailable" description="Check the connection and try again." /> : null}
  </div>
}

const demoCats = [
  { name: 'Poppy', colonyId: 'demo-01' }, { name: 'Socks', colonyId: 'demo-01' },
  { name: 'Mango', colonyId: 'demo-02' }, { name: 'Pepper', colonyId: 'demo-03' },
  { name: 'Luna', colonyId: 'demo-04' },
]
const catMapColonies = teamMapData.colonies.map((colony) => ({ ...colony, catCount: demoCats.filter((cat) => cat.colonyId === colony.id).length }))

export function GoogleColonyMapDemo({ scope = 'colonies' }: { scope?: 'colonies' | 'cats' }) {
  const [selected, setSelected] = useState<string | undefined>()
  const colonies = scope === 'cats' ? catMapColonies : teamMapData.colonies
  return <Card render={<section />} padding="none" className="w-full max-w-4xl">
    <CardHeader><div><Heading level={2} size="card">{scope === 'cats' ? 'Cats by colony' : 'Colony map'}</Heading><Text size="caption" tone="muted">{scope === 'cats' ? 'Markers show colony locations, not individual cat sightings.' : 'Colony locations'}</Text></div></CardHeader>
    <div className="h-96"><GoogleMap colonies={colonies} selectedColony={selected} onSelectColony={setSelected} /></div>
    <CardFooter className="block space-y-3">
      <div aria-label="Map status legend" className="flex flex-wrap gap-x-4 gap-y-2">
        <Text render={<span />} size="caption" tone="muted" className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="size-2 rounded-full bg-success-foreground" />Routine care</Text>
        <Text render={<span />} size="caption" tone="muted" className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="size-2 rounded-full bg-primary" />Needs a visit</Text>
        <Text render={<span />} size="caption" tone="muted" className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="size-2 rounded-full bg-destructive" />Urgent care</Text>
      </div>
      <Heading level={3} size="label">Browse colonies</Heading>
      <ul className="grid gap-2 sm:grid-cols-2">{colonies.map((colony) => <li key={colony.id}><RecordButton className="w-full" selected={selected === colony.id} onClick={() => setSelected(colony.id)} title={colony.name} description={`${colony.catCount} ${colony.catCount === 1 ? 'cat' : 'cats'}`} /></li>)}</ul>
      {scope === 'cats' && selected ? <div className="space-y-2"><Heading level={3} size="compact">Cats in this colony</Heading><ul className="flex flex-wrap gap-4">{demoCats.filter((cat) => cat.colonyId === selected).map((cat) => <li key={cat.name} className="flex items-center gap-2"><RecordAvatar kind="cat" name={cat.name} size="sm" /><Text size="small">{cat.name}</Text></li>)}</ul></div> : null}
    </CardFooter>
  </Card>
}

export function GoogleLocationPickerDemo() {
  const [point, setPoint] = useState<Point | null>(null)
  const [centerVersion, setCenterVersion] = useState(0)
  const [cancelVersion, setCancelVersion] = useState(0)
  return <Card render={<section />} className="w-full max-w-2xl">
    <CardHeader><div><Heading level={2} size="card">Choose a location</Heading><Text size="small" tone="muted">Search for a place, then click the map to adjust the pin.</Text></div></CardHeader>
    <CardContent className="space-y-3">
      <GooglePlaceSearch cancelVersion={cancelVersion} onSelect={(next) => { setPoint(next); setCenterVersion((current) => current + 1) }} />
      <div className="h-96 overflow-hidden rounded-lg"><GoogleMap selectedPoint={point} centerVersion={centerVersion} onPick={(next) => { setCancelVersion((current) => current + 1); setPoint(next) }} /></div>
      {point ? <Text role="status" size="caption" tone="muted" className="flex items-center gap-1"><MapPin aria-hidden="true" className="size-4" />Location selected</Text> : null}
    </CardContent>
  </Card>
}
