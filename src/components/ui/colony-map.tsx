import { lazy, Suspense, useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { CircleAlert, Layers } from 'lucide-react'
import { cn } from 'cn'
import { Button } from './button'
import { LoadingIndicator } from './loading-indicator'
import { Heading, Text } from './typography'
import { Card, CardHeader, CardFooter } from './card'
import { EmptyState } from './empty-state'
import { RecordButton } from './record-button'
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from './popover'
import type { ColonyMapData, MapInitialView } from './map/types'
import type { MapSelection } from './map/motion'

export type {
  ColonyMapData,
  PublicMapArea,
  TeamMapColony,
  MapInitialView,
} from './map/types'
const MapCanvas = lazy(() => import('./map/map-canvas'))
const GoogleMapCanvas = lazy(() => import('./map/google-map'))
const statusLabels = {
  routine: 'Routine care',
  'needs-visit': 'Needs a visit',
  urgent: 'Urgent care',
  'urgent-report': 'Urgent report to review',
  unknown: 'Care status not recorded',
}

export type ColonyMapProps = {
  data: ColonyMapData
  title?: string
  /** A compact map for a single saved location, without the directory list. */
  variant?: 'directory' | 'location'
  /** Fill the available height on large screens for a saved location. */
  height?: 'default' | 'fill'
  /** Google is available for team locations in the local demo. */
  provider?: 'default' | 'google'
  state?: 'ready' | 'loading' | 'error'
  /** Supply an account's saved map view. Otherwise the map fits its data. */
  initialView?: MapInitialView
  snapshotLabel?: string
  onRetry?: () => void
  /** The default OpenFreeMap basemap needs network access but no API key. */
  mapStyleUrl?: string
  /** Actions or details for the currently selected map entry. */
  renderSelection?: (id: string) => ReactNode
  /** Choose whether team locations appear below the map or in a compact picker. */
  browse?: 'list' | 'popover'
  /** Entries without a map position, available in the compact picker. */
  unmappedColonies?: readonly { id: string; name: string; catCount: number }[]
  onSelectColony?: (id: string) => void
  subtitle?: string
  className?: string
}

function LoadingMap() {
  return (
    <div
      role="status"
      className="flex h-full min-h-80 flex-col items-center justify-center gap-3 bg-muted/30"
    >
      <LoadingIndicator decorative />
      <Text size="small" tone="muted">Loading map…</Text>
    </div>
  )
}

/** Location access must be enforced by the API before constructing these props. */
export function ColonyMap({
  data,
  title = 'Colony map',
  variant = 'directory',
  height = 'default',
  provider = 'default',
  state = 'ready',
  initialView,
  snapshotLabel,
  onRetry,
  mapStyleUrl = 'https://tiles.openfreemap.org/styles/positron',
  renderSelection,
  browse = 'list',
  unmappedColonies = [],
  onSelectColony,
  subtitle,
  className,
}: ColonyMapProps) {
  const id = useId()
  const container = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [selection, setSelection] = useState<MapSelection | null>(null)
  const [areasOpen, setAreasOpen] = useState(false)
  const selectFromMap = useCallback((id: string) => { setSelection({ id, pointer: true }); onSelectColony?.(id) }, [onSelectColony])
  const clearSelection = useCallback(() => setSelection(null), [])
  const publicView = data.audience === 'public'
  const entries = data.audience === 'public' ? data.areas : data.colonies
  const selected = entries.find((entry) => entry.id === selection?.id)
  const empty = entries.length === 0
  const locationView = variant === 'location'

  useEffect(() => {
    if (!publicView || !selected || areasOpen) return
    const dismissOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') clearSelection()
    }
    window.addEventListener('keydown', dismissOnEscape)
    return () => window.removeEventListener('keydown', dismissOnEscape)
  }, [areasOpen, clearSelection, publicView, selected])

  useEffect(() => {
    const element = container.current
    if (!element || visible || state !== 'ready' || empty) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: '100px' },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [visible, state, empty])

  return (
    <Card
      render={<section />}
      padding="none"
      aria-label={locationView ? title : undefined}
      aria-labelledby={locationView ? undefined : `${id}-title`}
      className={cn(
        'mews-colony-map w-full min-w-0',
        locationView && height === 'fill' && 'lg:flex-1',
        className,
      )}
    >
      {!locationView ? <CardHeader className={publicView ? 'py-4' : 'py-6'}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <Heading level={2} size="card" id={`${id}-title`}>
              {title}
            </Heading>
            <Text size="caption" tone="muted" className="mt-1">
              {subtitle ?? (publicView
                ? 'Area activity · Approximate locations'
                : 'Colony locations')}
            </Text>
            {publicView && snapshotLabel ? <Text size="caption" tone="muted">{snapshotLabel}</Text> : null}
          </div>
          {publicView && data.areas.length > 0 ? (
            <Popover open={areasOpen} onOpenChange={setAreasOpen}>
              <PopoverTrigger render={<Button variant="outline" size="sm" />}>Browse areas</PopoverTrigger>
              <PopoverContent side="bottom" align="end">
                <div className="p-3"><PopoverTitle>Browse areas</PopoverTitle></div>
                <ul className="max-h-[min(20rem,60dvh)] space-y-1 overflow-y-auto">
                  {data.areas.map((area) => (
                    <li key={area.id}>
                      <RecordButton
                        className="w-full"
                        selected={selected?.id === area.id}
                        title={area.name}
                        description={`${area.colonyCountBand} colonies · ${area.activity} activity`}
                        onClick={(event) => {
                          setSelection({ id: area.id, pointer: event.detail > 0 })
                          setAreasOpen(false)
                        }}
                      />
                    </li>
                  ))}
                </ul>
              </PopoverContent>
            </Popover>
          ) : data.audience === 'team' && browse === 'popover' && (data.colonies.length || unmappedColonies.length) ? (
            <Popover open={areasOpen} onOpenChange={setAreasOpen}>
              <PopoverTrigger render={<Button variant="outline" size="sm" />}>Find colony</PopoverTrigger>
              <PopoverContent side="bottom" align="end">
                <div className="p-3"><PopoverTitle>Find colony</PopoverTitle></div>
                <ul className="max-h-[min(20rem,60dvh)] space-y-1 overflow-y-auto">
                  {[...data.colonies.map((entry) => ({ ...entry, description: `${entry.catCount} ${entry.catCount === 1 ? 'cat' : 'cats'} · ${statusLabels[entry.status]}` })),
                    ...unmappedColonies.map((entry) => ({ ...entry, description: `${entry.catCount} ${entry.catCount === 1 ? 'cat' : 'cats'} · No location` }))].map((entry) => <li key={entry.id}>
                    <RecordButton className="w-full" selected={selected?.id === entry.id} title={entry.name}
                      description={entry.description}
                      onClick={(event) => { setSelection({ id: entry.id, pointer: event.detail > 0 }); setAreasOpen(false); onSelectColony?.(entry.id) }} />
                  </li>)}
                </ul>
              </PopoverContent>
            </Popover>
          ) : null}
        </div>
      </CardHeader> : null}
      <div
        ref={container}
        role="group"
        className={cn('relative min-w-0 overflow-hidden bg-muted/30', locationView ? height === 'fill' ? 'h-64 sm:h-72 lg:h-auto lg:min-h-72 lg:flex-1' : 'h-64 sm:h-72' : publicView ? 'h-72 sm:h-80' : 'h-96')}
        aria-label={
          publicView
            ? 'Map of broad colony activity areas'
            : 'Map of team colony locations'
        }
      >
        {state === 'loading' ? (
          <LoadingMap />
        ) : state === 'error' ? (
          <EmptyState role="alert" tone="danger" className="h-full" icon={<CircleAlert />} title="Could not load the map" description={locationView ? 'The location is still available below.' : publicView ? 'Try again to load the map.' : browse === 'popover' ? 'You can still use Find colony.' : 'The location list is still available below.'} action={onRetry ? (
              <Button variant="outline" size="sm" onClick={onRetry}>
                Retry map
              </Button>
            ) : undefined} />
        ) : empty ? (
          <EmptyState role="status" className="h-full" icon={<Layers />} title={publicView ? 'No public areas to show' : 'No locations to show'} description={publicView
                ? 'Areas will appear when an approved summary is available.'
                : 'Colony locations will appear here when available.'} />
        ) : visible ? (
          <Suspense fallback={<LoadingMap />}>
            {provider === 'google' && data.audience === 'team' ? <GoogleMapCanvas
              key={locationView && initialView ? `${initialView.center[0]},${initialView.center[1]},${initialView.zoom}` : undefined}
              colonies={data.colonies}
              selectedColony={selected?.id}
              onSelectColony={locationView ? undefined : selectFromMap}
              animateSelection={Boolean(selection?.pointer)}
              initialCenter={initialView ? { lng: initialView.center[0], lat: initialView.center[1] } : undefined}
              initialZoom={initialView?.zoom}
            /> : <MapCanvas
              data={data}
              selection={selected ? selection : null}
              onSelect={selectFromMap}
              onClearSelection={clearSelection}
              styleUrl={mapStyleUrl}
              initialView={initialView}
              locationView={locationView}
              browse={browse}
              title={title}
              selectionContent={publicView && selected && renderSelection ? renderSelection(selected.id) : undefined}
            />}
          </Suspense>
        ) : (
          <LoadingMap />
        )}
      </div>
      {!locationView && data.audience === 'team' ? <CardFooter className="block space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div
            className="flex flex-wrap items-center gap-x-4 gap-y-2"
            aria-label="Map status legend"
          >
            {(['routine', 'needs-visit', 'urgent', 'urgent-report', 'unknown'] as const).filter((status) => data.colonies.some((colony) => colony.status === status)).map((status) => (
              <Text render={<span />} size="caption" tone="muted" key={status} className="inline-flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className={cn(
                    'size-2 shrink-0 rounded-full',
                    status === 'urgent' || status === 'urgent-report'
                      ? 'bg-destructive'
                      : status === 'needs-visit'
                        ? 'bg-primary'
                        : status === 'unknown' ? 'bg-muted-foreground' : 'bg-success-foreground',
                  )}
                />
                {statusLabels[status]}
              </Text>
            ))}
          </div>
          {snapshotLabel ? <Text render={<span />} size="caption" tone="muted">{snapshotLabel}</Text> : null}
        </div>
        {browse === 'list' && data.colonies.length > 0 ? (
          <div>
            <Heading level={3} size="label" className="mb-2">
              Browse colonies
            </Heading>
            <ul className="grid gap-2 sm:grid-cols-2">
              {data.colonies.map((entry) => (
                <li key={entry.id} className="min-w-0">
                  <RecordButton
                    selected={selected?.id === entry.id}
                    onClick={(event) => setSelection({ id: entry.id, pointer: event.detail > 0 })}
                    className="w-full"
                    title={entry.name}
                    description={`${entry.catCount} ${entry.catCount === 1 ? 'cat' : 'cats'} · ${statusLabels[entry.status]}`}
                  />
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {browse === 'list' && selected && renderSelection ? <div>{renderSelection(selected.id)}</div> : null}
      </CardFooter> : null}
      {!locationView ? <Text role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {selected ? `${selected.name} selected.${'colonyCountBand' in selected ? ` ${selected.colonyCountBand} colonies, ${selected.activity} activity.` : ''}` : ''}
      </Text> : null}
    </Card>
  )
}
