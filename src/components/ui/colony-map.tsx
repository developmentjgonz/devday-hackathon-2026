import { lazy, Suspense, useEffect, useId, useRef, useState } from 'react'
import { CircleAlert, Layers, MapPin, ShieldCheck } from 'lucide-react'
import { cn } from 'cn'
import { Badge } from './badge'
import { Button } from './button'
import { LoadingIndicator } from './loading-indicator'
import { Heading } from './typography'
import type { ColonyMapData, MapInitialView } from './map/types'
import '@/styles/map.css'

export type {
  ColonyMapData,
  PublicMapArea,
  TeamMapColony,
  MapInitialView,
} from './map/types'
const MapCanvas = lazy(() => import('./map/map-canvas'))
const statusLabels = {
  routine: 'Routine care',
  'needs-visit': 'Needs a visit',
  urgent: 'Urgent care',
}

export type ColonyMapProps = {
  data: ColonyMapData
  title?: string
  state?: 'ready' | 'loading' | 'error'
  /** Supply an account's saved map view. Otherwise the map fits its data. */
  initialView?: MapInitialView
  snapshotLabel?: string
  onRetry?: () => void
  /** The default OpenFreeMap basemap needs network access but no API key. */
  mapStyleUrl?: string
  className?: string
}

function LoadingMap() {
  return (
    <div
      role="status"
      className="flex h-full min-h-80 flex-col items-center justify-center gap-3 bg-muted/30"
    >
      <LoadingIndicator decorative variant="paws" />
      <span className="text-sm text-muted-foreground">Loading map…</span>
    </div>
  )
}

/** Location access must be enforced by the API before constructing these props. */
export function ColonyMap({
  data,
  title = 'Colony map',
  state = 'ready',
  initialView,
  snapshotLabel,
  onRetry,
  mapStyleUrl = 'https://tiles.openfreemap.org/styles/positron',
  className,
}: ColonyMapProps) {
  const id = useId()
  const container = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const publicView = data.audience === 'public'
  const entries = data.audience === 'public' ? data.areas : data.colonies
  const selected = entries.find((entry) => entry.id === selectedId)
  const empty = entries.length === 0

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
    <section
      aria-labelledby={`${id}-title`}
      className={cn(
        'mews-colony-map w-full min-w-0 overflow-hidden rounded-surface border bg-card text-card-foreground',
        className,
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b px-5 py-4">
        <div>
          <Heading level={2} size="card" id={`${id}-title`}>
            {title}
          </Heading>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {publicView
              ? 'Area activity · Approximate locations'
              : 'Colony locations'}
          </p>
        </div>
        <Badge variant={publicView ? 'success' : 'secondary'}>
          {publicView ? (
            <ShieldCheck aria-hidden="true" />
          ) : (
            <MapPin aria-hidden="true" />
          )}
          {publicView ? 'Public areas' : 'Team view'}
        </Badge>
      </header>
      <div
        ref={container}
        className="relative h-96 min-w-0 overflow-hidden bg-muted/30"
        aria-label={
          publicView
            ? 'Map of broad colony activity areas'
            : 'Map of team colony locations'
        }
      >
        {state === 'loading' ? (
          <LoadingMap />
        ) : state === 'error' ? (
          <div
            role="alert"
            className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center"
          >
            <CircleAlert
              className="size-6 text-destructive"
              aria-hidden="true"
            />
            <p className="text-sm font-medium">Could not load the map</p>
            <p className="text-xs text-muted-foreground">
              The location list is still available below.
            </p>
            {onRetry ? (
              <Button variant="outline" size="sm" onClick={onRetry}>
                Retry map
              </Button>
            ) : null}
          </div>
        ) : empty ? (
          <div
            role="status"
            className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center"
          >
            <Layers
              className="size-7 text-muted-foreground"
              aria-hidden="true"
            />
            <p className="text-sm font-medium">
              {publicView ? 'No public areas to show' : 'No colonies to show'}
            </p>
            <p className="max-w-xs text-xs leading-5 text-muted-foreground">
              {publicView
                ? 'Areas will appear when an approved summary is available.'
                : 'Colony markers will appear when records are available.'}
            </p>
          </div>
        ) : visible ? (
          <Suspense fallback={<LoadingMap />}>
            <MapCanvas
              data={data}
              selectedId={selected?.id ?? null}
              onSelect={setSelectedId}
              styleUrl={mapStyleUrl}
              initialView={initialView}
            />
          </Suspense>
        ) : (
          <LoadingMap />
        )}
      </div>
      <div className="space-y-4 border-t p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          {publicView ? (
            <div
              className="flex items-center gap-2"
              aria-label="Area activity: low to high"
            >
              <span>Lower activity</span>
              <span
                aria-hidden="true"
                className="h-2 w-16 rounded-full"
                style={{
                  background:
                    'linear-gradient(to right, var(--secondary), var(--primary))',
                }}
              />
              <span>Higher</span>
            </div>
          ) : (
            <div
              className="flex flex-wrap items-center gap-x-4 gap-y-2"
              aria-label="Care status legend"
            >
              {(['routine', 'needs-visit', 'urgent'] as const).map((status) => (
                <span key={status} className="inline-flex items-center gap-1.5">
                  <span
                    aria-hidden="true"
                    className={cn(
                      'size-2 shrink-0 rounded-full',
                      status === 'urgent'
                        ? 'bg-destructive'
                        : status === 'needs-visit'
                          ? 'bg-primary'
                          : 'bg-success-foreground',
                    )}
                  />
                  {statusLabels[status]}
                </span>
              ))}
            </div>
          )}
          {snapshotLabel ? <span>{snapshotLabel}</span> : null}
        </div>
        {entries.length > 0 ? (
          <div>
            <h3 className="mb-2 text-xs font-semibold">
              {publicView ? 'Browse areas' : 'Browse colonies'}
            </h3>
            <ul className="grid gap-2 sm:grid-cols-2">
              {entries.map((entry) => (
                <li key={entry.id} className="min-w-0">
                  <button
                    type="button"
                    aria-pressed={selected?.id === entry.id}
                    onClick={() => setSelectedId(entry.id)}
                    className="flex min-h-14 w-full items-center justify-between gap-3 rounded-control border px-4 py-3 text-left outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring aria-pressed:border-ring aria-pressed:bg-secondary/40"
                  >
                    <span className="min-w-0">
                      <span className="block break-words font-heading text-base font-semibold">
                        {entry.name}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {'colonyCountBand' in entry
                          ? `${entry.colonyCountBand} colonies · ${entry.activity} activity`
                          : `${entry.catCount} cats · ${statusLabels[entry.status]}`}
                      </span>
                    </span>
                    {'boundary' in entry ? (
                      <Layers
                        className="size-4 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <p
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {selected ? `${selected.name} selected.` : ''}
        </p>
      </div>
    </section>
  )
}
