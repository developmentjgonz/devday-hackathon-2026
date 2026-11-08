/// <reference types="google.maps" />
import { useEffect, useRef, useState } from 'react'
import { CircleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { LoadingIndicator } from '@/components/ui/loading-indicator'
import { Text } from '@/components/ui/typography'
import { googleLibrary } from '@/lib/google-maps'
import type { TeamMapColony } from './types'

type Point = google.maps.LatLngLiteral
type GoogleMapProps = {
  colonies?: readonly TeamMapColony[]
  selectedColony?: string
  onSelectColony?: (id: string) => void
  selectedPoint?: Point | null
  centerVersion?: number
  onPick?: (point: Point) => void
  initialCenter?: Point
  initialZoom?: number
  animateSelection?: boolean
}
export default function GoogleMap({ colonies = [], selectedColony, onSelectColony, selectedPoint, centerVersion = 0, onPick, initialCenter, initialZoom, animateSelection = false }: GoogleMapProps) {
  const element = useRef<HTMLDivElement>(null)
  const map = useRef<google.maps.Map | null>(null)
  const markers = useRef<google.maps.marker.AdvancedMarkerElement[]>([])
  const markerLibrary = useRef<google.maps.MarkerLibrary | null>(null)
  const callbacks = useRef({ onPick, onSelectColony })
  const lastCenterVersion = useRef(centerVersion)
  const firstColony = colonies[0]?.coordinates
  const initial = useRef({ center: selectedPoint ?? initialCenter ?? (firstColony ? { lng: firstColony[0], lat: firstColony[1] } : { lat: 25.79, lng: -80.24 }), zoom: initialZoom ?? (selectedPoint ? 15 : 11), fit: !initialCenter })
  const lastFittedPositions = useRef('')
  const positions = JSON.stringify(colonies.map(({ id, coordinates }) => [id, ...coordinates]))
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [attempt, setAttempt] = useState(0)
  const [themeVersion, setThemeVersion] = useState(0)
  const selectableColonies = Boolean(onSelectColony)
  callbacks.current = { onPick, onSelectColony }

  useEffect(() => {
    const observer = new MutationObserver(() => setThemeVersion((value) => value + 1))
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const target = element.current
    if (!target) return
    let disposed = false
    let failed = false
    let clickListener: google.maps.MapsEventListener | undefined
    let tilesListener: google.maps.MapsEventListener | undefined
    lastFittedPositions.current = ''
    setStatus('loading')
    const fail = () => { failed = true; if (!disposed) setStatus('error') }
    const timeout = window.setTimeout(fail, 20000)
    const googleWindow = window as Window & { gm_authFailure?: () => void }
    const previousAuthFailure = googleWindow.gm_authFailure
    const authFailure = () => { previousAuthFailure?.(); fail() }
    googleWindow.gm_authFailure = authFailure

    async function start() {
      try {
        const [maps, marker] = await Promise.all([googleLibrary('maps'), googleLibrary('marker')])
        if (disposed || !target) return
        markerLibrary.current = marker
        const instance = new maps.Map(target, {
          center: initial.current.center,
          zoom: initial.current.zoom,
          mapId: 'DEMO_MAP_ID',
          gestureHandling: 'cooperative',
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          maxZoom: 18,
        })
        map.current = instance
        clickListener = instance.addListener('click', (event: google.maps.MapMouseEvent) => {
          if (event.latLng && callbacks.current.onPick) { event.stop(); callbacks.current.onPick(event.latLng.toJSON()) }
        })
        tilesListener = instance.addListener('tilesloaded', () => {
          if (!disposed && !failed) { window.clearTimeout(timeout); setStatus('ready') }
        })
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
  }, [attempt])

  useEffect(() => {
    const instance = map.current
    if (!instance || status !== 'ready' || !initial.current.fit || !colonies.length || positions === lastFittedPositions.current) return
    lastFittedPositions.current = positions
    const bounds = new google.maps.LatLngBounds()
    colonies.forEach(({ coordinates: [lng, lat] }) => bounds.extend({ lat, lng }))
    instance.fitBounds(bounds, 48)
    const listener = google.maps.event.addListenerOnce(instance, 'idle', () => {
      if ((instance.getZoom() ?? 0) > 12) instance.setZoom(12)
    })
    return () => listener.remove()
  }, [colonies, positions, status])

  useEffect(() => {
    const instance = map.current
    const library = markerLibrary.current
    const target = element.current
    if (!instance || !library || !target || status !== 'ready') return
    const styles = getComputedStyle(target)
    const color = (token: string, fallback: string) => styles.getPropertyValue(token).trim() || fallback
    const surface = color('--card', '#ffffff')
    markers.current.forEach((marker) => { marker.map = null })
    markers.current = colonies.map((colony) => {
      const background = colony.status === 'urgent' || colony.status === 'urgent-report' ? color('--destructive', '#c23b42')
        : colony.status === 'needs-visit' ? color('--primary', '#d97706') : colony.status === 'unknown' ? color('--muted-foreground', '#6b7280') : color('--success-foreground', '#16805a')
      const pin = new library.PinElement({ background, borderColor: surface, glyphColor: surface, scale: selectedColony === colony.id ? 1.25 : 1 })
      const marker = new library.AdvancedMarkerElement({
        map: instance,
        position: { lng: colony.coordinates[0], lat: colony.coordinates[1] },
        title: colony.name,
        gmpClickable: selectableColonies,
      })
      marker.append(pin)
      if (selectableColonies) marker.addEventListener('gmp-click', () => callbacks.current.onSelectColony?.(colony.id))
      return marker
    })
    if (selectedPoint) {
      markers.current.push(new library.AdvancedMarkerElement({ map: instance, position: selectedPoint, title: 'Selected location' }))
    }
    return () => {
      markers.current.forEach((marker) => { marker.map = null })
      markers.current = []
    }
  }, [colonies, selectedColony, selectedPoint, status, selectableColonies, themeVersion])

  useEffect(() => {
    const selected = colonies.find((colony) => colony.id === selectedColony)
    if (!selected || !map.current || status !== 'ready') return
    const point = { lng: selected.coordinates[0], lat: selected.coordinates[1] }
    const rect = element.current?.getBoundingClientRect()
    const visible = rect && rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < window.innerHeight && rect.right > 0 && rect.left < window.innerWidth
    if (!animateSelection || !visible || window.matchMedia('(prefers-reduced-motion: reduce)').matches) map.current.setCenter(point)
    else map.current.panTo(point)
  }, [colonies, selectedColony, animateSelection, status])

  useEffect(() => {
    if (!map.current || !selectedPoint || centerVersion === lastCenterVersion.current || status !== 'ready') return
    lastCenterVersion.current = centerVersion
    map.current.setCenter(selectedPoint)
    map.current.setZoom(16)
  }, [selectedPoint, centerVersion, status])

  return <div className="relative h-full w-full" data-google-map-status={status}>
    <div ref={element} className="h-full w-full" aria-label="Google map" />
    {status === 'loading' ? <div role="status" className="absolute inset-0 flex items-center justify-center gap-3 bg-card/90"><LoadingIndicator decorative /><Text size="small" tone="muted">Loading map…</Text></div> : null}
    {status === 'error' ? <div className="absolute inset-0 bg-card/95"><EmptyState role="alert" className="h-full" tone="danger" icon={<CircleAlert />} title="Map unavailable" description="Check your connection and try again." action={<Button type="button" variant="outline" size="sm" onClick={() => setAttempt((current) => current + 1)}>Retry map</Button>} /></div> : null}
  </div>
}
