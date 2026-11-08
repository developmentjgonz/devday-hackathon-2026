import { useRef, useState, type FormEvent } from 'react'
import { Pencil } from 'lucide-react'
import { DiscardOnNavigation } from '@/components/layout/discard-on-navigation'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { DiscardChangesDialog, useDiscardConfirmation } from '@/components/ui/discard-changes-dialog'
import { Drawer, DrawerBody, DrawerContent, DrawerFooter, DrawerHeader } from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SelectField } from '@/components/ui/select-field'
import { toast } from '@/components/ui/toaster'
import { useInbox } from '@/features/inbox/inbox-context'
import type { InboxCat } from '@/features/inbox/types'
import { CatDetailsFields, emptyCatDetails } from './cat-details-fields'

export function EditCatButton({ cat }: { cat: InboxCat }) {
  const { data, updateCat } = useInbox()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(cat.name)
  const [colonyId, setColonyId] = useState(cat.colonyId)
  const [details, setDetails] = useState(emptyCatDetails)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  const hasChanges = open && (name !== cat.name || colonyId !== cat.colonyId || details.birthDate !== (cat.birthDate ?? '') || details.birthDateEstimated !== (cat.birthDateEstimated ?? false) || details.description !== (cat.description ?? '') || details.photo !== undefined)
  const discard = useDiscardConfirmation(hasChanges)
  function close() { discard.requestDiscard(() => setOpen(false)) }
  function begin() {
    setName(cat.name); setColonyId(cat.colonyId)
    setDetails({ ...emptyCatDetails(), birthDate: cat.birthDate ?? '', birthDateEstimated: cat.birthDateEstimated ?? false, description: cat.description ?? '' })
    setError(''); setOpen(true)
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim() || (colonyId && !data.colonies.some((item) => item.id === colonyId)) || saving || details.photoReading || details.photoError) return
    setSaving(true); setError('')
    try {
      await updateCat(cat, { name: name.trim(), colonyId, birthDate: details.birthDate, birthDateEstimated: details.birthDateEstimated, description: details.description, photo: details.photo })
      setOpen(false)
      toast.success('Cat profile updated', { description: name.trim() })
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save the cat profile. Try again.') }
    finally { setSaving(false) }
  }
  return <>
    <Button ref={trigger} size="sm" variant="outline" onClick={begin}><Pencil aria-hidden="true" />Edit profile</Button>
    <Drawer open={open} onOpenChange={(next, event) => { if (!next) { if (saving || details.photoReading || hasChanges) event.cancel(); if (!saving && !details.photoReading) close() } }}>
      <DrawerContent render={<form onSubmit={save} />} closeLabel="Close edit cat profile" closeDisabled={saving || details.photoReading} finalFocus={() => trigger.current}>
        <DrawerHeader density="compact" className="pr-6">
          <DialogTitle size="card" className="flex min-h-11 items-center pr-10">Edit cat profile</DialogTitle>
          <DialogDescription className="sr-only">Update the cat's details and photo.</DialogDescription>
        </DrawerHeader>
        <DrawerBody>
          {error ? <Alert>{error}</Alert> : null}
          <div className="grid gap-2"><Label htmlFor="edit-cat-name">Cat name</Label><Input id="edit-cat-name" required maxLength={120} disabled={saving || details.photoReading} value={name} onChange={(event) => setName(event.target.value)} /></div>
          <div className="grid gap-2"><Label htmlFor="edit-cat-colony">Colony</Label><SelectField id="edit-cat-colony" disabled={saving || details.photoReading} value={colonyId} onChange={(event) => setColonyId(event.target.value)}><option value="">No colony</option>{data.colonies.map((colony) => <option key={colony.id} value={colony.id}>{colony.name}</option>)}</SelectField></div>
          <CatDetailsFields name={name} existingPhoto={cat.photoUrl} value={details} onChange={setDetails} disabled={saving || details.photoReading} />
        </DrawerBody>
        <DrawerFooter><Button type="button" variant="outline" disabled={saving || details.photoReading} onClick={close}>Cancel</Button><Button type="submit" loading={saving || details.photoReading} disabled={!name.trim() || Boolean(details.photoError)}>Save profile</Button></DrawerFooter>
        <DiscardChangesDialog {...discard.dialogProps} />
        {hasChanges && !saving ? <DiscardOnNavigation onDiscard={() => setOpen(false)} /> : null}
      </DrawerContent>
    </Drawer>
  </>
}
