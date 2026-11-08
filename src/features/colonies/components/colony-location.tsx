import { useMemo, useRef, useState, type FormEvent } from 'react'
import { MapPin, Pencil } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { ColonyMap, type ColonyMapData } from '@/components/ui/colony-map'
import { EmptyState } from '@/components/ui/empty-state'
import { DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Drawer, DrawerBody, DrawerContent, DrawerFooter, DrawerHeader } from '@/components/ui/drawer'
import { LocationPicker, locationCoordinates, locationDraft, locationIsEmpty } from '@/components/ui/location-picker'
import { TextLink } from '@/components/ui/text-link'
import { toast } from '@/components/ui/toaster'
import { Heading, Text } from '@/components/ui/typography'
import { useInbox } from '@/features/inbox/inbox-context'
import type { InboxColony } from '@/features/inbox/types'

export function ColonyLocation({ colony, catCount, fill = false }: { colony: InboxColony; catCount: number; fill?: boolean }) {
  const { data, updateColonyLocation } = useInbox()
  const mapData = useMemo<ColonyMapData | null>(() => colony.coordinates ? {
    audience: 'team', colonies: [{ id: colony.id, name: colony.name, coordinates: colony.coordinates, status: 'unknown', catCount }],
  } : null, [colony.coordinates, colony.id, colony.name, catCount])
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(() => locationDraft(colony.coordinates, colony.address))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [locating, setLocating] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  const selected = locationCoordinates(draft)
  const clear = locationIsEmpty(draft)
  const changed = clear ? Boolean(colony.coordinates) : Boolean(selected && (selected[0] !== colony.coordinates?.[0] || selected[1] !== colony.coordinates?.[1] || draft.address.trim() !== (colony.address ?? '')))
  const initialCenter = colony.coordinates ?? data.colonies.find((item) => item.coordinates)?.coordinates ?? [-80.1918, 25.7617]

  function begin() { setDraft(locationDraft(colony.coordinates, colony.address)); setError(''); setOpen(true) }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!changed || (!selected && !clear) || saving || locating) return
    setSaving(true); setError('')
    try {
      await updateColonyLocation(colony, selected, selected ? draft.address.trim() : '')
      setOpen(false)
      toast.success(selected ? 'Location saved' : 'Location removed', { description: colony.name })
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save the location. Try again.') }
    finally { setSaving(false) }
  }

  return <section aria-labelledby="colony-location" className={fill ? "flex flex-col gap-3 lg:h-full" : "space-y-3"}>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Heading id="colony-location" level={2} size="card">Location</Heading>
      <Button ref={trigger} variant="outline" size="sm" onClick={begin}>{colony.coordinates ? <Pencil aria-hidden="true" /> : <MapPin aria-hidden="true" />}{colony.coordinates ? 'Edit location' : 'Set location'}</Button>
    </div>
    {colony.coordinates && mapData ? <>
      <ColonyMap variant="location" height={fill ? 'fill' : 'default'} title={`${colony.name} location`} data={mapData} initialView={{ center: colony.coordinates, zoom: 14 }} />
      <Text data-colony-location-value size="small" className="wrap-anywhere">{colony.address || `${colony.coordinates[1].toFixed(5)}, ${colony.coordinates[0].toFixed(5)}`}</Text>
      {colony.address ? <TextLink size="sm" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</TextLink> : null}
    </> : <EmptyState icon={<MapPin />} title="No location set" />}
    <Drawer open={open} onOpenChange={(next) => { if (!saving) setOpen(next) }}>
      <DrawerContent render={<form onSubmit={save} />} closeLabel="Close location editor" closeDisabled={saving} finalFocus={() => trigger.current}>
        <DrawerHeader><DialogTitle>{colony.coordinates ? 'Edit location' : 'Set location'}</DialogTitle><DialogDescription>Choose where {colony.name} is located.</DialogDescription></DrawerHeader>
        <DrawerBody>
          {error ? <Alert>{error}</Alert> : null}
          <LocationPicker value={draft} onChange={setDraft} initialCenter={initialCenter} disabled={saving} onLocatingChange={setLocating} />
          {colony.coordinates && !clear ? <Button type="button" variant="outline" size="sm" disabled={saving || locating} onClick={() => setDraft(locationDraft())}>Clear location</Button> : null}
        </DrawerBody>
        <DrawerFooter className="flex-row justify-end"><Button type="button" variant="outline" disabled={saving} onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" loading={saving} disabled={locating || !changed || (!selected && !clear)}>Save location</Button></DrawerFooter>
      </DrawerContent>
    </Drawer>
  </section>
}
