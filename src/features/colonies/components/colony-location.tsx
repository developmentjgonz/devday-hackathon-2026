import { useMemo, useRef, useState, type FormEvent } from 'react'
import { CircleAlert, MapPin, Pencil } from 'lucide-react'
import { DiscardOnNavigation } from '@/components/layout/discard-on-navigation'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { ColonyMap, type ColonyMapData } from '@/components/ui/colony-map'
import { DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { DiscardChangesDialog, useDiscardConfirmation } from '@/components/ui/discard-changes-dialog'
import { Drawer, DrawerBody, DrawerContent, DrawerContext, DrawerContextValue, DrawerFooter, DrawerHeader } from '@/components/ui/drawer'
import { EmptyState } from '@/components/ui/empty-state'
import { GoogleMapsAttribution } from '@/components/ui/google-maps-attribution'
import { LoadingIndicator } from '@/components/ui/loading-indicator'
import { LocationPicker, locationCoordinates, locationDraft, locationIsEmpty } from '@/components/ui/location-picker'
import { TextLink } from '@/components/ui/text-link'
import { toast } from '@/components/ui/toaster'
import { Heading, Text } from '@/components/ui/typography'
import { useInbox } from '@/features/inbox/inbox-context'
import type { InboxColony } from '@/features/inbox/types'
import { useGooglePlaces } from '@/lib/use-google-places'

export function ColonyLocation({ colony, catCount, fill = false }: { colony: InboxColony; catCount: number; fill?: boolean }) {
  const { data, updateColonyLocation, googleMapsEnabled } = useInbox()
  const places = useGooglePlaces(colony.googlePlaceId ? [colony.googlePlaceId] : [], googleMapsEnabled)
  const place = colony.googlePlaceId ? places.values[colony.googlePlaceId] : undefined
  const coordinates = place?.coordinates ?? colony.coordinates
  const address = place?.address ?? colony.address
  const hasLocation = Boolean(colony.googlePlaceId || colony.coordinates)
  const unavailable = Boolean(colony.googlePlaceId && !places.loading && !place)
  const mapData = useMemo<ColonyMapData | null>(() => coordinates ? {
    audience: 'team',
    colonies: [{ id: colony.id, name: colony.name, coordinates, status: 'unknown', catCount }],
  } : null, [colony.id, colony.name, coordinates, catCount])
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(() => locationDraft(colony.coordinates, colony.address))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [locating, setLocating] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  const initialDraft = useRef(draft)
  const hasChanges = open && JSON.stringify(draft) !== JSON.stringify(initialDraft.current)
  const discard = useDiscardConfirmation(hasChanges)
  const selected = locationCoordinates(draft)
  const clear = locationIsEmpty(draft)
  const changed = draft.googlePlaceId ? draft.googlePlaceId !== colony.googlePlaceId : clear ? hasLocation : Boolean(selected && (colony.googlePlaceId || selected[0] !== colony.coordinates?.[0] || selected[1] !== colony.coordinates?.[1] || draft.address.trim() !== (colony.address ?? '')))
  const initialCenter = coordinates ?? data.colonies.find((item) => item.coordinates)?.coordinates ?? [-80.1918, 25.7617]

  function begin() { const initial = locationDraft(coordinates, address, colony.googlePlaceId); initialDraft.current = initial; setDraft(initial); setError(''); setOpen(true) }
  function close() { discard.requestDiscard(() => setOpen(false)) }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!changed || (!selected && !clear && !draft.googlePlaceId) || saving || locating) return
    setSaving(true); setError('')
    try {
      const placeId = draft.googlePlaceId || undefined
      await updateColonyLocation(colony, placeId ? null : selected, !placeId && selected ? draft.address.trim() : '', placeId)
      setOpen(false)
      toast.success(selected || placeId ? 'Location saved' : 'Location removed', { description: colony.name })
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save the location. Try again.') }
    finally { setSaving(false) }
  }

  return <section aria-labelledby="colony-location" className={fill ? "flex flex-col gap-3 lg:h-full" : "space-y-3"}>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Heading id="colony-location" level={2} size="card">Location</Heading>
      <Button ref={trigger} variant="outline" size="sm" disabled={Boolean(colony.googlePlaceId && places.loading)} onClick={begin}>{hasLocation ? <Pencil aria-hidden="true" /> : <MapPin aria-hidden="true" />}{hasLocation ? 'Edit location' : 'Set location'}</Button>
    </div>
    {colony.googlePlaceId && places.loading ? <div role="status" className="flex items-center gap-3"><LoadingIndicator decorative /><Text size="small" tone="muted">Loading location…</Text></div> : unavailable ? <EmptyState role="alert" tone="danger" icon={<CircleAlert />} title="Location unavailable" description="The saved location could not be loaded." action={googleMapsEnabled ? <Button size="sm" variant="outline" onClick={places.retry}>Retry</Button> : undefined} /> : coordinates && mapData ? <>
      <ColonyMap
        variant="location"
        height={fill ? "fill" : "default"}
        provider={googleMapsEnabled ? 'google' : 'default'}
        title={`${colony.name} location`}
        data={mapData}
        initialView={{ center: coordinates, zoom: 14 }}
      />
      <Text data-colony-location-value size="small" className="wrap-anywhere">{address || `${coordinates[1].toFixed(5)}, ${coordinates[0].toFixed(5)}`}</Text>
    </> : <EmptyState icon={<MapPin />} title="No location set" />}
    {place ? <GoogleMapsAttribution /> : colony.address ? <TextLink size="sm" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</TextLink> : null}
    <Drawer open={open} onOpenChange={(next, event) => { if (!next) { if (saving || hasChanges) event.cancel(); if (!saving) close() } }}>
      <DrawerContent render={<form onSubmit={save} />} closeLabel="Close location editor" closeDisabled={saving} finalFocus={() => trigger.current}>
        <DrawerHeader density="compact" className="pr-6">
          <DialogTitle size="card" className="flex min-h-11 items-center pr-10">{hasLocation ? 'Edit location' : 'Set location'}</DialogTitle>
          <DialogDescription className="sr-only">Choose where {colony.name} is located.</DialogDescription>
        </DrawerHeader>
        <DrawerBody>
          <DrawerContext><DrawerContextValue label="Colony" value={colony.name} /></DrawerContext>
          {error ? <Alert>{error}</Alert> : null}
          <LocationPicker value={draft} onChange={setDraft} initialCenter={initialCenter} disabled={saving} googleMaps={googleMapsEnabled} onLocatingChange={setLocating} />
          {hasLocation && !clear ? <Button type="button" variant="outline" size="sm" disabled={saving || locating} onClick={() => setDraft(locationDraft())}>Clear location</Button> : null}
        </DrawerBody>
        <DrawerFooter><Button type="button" variant="outline" disabled={saving} onClick={close}>Cancel</Button><Button type="submit" loading={saving} disabled={locating || !changed || (!selected && !clear && !draft.googlePlaceId)}>Save location</Button></DrawerFooter>
        <DiscardChangesDialog {...discard.dialogProps} />
        {hasChanges && !saving ? <DiscardOnNavigation onDiscard={() => setOpen(false)} /> : null}
      </DrawerContent>
    </Drawer>
  </section>
}
