import { useId, useRef, useState, type FormEvent } from 'react'
import { MapPin, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Drawer, DrawerBody, DrawerContent, DrawerFooter, DrawerHeader } from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LocationPicker, locationCoordinates, locationDraft, locationIsEmpty } from '@/components/ui/location-picker'
import { SelectField } from '@/components/ui/select-field'
import { toast } from '@/components/ui/toaster'
import { useInbox } from '@/features/inbox/inbox-context'
import { CatDetailsFields, emptyCatDetails } from '@/features/cats/components/cat-details-fields'

export function NewRecordButton({ kind, colonyId: defaultColonyId = '', onCreated }: {
  kind: 'colony' | 'cat'
  colonyId?: string
  onCreated?: () => void
}) {
  const { data, addColony, addCat } = useInbox()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [colonyId, setColonyId] = useState('')
  const [details, setDetails] = useState(emptyCatDetails)
  const [addingColony, setAddingColony] = useState(false)
  const [newColonyName, setNewColonyName] = useState('')
  const [location, setLocation] = useState(locationDraft)
  const [showLocation, setShowLocation] = useState(false)
  const [newColonyLocation, setNewColonyLocation] = useState(locationDraft)
  const [showNewColonyLocation, setShowNewColonyLocation] = useState(false)
  const [locating, setLocating] = useState(false)
  const [locatingColony, setLocatingColony] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savingColony, setSavingColony] = useState(false)
  const [error, setError] = useState('')
  const [colonyError, setColonyError] = useState('')
  const nameId = useId()
  const colonyIdField = useId()
  const newColonyNameId = useId()
  const trigger = useRef<HTMLButtonElement>(null)
  const addColonyTrigger = useRef<HTMLButtonElement>(null)
  const isCat = kind === 'cat'
  const canAddCat = data.colonies.some((colony) => colony.id === colonyId)
  const initialCenter = data.colonies.find((colony) => colony.coordinates)?.coordinates ?? [-80.1918, 25.7617] as [number, number]
  const validLocation = locationIsEmpty(location) || Boolean(locationCoordinates(location))
  const validNewColonyLocation = locationIsEmpty(newColonyLocation) || Boolean(locationCoordinates(newColonyLocation))

  function begin() {
    setName('')
    setDetails(emptyCatDetails())
    setAddingColony(false)
    setNewColonyName('')
    setLocation(locationDraft()); setShowLocation(false)
    setNewColonyLocation(locationDraft()); setShowNewColonyLocation(false)
    setError('')
    setColonyError('')
    setColonyId(data.colonies.some((colony) => colony.id === defaultColonyId) ? defaultColonyId : '')
    setOpen(true)
  }
  async function submitColony(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    event.stopPropagation()
    const trimmedName = newColonyName.trim()
    if (!trimmedName || savingColony || locatingColony || !validNewColonyLocation) return
    setSavingColony(true)
    setColonyError('')
    try {
      const coordinates = locationCoordinates(newColonyLocation) ?? undefined
      const colony = await addColony(trimmedName, coordinates, coordinates ? newColonyLocation.address.trim() : '')
      setColonyId(colony.id)
      setNewColonyName('')
      setAddingColony(false)
    } catch (cause) {
      setColonyError(cause instanceof Error ? cause.message : 'Could not add the colony. Try again.')
    } finally { setSavingColony(false) }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName || saving || (!isCat && (locating || !validLocation)) || (isCat && (!canAddCat || details.photoError || details.photoReading))) return
    setSaving(true)
    setError('')
    try {
      if (isCat) await addCat({ name: trimmedName, colonyId, birthDate: details.birthDate, birthDateEstimated: details.birthDateEstimated, description: details.description, photo: details.photo })
      else {
        const coordinates = locationCoordinates(location) ?? undefined
        await addColony(trimmedName, coordinates, coordinates ? location.address.trim() : '')
      }
      setOpen(false)
      onCreated?.()
      toast.success(isCat ? 'Cat added' : 'Colony added', { description: trimmedName })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save. Try again.')
    } finally { setSaving(false) }
  }

  return <>
    <Button ref={trigger} size="sm" onClick={begin}><Plus aria-hidden="true" />{isCat ? 'Add cat' : 'Add colony'}</Button>
    <Drawer open={open} onOpenChange={(next) => { if (saving || savingColony || details.photoReading) return; setOpen(next); if (!next) setAddingColony(false) }}>
      <DrawerContent render={<form onSubmit={submit} />} closeLabel={isCat ? 'Close add cat' : 'Close add colony'} closeDisabled={saving || savingColony || details.photoReading} finalFocus={() => trigger.current}>
        <DrawerHeader>
          <DialogTitle>{isCat ? 'Add cat' : 'Add colony'}</DialogTitle>
          <DialogDescription>{isCat ? 'Add a cat to a colony.' : 'Create a place to organize cats, reports, and care.'}</DialogDescription>
        </DrawerHeader>
        <DrawerBody>
          {error ? <Alert>{error}</Alert> : null}
          <div className="grid gap-2"><Label htmlFor={nameId}>{isCat ? 'Cat name' : 'Colony name'}</Label><Input id={nameId} required disabled={saving || details.photoReading} maxLength={120} value={name} onChange={(event) => setName(event.target.value)} /></div>
          {!isCat ? <div className="space-y-3">
            <Button type="button" variant="outline" size="sm" disabled={saving} onClick={() => { if (showLocation) setLocation(locationDraft()); setShowLocation(!showLocation) }}><MapPin aria-hidden="true" />{showLocation ? 'Remove location' : 'Add location (optional)'}</Button>
            {showLocation ? <LocationPicker value={location} onChange={setLocation} initialCenter={initialCenter} disabled={saving} onLocatingChange={setLocating} /> : null}
          </div> : null}
          {isCat ? <div className="grid gap-2">
            <div className="flex items-center justify-between gap-3"><Label htmlFor={colonyIdField}>Colony</Label><Button ref={addColonyTrigger} type="button" variant="link" size="sm" disabled={saving || details.photoReading} onClick={() => { setNewColonyName(''); setNewColonyLocation(locationDraft()); setShowNewColonyLocation(false); setColonyError(''); setAddingColony(true) }}><Plus aria-hidden="true" />Add colony</Button></div>
            <SelectField id={colonyIdField} required disabled={saving || details.photoReading} value={colonyId} onChange={(event) => setColonyId(event.target.value)}><option value="">Choose a colony</option>{data.colonies.map((colony) => <option key={colony.id} value={colony.id}>{colony.name}</option>)}</SelectField>
          </div> : null}
          {isCat ? <CatDetailsFields name={name} value={details} onChange={setDetails} disabled={saving || details.photoReading} /> : null}
        </DrawerBody>
        <DrawerFooter className="flex-row justify-end">
          <Button type="button" variant="outline" disabled={saving || details.photoReading} onClick={() => setOpen(false)}>Cancel</Button>
          <Button type="submit" loading={saving || (isCat && details.photoReading)} disabled={!name.trim() || (!isCat && (locating || !validLocation)) || (isCat && (!canAddCat || Boolean(details.photoError)))}>{isCat ? 'Add cat' : 'Add colony'}</Button>
        </DrawerFooter>
        <Dialog open={addingColony} onOpenChange={(next) => { if (!savingColony) setAddingColony(next) }}>
          <DialogContent layout="scroll" render={<form onSubmit={submitColony} />} closeDisabled={savingColony} finalFocus={() => addColonyTrigger.current}>
            <DialogHeader><DialogTitle>Add colony</DialogTitle><DialogDescription>Create a colony for this cat.</DialogDescription></DialogHeader>
            <DialogBody>
              {colonyError ? <Alert>{colonyError}</Alert> : null}
              <div className="grid gap-2"><Label htmlFor={newColonyNameId}>Colony name</Label><Input id={newColonyNameId} required disabled={savingColony} maxLength={120} value={newColonyName} onChange={(event) => setNewColonyName(event.target.value)} /></div>
              <div className="space-y-3"><Button type="button" variant="outline" size="sm" disabled={savingColony} onClick={() => { if (showNewColonyLocation) setNewColonyLocation(locationDraft()); setShowNewColonyLocation(!showNewColonyLocation) }}><MapPin aria-hidden="true" />{showNewColonyLocation ? 'Remove location' : 'Add location (optional)'}</Button>
                {showNewColonyLocation ? <LocationPicker value={newColonyLocation} onChange={setNewColonyLocation} initialCenter={initialCenter} disabled={savingColony} onLocatingChange={setLocatingColony} /> : null}
              </div>
            </DialogBody>
            <DialogFooter><Button type="button" variant="outline" disabled={savingColony} onClick={() => setAddingColony(false)}>Cancel</Button><Button type="submit" loading={savingColony} disabled={!newColonyName.trim() || locatingColony || !validNewColonyLocation}>Add colony</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </DrawerContent>
    </Drawer>
  </>
}
