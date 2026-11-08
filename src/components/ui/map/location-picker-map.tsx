import { useEffect, useRef, useState } from 'react'
import { Map as MapLibreMap, Marker, setWorkerUrl } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import 'maplibre-gl/dist/maplibre-gl.css'
import { CircleAlert, Minus, Plus } from 'lucide-react'
import type { Coordinates } from '../../../../shared/types/directory'
import { Button } from '../button'
import { Card } from '../card'
import { EmptyState } from '../empty-state'
import { LoadingIndicator } from '../loading-indicator'
import { Text } from '../typography'

setWorkerUrl(workerUrl)

export default function LocationPickerMap({ initialCenter, selected, onPick, centerRequest, disabled }: {
  initialCenter: Coordinates
  selected: Coordinates | null
  onPick: (coordinates: Coordinates) => void
  centerRequest: number
  disabled: boolean
}) {
  const container = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const marker = useRef<Marker | null>(null)
  const initial = useRef({ center: initialCenter, zoom: selected ? 15 : 11 })
  const latest = useRef({ onPick, disabled })
  const lastCenterRequest = useRef(centerRequest)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [attempt, setAttempt] = useState(0)
  latest.current = { onPick, disabled }

  useEffect(() => {
    const element = container.current
    if (!element) return
    let disposed = false
    let loaded = false
    let map: MapLibreMap | undefined
    let resize: ResizeObserver | undefined
    setStatus('loading')
    const timeout = window.setTimeout(() => { if (!loaded && !disposed) setStatus('error') }, 15000)
    try {
      map = new MapLibreMap({ container: element, style: 'https://tiles.openfreemap.org/styles/positron', center: initial.current.center, zoom: initial.current.zoom, minZoom: 0, maxZoom: 18, dragRotate: false, touchPitch: false, renderWorldCopies: false, attributionControl: { compact: true } })
      mapRef.current = map
      map.touchZoomRotate.disableRotation()
      map.getCanvas().setAttribute('aria-label', 'Location map. Choose coordinates using the fields below.')
      map.getCanvas().style.cursor = 'crosshair'
      map.on('click', (event) => {
        if (!latest.current.disabled) {
          const point = event.lngLat.wrap()
          latest.current.onPick([point.lng, point.lat])
        }
      })
      map.on('error', () => { if (!loaded && !disposed) setStatus('error') })
      map.on('load', () => { if (!disposed) { loaded = true; window.clearTimeout(timeout); setStatus('ready') } })
      resize = new ResizeObserver(() => map?.resize())
      resize.observe(element)
    } catch { setStatus('error') }
    return () => { disposed = true; window.clearTimeout(timeout); resize?.disconnect(); marker.current?.remove(); marker.current = null; map?.remove(); mapRef.current = null }
  }, [attempt])

  useEffect(() => {
    const map = mapRef.current
    const element = container.current
    if (!map || !element || status !== 'ready') return
    if (!selected) { marker.current?.remove(); marker.current = null; return }
    if (!marker.current) marker.current = new Marker({ color: getComputedStyle(element).getPropertyValue('--primary').trim() }).setLngLat(selected).addTo(map)
    else marker.current.setLngLat(selected)
    if (centerRequest !== lastCenterRequest.current) {
      lastCenterRequest.current = centerRequest
      map.jumpTo({ center: selected, zoom: Math.max(map.getZoom(), 14) })
    }
  }, [selected, centerRequest, status])

  return <div className="relative h-full w-full" data-location-map-status={status}>
    <div ref={container} className="h-full w-full" />
    {status === 'ready' ? <Card padding="none" role="group" aria-label="Map zoom" className="absolute top-3 right-3 w-fit">
      <Button type="button" variant="ghost" size="icon" aria-label="Zoom in" onClick={() => mapRef.current?.zoomIn({ duration: 0 })}><Plus aria-hidden="true" /></Button>
      <Button type="button" variant="ghost" size="icon" aria-label="Zoom out" onClick={() => mapRef.current?.zoomOut({ duration: 0 })}><Minus aria-hidden="true" /></Button>
    </Card> : null}
    {status === 'loading' ? <div role="status" className="absolute inset-0 flex items-center justify-center gap-3 bg-card/90"><LoadingIndicator decorative /><Text size="small" tone="muted">Loading map…</Text></div> : null}
    {status === 'error' ? <div className="absolute inset-0 bg-card/95"><EmptyState role="alert" className="h-full" tone="danger" icon={<CircleAlert />} title="Map background unavailable" description="Enter coordinates below or retry the map." action={<Button type="button" variant="outline" size="sm" onClick={() => setAttempt((current) => current + 1)}>Retry map</Button>} /></div> : null}
  </div>
}
