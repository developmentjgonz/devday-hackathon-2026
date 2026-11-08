import { useEffect, useRef, useState } from 'react'
import {
  Map as MapLibreMap,
  setWorkerUrl,
  type GeoJSONSource,
  type ExpressionSpecification,
} from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import 'maplibre-gl/dist/maplibre-gl.css'
import { CircleAlert, Plus, Minus } from 'lucide-react'
import { Button } from '../button'
import { LoadingIndicator } from '../loading-indicator'
import { Text } from '../typography'
import { Card } from '../card'
import { EmptyState } from '../empty-state'
import { areaCenter, type ColonyMapData, type MapInitialView } from './types'
import { createMapSources } from './data'
import { moveMapToSelection, type MapSelection } from './motion'

setWorkerUrl(workerUrl)

function applyTheme(map: MapLibreMap, element: HTMLElement) {
  const styles = getComputedStyle(element)
  const primary = styles.getPropertyValue('--primary').trim()
  const secondary = styles.getPropertyValue('--secondary').trim()
  const ink = styles.getPropertyValue('--foreground').trim()
  const success = styles.getPropertyValue('--success-foreground').trim()
  const error = styles.getPropertyValue('--destructive').trim()
  map.setPaintProperty('area-fill', 'fill-color', [
    'match',
    ['get', 'activity'],
    'high',
    primary,
    secondary,
  ])
  map.setPaintProperty('area-outline', 'line-color', ink)
  map.setPaintProperty('activity-heat', 'heatmap-color', [
    'interpolate',
    ['linear'],
    ['heatmap-density'],
    0,
    'rgba(255,146,10,0)',
    0.25,
    secondary,
    0.7,
    primary,
    1,
    primary,
  ])
  map.setPaintProperty('colony-points', 'circle-color', [
    'match',
    ['get', 'status'],
    'urgent',
    error,
    'needs-visit',
    primary,
    success,
  ])
  map.setPaintProperty(
    'colony-points',
    'circle-stroke-color',
    styles.getPropertyValue('--card').trim(),
  )
  map.setPaintProperty('selected-colony', 'circle-stroke-color', ink)
}

