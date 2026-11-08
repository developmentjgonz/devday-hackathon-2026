import { useId, useRef, useState, type FormEvent } from 'react'
import { ArrowLeft, MapPin, Plus } from 'lucide-react'
import { DiscardOnNavigation } from '@/components/layout/discard-on-navigation'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { DiscardChangesDialog, useDiscardConfirmation } from '@/components/ui/discard-changes-dialog'
import { Drawer, DrawerBody, DrawerContent, DrawerContext, DrawerContextField, DrawerContextValue, DrawerFooter, DrawerHeader } from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LocationPicker, locationCoordinates, locationDraft, locationIsEmpty } from '@/components/ui/location-picker'
import { SelectField } from '@/components/ui/select-field'
import { Text } from '@/components/ui/typography'
import { toast } from '@/components/ui/toaster'
import { useInbox } from '@/features/inbox/inbox-context'
import { CatDetailsFields, emptyCatDetails } from '@/features/cats/components/cat-details-fields'
import type { Cat, Colony } from '../../../../shared/types/directory'

export function NewRecordButton({ kind, colonyId: defaultColonyId = '', fixedColony = false, suggestedName = '', suggestedDescription = '', triggerLabel, variant = 'default', disabled = false, notifyOnCreate = true, onCreated }: {
  kind: 'colony' | 'cat'
  colonyId?: string
  fixedColony?: boolean
  suggestedName?: string
  suggestedDescription?: string
  triggerLabel?: string
  variant?: 'default' | 'outline'
  disabled?: boolean
  notifyOnCreate?: boolean
  onCreated?: (record: Cat | Colony) => void
}) {
  const { data, addColony, addCat, googleMapsEnabled } = useInbox()
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
  const newColonyNameInput = useRef<HTMLInputElement>(null)
  const body = useRef<HTMLDivElement>(null)
  const catScroll = useRef(0)
  const initialColonyId = useRef('')
  const isCat = kind === 'cat'
  const fixedCatColony = isCat && fixedColony && Boolean(defaultColonyId)
  const fixedColonyName = data.colonies.find((colony) => colony.id === defaultColonyId)?.name
  const canAddCat = data.colonies.some((colony) => colony.id === colonyId)
  const initialCenter = data.colonies.find((colony) => colony.coordinates)?.coordinates ?? [-80.1918, 25.7617] as [number, number]
  const validLocation = locationIsEmpty(location) || Boolean(locationCoordinates(location) || location.googlePlaceId)
  const validNewColonyLocation = locationIsEmpty(newColonyLocation) || Boolean(locationCoordinates(newColonyLocation) || newColonyLocation.googlePlaceId)
  const locationChanged = (value: typeof location) => Boolean(value.latitude || value.longitude || value.address || value.googlePlaceId)
  const hasChanges = open && Boolean(name !== suggestedName || (isCat && (colonyId !== initialColonyId.current || details.birthDate || details.birthDateEstimated || details.description !== suggestedDescription || details.photo !== undefined)) || (!isCat && locationChanged(location)) || newColonyName || locationChanged(newColonyLocation))
  const discard = useDiscardConfirmation(hasChanges)

  function begin() {
    setName(suggestedName)
    setDetails({ ...emptyCatDetails(), description: suggestedDescription })
    setAddingColony(false)
    setNewColonyName('')
    setLocation(locationDraft()); setShowLocation(false)
    setNewColonyLocation(locationDraft()); setShowNewColonyLocation(false)
    setError('')
    setColonyError('')
    const selectedColonyId = data.colonies.some((colony) => colony.id === defaultColonyId) ? defaultColonyId : ''
    initialColonyId.current = selectedColonyId
    setColonyId(selectedColonyId)
    setOpen(true)
  }
  function abandon() { setOpen(false); setAddingColony(false) }
  function close() { discard.requestDiscard(abandon) }
  function openColony() {
    catScroll.current = body.current?.scrollTop ?? 0
    setColonyError('')
    setAddingColony(true)
    requestAnimationFrame(() => { if (body.current) body.current.scrollTop = 0; newColonyNameInput.current?.focus() })
  }
  function returnToCat() {
    setAddingColony(false)
    setColonyError('')
    // The dialog restores focus next frame when the colony field is removed.
    // Return to the cat action after that restore, without moving the form.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (body.current) body.current.scrollTop = catScroll.current
      addColonyTrigger.current?.focus({ preventScroll: true })
    }))
  }
  async function submitColony(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    event.stopPropagation()
    const trimmedName = newColonyName.trim()
    if (!trimmedName || savingColony || locatingColony || !validNewColonyLocation) return
    setSavingColony(true)
    setColonyError('')
    try {
      const placeId = newColonyLocation.googlePlaceId || undefined
      const coordinates = placeId ? undefined : locationCoordinates(newColonyLocation) ?? undefined
      const colony = await addColony(trimmedName, coordinates, coordinates ? newColonyLocation.address.trim() : '', placeId)
      setColonyId(colony.id)
      setNewColonyName('')
      setNewColonyLocation(locationDraft())
      setShowNewColonyLocation(false)
      returnToCat()
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
      let record: Cat | Colony
      if (isCat) record = await addCat({ name: trimmedName, colonyId, birthDate: details.birthDate, birthDateEstimated: details.birthDateEstimated, description: details.description, photo: details.photo })
      else {
        const placeId = location.googlePlaceId || undefined
        const coordinates = placeId ? undefined : locationCoordinates(location) ?? undefined
        record = await addColony(trimmedName, coordinates, coordinates ? location.address.trim() : '', placeId)
      }
      setOpen(false)
      onCreated?.(record)
      if (notifyOnCreate) toast.success(isCat ? 'Cat added' : 'Colony added', { description: trimmedName })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save. Try again.')
    } finally { setSaving(false) }
  }

  return <>
    <Button ref={trigger} size="sm" variant={variant} aria-label={triggerLabel} disabled={disabled} onClick={begin}><Plus aria-hidden="true" />{isCat ? 'Add cat' : 'Add colony'}</Button>
    <Drawer open={open} onOpenChange={(next, event) => { if (next) return; if (saving || savingColony || details.photoReading) event.cancel(); else if (addingColony && event.reason === 'escape-key') { event.cancel(); returnToCat() } else { if (hasChanges) event.cancel(); close() } }}>
      <DrawerContent render={<form onSubmit={addingColony ? submitColony : submit} />} closeLabel={isCat ? 'Close add cat' : 'Close add colony'} closeDisabled={saving || savingColony || details.photoReading} finalFocus={() => trigger.current}>
        <DrawerHeader density="compact" className="pr-6">
          <div className="flex min-h-11 min-w-0 items-center gap-2 pr-10">
            {addingColony ? <Button type="button" variant="ghost" size="icon" disabled={savingColony} onClick={returnToCat} aria-label="Back to cat"><ArrowLeft aria-hidden="true" /></Button> : null}
            <DialogTitle size="card">{addingColony ? 'Add colony' : isCat ? 'Add cat' : 'Add colony'}</DialogTitle>
          </div>
          <DialogDescription className="sr-only">{addingColony ? 'Create a colony for this cat.' : isCat ? fixedCatColony && fixedColonyName ? `Add a cat to ${fixedColonyName}.` : 'Add a cat to a colony.' : 'Create a place to organize cats, reports, and care.'}</DialogDescription>
        </DrawerHeader>
        <DrawerBody ref={body}>
          {addingColony ? <>
            <Text size="small" tone="muted">Create a colony for {name.trim() || 'this cat'}.</Text>
            {colonyError ? <Alert>{colonyError}</Alert> : null}
            <div className="grid gap-2"><Label htmlFor={newColonyNameId}>Colony name</Label><Input ref={newColonyNameInput} id={newColonyNameId} required disabled={savingColony} maxLength={120} value={newColonyName} onChange={(event) => setNewColonyName(event.target.value)} /></div>
            <div className="space-y-3"><Button type="button" variant="outline" size="sm" disabled={savingColony} onClick={() => { if (showNewColonyLocation) setNewColonyLocation(locationDraft()); setShowNewColonyLocation(!showNewColonyLocation) }}><MapPin aria-hidden="true" />{showNewColonyLocation ? 'Remove location' : 'Add location (optional)'}</Button>
              {showNewColonyLocation ? <LocationPicker value={newColonyLocation} onChange={setNewColonyLocation} initialCenter={initialCenter} disabled={savingColony} googleMaps={googleMapsEnabled} onLocatingChange={setLocatingColony} /> : null}
            </div>
          </> : <>
          {error ? <Alert>{error}</Alert> : null}
          <div className="grid gap-2"><Label htmlFor={nameId}>{isCat ? 'Cat name' : 'Colony name'}</Label><Input id={nameId} required disabled={saving || details.photoReading} maxLength={120} value={name} onChange={(event) => setName(event.target.value)} /></div>
          {isCat ? <div className="space-y-2">
            <DrawerContext className="grid-cols-1">
              {fixedCatColony ? <DrawerContextValue label="Colony" value={fixedColonyName ?? 'Colony unavailable'} /> : <DrawerContextField>
                <Label htmlFor={colonyIdField}>Colony</Label>
                <SelectField id={colonyIdField} required disabled={saving || details.photoReading} value={colonyId} onChange={(event) => setColonyId(event.target.value)}><option value="">Choose</option>{data.colonies.map((colony) => <option key={colony.id} value={colony.id}>{colony.name}</option>)}</SelectField>
              </DrawerContextField>}
            </DrawerContext>
            {!fixedCatColony ? <div><Button ref={addColonyTrigger} type="button" variant="link" size="sm" disabled={saving || details.photoReading} onClick={openColony}><Plus aria-hidden="true" />Add colony</Button></div> : null}
          </div> : null}
          {!isCat ? <div className="space-y-3">
            <Button type="button" variant="outline" size="sm" disabled={saving} onClick={() => { if (showLocation) setLocation(locationDraft()); setShowLocation(!showLocation) }}><MapPin aria-hidden="true" />{showLocation ? 'Remove location' : 'Add location (optional)'}</Button>
            {showLocation ? <LocationPicker value={location} onChange={setLocation} initialCenter={initialCenter} disabled={saving} googleMaps={googleMapsEnabled} onLocatingChange={setLocating} /> : null}
          </div> : null}
          {isCat ? <CatDetailsFields name={name} value={details} onChange={setDetails} disabled={saving || details.photoReading} /> : null}
          </>}
        </DrawerBody>
        <DrawerFooter>
          {addingColony ? <>
            <Button type="submit" loading={savingColony} disabled={!newColonyName.trim() || locatingColony || !validNewColonyLocation}>Add colony</Button>
          </> : <>
            <Button type="button" variant="outline" disabled={saving || details.photoReading} onClick={close}>Cancel</Button>
            <Button type="submit" loading={saving || (isCat && details.photoReading)} disabled={!name.trim() || (!isCat && (locating || !validLocation)) || (isCat && (!canAddCat || Boolean(details.photoError)))}>{isCat ? 'Add cat' : 'Add colony'}</Button>
          </>}
        </DrawerFooter>
        <DiscardChangesDialog {...discard.dialogProps} />
        {hasChanges && !saving && !savingColony ? <DiscardOnNavigation onDiscard={abandon} /> : null}
      </DrawerContent>
    </Drawer>
  </>
}
