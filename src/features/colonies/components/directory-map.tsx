import { useCallback, useMemo, useRef, useState } from 'react'
import { CircleAlert } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ColonyMap, type ColonyMapData } from '@/components/ui/colony-map'
import { DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Drawer, DrawerBody, DrawerContent, DrawerHeader } from '@/components/ui/drawer'
import { EmptyState } from '@/components/ui/empty-state'
import { RecordAvatar } from '@/components/ui/record-avatar'
import { TextLink } from '@/components/ui/text-link'
import { Heading, Text } from '@/components/ui/typography'
import type { InboxCat, InboxColony, InboxReport } from '@/features/inbox/types'
import { useInbox } from '@/features/inbox/inbox-context'
import { useGooglePlaces } from '@/lib/use-google-places'
import { ColonyDetailContent } from '../pages/colony-page'

export function DirectoryMap({ colonies, cats, reports, scope }: {
  colonies: InboxColony[]
  cats: InboxCat[]
  reports: InboxReport[]
  scope: 'colonies' | 'cats'
}) {
  const { googleMapsEnabled } = useInbox()
  const [selectedColonyId, setSelectedColonyId] = useState<string | null>(null)
  const mapRegion = useRef<HTMLDivElement>(null)
  const returnFocus = useRef<HTMLElement | null>(null)
  const openColony = useCallback((id: string) => {
    const active = document.activeElement
    returnFocus.current = active instanceof HTMLElement && mapRegion.current?.contains(active) ? active : mapRegion.current
    setSelectedColonyId(id)
  }, [])
  const places = useGooglePlaces(colonies.flatMap((colony) => colony.googlePlaceId && (scope === 'colonies' || cats.some((cat) => cat.colonyId === colony.id)) ? [colony.googlePlaceId] : []), googleMapsEnabled)
  const mapData = useMemo<Extract<ColonyMapData, { audience: 'team' }>>(() => ({
    audience: 'team',
    colonies: colonies.flatMap((colony) => {
      const matchingCats = cats.filter((cat) => cat.colonyId === colony.id)
      const coordinates = colony.googlePlaceId ? places.values[colony.googlePlaceId]?.coordinates : colony.coordinates
      if (!coordinates || (scope === 'cats' && !matchingCats.length)) return []
      const urgent = reports.some((report) => report.colonyId === colony.id && report.urgent && report.status !== 'processed')
      return [{ id: colony.id, name: colony.name, coordinates, status: urgent ? 'urgent-report' as const : 'unknown' as const, catCount: matchingCats.length }]
    }),
  }), [colonies, cats, reports, scope, places.values])
  const missingCats = cats.filter((cat) => cat.colonyId && !colonies.some((colony) => colony.id === cat.colonyId && (colony.coordinates || colony.googlePlaceId)))
  const unassignedCats = cats.filter((cat) => !cat.colonyId)
  const selectedColony = colonies.find((colony) => colony.id === selectedColonyId)
  const mappedColonyIds = new Set(mapData.colonies.map((colony) => colony.id))
  const unmappedColonies = colonies.filter((colony) => !mappedColonyIds.has(colony.id)).map((colony) => ({ id: colony.id, name: colony.name, catCount: cats.filter((cat) => cat.colonyId === colony.id).length }))

  return <div ref={mapRegion} tabIndex={-1} className="space-y-4 outline-none focus-visible:ring-2 focus-visible:ring-ring">
    <ColonyMap
      data={mapData}
      provider={googleMapsEnabled ? 'google' : 'default'}
      state={places.loading ? 'loading' : 'ready'}
      title={scope === 'cats' ? 'Cats by colony' : 'Colony map'}
      subtitle={scope === 'cats' ? 'Markers show colony locations, not individual cat sightings.' : 'Colony locations'}
      browse={scope === 'colonies' ? 'popover' : 'list'}
      unmappedColonies={scope === 'colonies' ? unmappedColonies : undefined}
      onSelectColony={scope === 'colonies' ? openColony : undefined}
      renderSelection={(id) => scope === 'colonies'
        ? <Button variant="outline" size="sm" render={<Link to={`/app/colonies/${encodeURIComponent(id)}`} />}>View colony</Button>
        : <div className="space-y-2"><Heading level={3} size="compact">Cats in this colony</Heading><ul className="grid gap-2 sm:grid-cols-2">{cats.filter((cat) => cat.colonyId === id).map((cat) => <li key={cat.id} className="flex items-center gap-3"><RecordAvatar name={cat.name} kind="cat" src={cat.photoUrl} size="sm" /><TextLink render={<Link to={`/app/cats/${encodeURIComponent(cat.id)}`} />}>{cat.name}</TextLink></li>)}</ul></div>}
    />
    {places.failed.length ? <EmptyState role="alert" tone="danger" icon={<CircleAlert />} title="Some locations are unavailable" description="Their saved places could not be loaded." action={googleMapsEnabled ? <Button variant="outline" size="sm" onClick={places.retry}>Retry locations</Button> : undefined} /> : null}
    {scope === 'cats' && missingCats.length > 0 ? <Card size="sm"><CardContent className="space-y-2">
      <Heading level={2} size="compact">Cats in colonies without a location</Heading>
      <Text size="caption" tone="muted">These records are not shown on the map.</Text>
      <ul className="flex flex-wrap gap-x-4">{missingCats.map((cat) => <li key={cat.id}><TextLink render={<Link to={`/app/cats/${encodeURIComponent(cat.id)}`} />}>{cat.name}</TextLink></li>)}</ul>
    </CardContent></Card> : null}
    {scope === 'cats' && unassignedCats.length ? <Card size="sm"><CardContent className="space-y-2">
      <Heading level={2} size="compact">Cats without a colony</Heading>
      <Text size="caption" tone="muted">These cats are not shown on the map.</Text>
      <ul className="flex flex-wrap gap-x-4">{unassignedCats.map((cat) => <li key={cat.id}><TextLink render={<Link to={`/app/cats/${encodeURIComponent(cat.id)}`} />}>{cat.name}</TextLink></li>)}</ul>
    </CardContent></Card> : null}
    <Drawer open={Boolean(selectedColony)} onOpenChange={(open) => { if (!open) setSelectedColonyId(null) }}>
      {selectedColony ? <DrawerContent closeLabel="Close colony details" finalFocus={() => returnFocus.current?.isConnected ? returnFocus.current : mapRegion.current}>
        <DrawerHeader density="compact"><DialogTitle size="card">{selectedColony.name}</DialogTitle><DialogDescription className="sr-only">Colony details and actions.</DialogDescription></DrawerHeader>
        <DrawerBody><ColonyDetailContent colonyId={selectedColony.id} inDrawer /></DrawerBody>
      </DrawerContent> : null}
    </Drawer>
  </div>
}