export default function MapCanvas({
  data,
  selection,
  onSelect,
  styleUrl,
  initialView,
}: {
  data: ColonyMapData
  selection: MapSelection | null
  onSelect: (id: string) => void
  styleUrl: string
  initialView?: MapInitialView
}) {
  const container = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const previousSelection = useRef<MapSelection | null>(null)
  const latest = useRef({ data, onSelect })
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [attempt, setAttempt] = useState(0)
  const [zoom, setZoom] = useState(0)
  const initialLng = initialView?.center[0]
  const initialLat = initialView?.center[1]
  const initialZoom = initialView?.zoom

  useEffect(() => {
    latest.current = { data, onSelect }
    const map = mapRef.current
    if (!map?.getSource('areas')) return
    const sources = createMapSources(data)
    for (const name of ['areas', 'heat', 'colonies'] as const) {
      const source = map.getSource(name) as GeoJSONSource
      void source.setData(sources[name]).catch(() => setStatus('error'))
    }
  }, [data, onSelect])

  useEffect(() => {
    const element = container.current
    if (!element) return
    let map: MapLibreMap | undefined
    let disposed = false
    let loaded = false
    let resize: ResizeObserver | undefined
    let theme: MutationObserver | undefined
    setStatus('loading')
    const timeout = window.setTimeout(() => {
      if (!loaded && !disposed) setStatus('error')
    }, 15000)

    try {
      map = new MapLibreMap({
        container: element,
        style: styleUrl,
        center:
          initialLng !== undefined && initialLat !== undefined
            ? [initialLng, initialLat]
            : [0, 0],
        zoom: initialZoom ?? 1,
        minZoom: 0,
        maxZoom: data.audience === 'public' ? 11 : 18,
        cooperativeGestures: true,
        dragRotate: false,
        touchPitch: false,
        renderWorldCopies: false,
        attributionControl: { compact: true },
      })
      mapRef.current = map
      map.touchZoomRotate.disableRotation()
      map.on('zoomend', () => { if (!disposed && map) setZoom(map.getZoom()) })
      map
        .getCanvas()
        .setAttribute(
          'aria-label',
          data.audience === 'public'
            ? 'Public area activity map. Use the area buttons below for keyboard selection.'
            : 'Team colony map. Use the colony buttons below for keyboard selection.',
        )
      map.on('error', () => {
        if (!loaded && !disposed) setStatus('error')
      })
      map.on('load', () => {
        if (disposed || !map) return
        loaded = true
        window.clearTimeout(timeout)
        const sources = createMapSources(latest.current.data)
        for (const name of ['areas', 'heat', 'colonies'] as const)
          map.addSource(name, { type: 'geojson', data: sources[name] })
        map.addLayer({
          id: 'area-fill',
          type: 'fill',
          source: 'areas',
          paint: { 'fill-color': '#ffd4df', 'fill-opacity': 0.18 },
        })
        map.addLayer({
          id: 'activity-heat',
          type: 'heatmap',
          source: 'heat',
          paint: {
            'heatmap-weight': [
              'match',
              ['get', 'activity'],
              'high',
              1,
              'medium',
              0.65,
              0.3,
            ],
            'heatmap-radius': [
              'interpolate',
              ['linear'],
              ['zoom'],
              8,
              24,
              11,
              95,
            ],
            'heatmap-intensity': 1.3,
            'heatmap-opacity': 0.7,
          },
        })
        map.addLayer({
          id: 'area-outline',
          type: 'line',
          source: 'areas',
          paint: {
            'line-width': 1.2,
            'line-opacity': 0.4,
            'line-dasharray': [3, 3],
          },
        })
        map.addLayer({
          id: 'colony-points',
          type: 'circle',
          source: 'colonies',
          paint: { 'circle-radius': 8, 'circle-stroke-width': 3 },
        })
        map.addLayer({
          id: 'selected-colony',
          type: 'circle',
          source: 'colonies',
          filter: ['==', ['get', 'id'], ''],
          paint: {
            'circle-radius': 14,
            'circle-color': 'rgba(0,0,0,0)',
            'circle-stroke-width': 2,
          },
        })
        applyTheme(map, element)
        const current = latest.current.data
        const positions =
          current.audience === 'public'
            ? current.areas.flatMap((area) => area.boundary.coordinates.flat())
            : current.colonies.map((colony) => colony.coordinates)
        if (
          positions.length &&
          initialLng === undefined &&
          initialLat === undefined
        ) {
          const lngs = positions.map((point) => point[0])
          const lats = positions.map((point) => point[1])
          map.fitBounds(
            [
              [Math.min(...lngs), Math.min(...lats)],
              [Math.max(...lngs), Math.max(...lats)],
            ],
            {
              padding: 55,
              duration: 0,
              maxZoom: current.audience === 'public' ? 10.5 : 12,
            },
          )
        }
        for (const layer of ['area-fill', 'colony-points']) {
          map.on('click', layer, (event) => {
            const id = event.features?.[0]?.properties?.id
            if (typeof id === 'string') latest.current.onSelect(id)
          })
          map.on('mouseenter', layer, () => {
            if (map) map.getCanvas().style.cursor = 'pointer'
          })
          map.on('mouseleave', layer, () => {
            if (map) map.getCanvas().style.cursor = ''
          })
        }
        theme = new MutationObserver(() => {
          if (map && !disposed) applyTheme(map, element)
        })
        theme.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ['class'],
        })
        setStatus('ready')
        setZoom(map.getZoom())
      })
      resize = new ResizeObserver(() => map?.resize())
      resize.observe(element)
    } catch {
      setStatus('error')
    }

    return () => {
      disposed = true
      window.clearTimeout(timeout)
      resize?.disconnect()
      theme?.disconnect()
      map?.remove()
      mapRef.current = null
    }
  }, [data.audience, styleUrl, attempt, initialLng, initialLat, initialZoom])

  useEffect(() => {
    const map = mapRef.current
    const element = container.current
    if (status !== 'ready' || !map?.getLayer('selected-colony') || !element) return
    const selectedId = selection?.id ?? null
    map.setFilter('selected-colony', ['==', ['get', 'id'], selectedId ?? ''])
    const opacity: ExpressionSpecification = selectedId
      ? ['case', ['==', ['get', 'id'], selectedId], 0.32, 0.1]
      : ['literal', 0.18]
    map.setPaintProperty('area-fill', 'fill-opacity', opacity)
    const current =
      data.audience === 'public'
        ? data.areas.find((area) => area.id === selectedId)
        : data.colonies.find((colony) => colony.id === selectedId)
    const newSelection = selection !== previousSelection.current
    previousSelection.current = selection
    if (current && selection) {
      const rect = element.getBoundingClientRect()
      const visible = rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < window.innerHeight && rect.right > 0 && rect.left < window.innerWidth
      const styles = getComputedStyle(element)
      moveMapToSelection(map, 'boundary' in current ? areaCenter(current) : current.coordinates, {
        pointer: newSelection && selection.pointer,
        visible,
        reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        duration: styles.getPropertyValue('--duration-normal'),
        easing: styles.getPropertyValue('--ease-out'),
      })
    }
  }, [selection, data, status])

  return (
    <div className="relative h-full w-full" data-map-status={status}>
      <div ref={container} className="h-full w-full" />
      {status === 'ready' ? (
        <Card padding="none" role="group" aria-label="Map zoom" className="absolute top-3 right-3 w-fit">
          <Button variant="ghost" size="icon" aria-label="Zoom in" disabled={zoom >= (data.audience === 'public' ? 11 : 18)} onClick={() => mapRef.current?.zoomIn({ duration: 0 })}><Plus aria-hidden="true" /></Button>
          <Button variant="ghost" size="icon" aria-label="Zoom out" disabled={zoom <= 0} onClick={() => mapRef.current?.zoomOut({ duration: 0 })}><Minus aria-hidden="true" /></Button>
        </Card>
      ) : null}
      {status === 'loading' ? (
        <div
          role="status"
          className="absolute inset-0 flex items-center justify-center gap-3 bg-card/90"
        >
          <LoadingIndicator decorative />
          <Text size="small" tone="muted">Loading map…</Text>
        </div>
      ) : null}
      {status === 'error' ? (
        <div
          role="alert"
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-card/95 px-6 text-center"
        >
          <EmptyState tone="danger" title="Map background unavailable" description="Check your connection and retry. You can still use the location list below." icon={<CircleAlert />} action={<Button
            size="sm"
            variant="outline"
            onClick={() => setAttempt((previous) => previous + 1)}
          >
            Retry map
          </Button>} />
        </div>
      ) : null}
    </div>
  )
}
