import { useRef, useState, type FormEvent } from 'react'
import { MapPin, Pencil } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Drawer, DrawerBody, DrawerContent, DrawerFooter, DrawerHeader } from '@/components/ui/drawer'
import { LocationPicker, locationCoordinates, locationDraft, locationIsEmpty } from '@/components/ui/location-picker'
import { toast } from '@/components/ui/toaster'
import { Heading, Text } from '@/components/ui/typography'
import { useInbox } from '@/features/inbox/inbox-context'
import type { InboxColony } from '@/features/inbox/types'

export function ColonyLocation({ colony }: { colony: InboxColony }) {
  const { data, updateColonyLocation } = useInbox()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(() => locationDraft(colony.coordinates))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [locating, setLocating] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  const selected = locationCoordinates(draft)
  const clear = locationIsEmpty(draft)
  const changed = clear ? Boolean(colony.coordinates) : Boolean(selected && (selected[0] !== colony.coordinates?.[0] || selected[1] !== colony.coordinates?.[1]))
  const initialCenter = colony.coordinates ?? data.colonies.find((item) => item.coordinates)?.coordinates ?? [-80.1918, 25.7617]

  function begin() { setDraft(locationDraft(colony.coordinates)); setError(''); setOpen(true) }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!changed || (!selected && !clear) || saving || locating) return
    setSaving(true); setError('')
    try {
      await updateColonyLocation(colony, selected)
      setOpen(false)
      toast.success(selected ? 'Location saved' : 'Location removed', { description: colony.name })
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save the location. Try again.') }
    finally { setSaving(false) }
  }

  return <section aria-labelledby="colony-location" className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Heading id="colony-location" level={2} size="card">Location</Heading>
      <Button ref={trigger} variant="outline" size="sm" onClick={begin}>{colony.coordinates ? <Pencil aria-hidden="true" /> : <MapPin aria-hidden="true" />}{colony.coordinates ? 'Edit location' : 'Set location'}</Button>
    </div>
    <Card size="sm"><CardContent><Text size="small" tone={colony.coordinates ? 'default' : 'muted'}>{colony.coordinates ? `${colony.coordinates[1].toFixed(5)}, ${colony.coordinates[0].toFixed(5)}` : 'No location set'}</Text></CardContent></Card>
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
