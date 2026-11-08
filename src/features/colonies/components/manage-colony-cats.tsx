import { useId, useRef, useState, type FormEvent } from 'react'
import { Cat, List } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Drawer, DrawerBody, DrawerContent, DrawerContext, DrawerContextValue, DrawerFooter, DrawerHeader } from '@/components/ui/drawer'
import { EmptyState } from '@/components/ui/empty-state'
import { Label } from '@/components/ui/label'
import { SelectField } from '@/components/ui/select-field'
import { Heading, Text } from '@/components/ui/typography'
import { useInbox } from '@/features/inbox/inbox-context'
import type { InboxCat, InboxColony } from '@/features/inbox/types'

export function ManageColonyCats({ colony }: { colony: InboxColony }) {
  const { data, changeCatColony } = useInbox()
  const [open, setOpen] = useState(false)
  const [selectedId, setSelectedId] = useState('')
  const [pending, setPending] = useState<{ id: string; action: 'add' | 'remove' } | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const trigger = useRef<HTMLButtonElement>(null)
  const catSelect = useRef<HTMLSelectElement>(null)
  const membersHeading = useRef<HTMLHeadingElement>(null)
  const membersId = useId()
  const addId = useId()
  const selectId = useId()
  const members = data.cats.filter((cat) => cat.colonyId === colony.id).sort((a, b) => a.name.localeCompare(b.name))
  const available = data.cats.filter((cat) => cat.colonyId !== colony.id).sort((a, b) => a.name.localeCompare(b.name))
  const selected = available.find((cat) => cat.id === selectedId)
  const previousColony = data.colonies.find((item) => item.id === selected?.colonyId)

  function begin() { setSelectedId(''); setError(''); setNotice(''); setOpen(true) }
  async function change(cat: InboxCat, destination: string, action: 'add' | 'remove', source: HTMLButtonElement | null) {
    if (pending) return
    setPending({ id: cat.id, action }); setError(''); setNotice('')
    let saved = false
    try {
      await changeCatColony(cat, destination)
      setSelectedId('')
      setNotice(action === 'add' ? `${cat.name} was added to ${colony.name}.` : `${cat.name} was removed from ${colony.name} and remains in the cat directory.`)
      saved = true
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update the colony. Try again.')
    } finally {
      setPending(null)
      // Wait for the dialog's focus restore when the last option is removed.
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const target = !saved && source?.isConnected ? source : action === 'add' ? catSelect.current ?? membersHeading.current : membersHeading.current
        target?.focus({ preventScroll: true })
      }))
    }
  }
  function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (selected) void change(selected, colony.id, 'add', event.currentTarget.querySelector<HTMLButtonElement>('button[type=submit]'))
  }

  return <>
    <Button ref={trigger} size="sm" variant="outline" onClick={begin}><List aria-hidden="true" />Manage cats</Button>
    <Drawer open={open} onOpenChange={(next, event) => { if (!next && pending) event.cancel(); else setOpen(next) }}>
      <DrawerContent closeLabel="Close manage cats" closeDisabled={Boolean(pending)} finalFocus={() => trigger.current}>
        <DrawerHeader density="compact" className="pr-6">
          <DialogTitle size="card" className="flex min-h-11 items-center pr-10">Manage cats</DialogTitle>
          <DialogDescription className="sr-only">Add or remove cats from {colony.name}. Each cat can belong to one colony at a time.</DialogDescription>
        </DrawerHeader>
        <DrawerBody>
          <DrawerContext><DrawerContextValue label="Colony" value={colony.name} /></DrawerContext>
          <Text size="small" tone="muted">Each cat can belong to one colony at a time.</Text>
          {error ? <Alert>{error}</Alert> : null}
          <section aria-labelledby={membersId} className="space-y-3">
            <Heading id={membersId} ref={membersHeading} tabIndex={-1} level={3} size="card">Cats in this colony</Heading>
            {members.length ? <ul className="space-y-3">{members.map((cat) => <li key={cat.id} className="flex items-center justify-between gap-3">
              <Text size="small" className="min-w-0 wrap-anywhere">{cat.name}</Text>
              <Button type="button" size="sm" variant="outline" aria-label={`Remove ${cat.name} from ${colony.name}`} loading={pending?.id === cat.id && pending.action === 'remove'} disabled={Boolean(pending)} onClick={(event) => void change(cat, '', 'remove', event.currentTarget)}>Remove</Button>
            </li>)}</ul> : <EmptyState icon={<Cat />} title="No cats in this colony" description="Removed cats remain in the cat directory." />}
          </section>
          <form onSubmit={add} aria-labelledby={addId} className="space-y-3">
            <Heading id={addId} level={3} size="card">Add an existing cat</Heading>
            {available.length ? <>
              <div className="grid gap-2"><Label htmlFor={selectId}>Cat</Label><SelectField ref={catSelect} id={selectId} value={selectedId} disabled={Boolean(pending)} onChange={(event) => setSelectedId(event.target.value)}>
                <option value="">Choose a cat</option>{available.map((cat) => <option key={cat.id} value={cat.id}>{cat.name} — {data.colonies.find((item) => item.id === cat.colonyId)?.name ?? 'No colony'}</option>)}
              </SelectField></div>
              {selected && previousColony ? <Text size="small" tone="muted">This will move {selected.name} from {previousColony.name} to {colony.name}.</Text> : null}
              <Button type="submit" size="sm" loading={pending?.action === 'add'} disabled={!selected || Boolean(pending)}>Add existing cat</Button>
            </> : <EmptyState icon={<Cat />} title="No other cats" description="Create a cat to add it to this colony." />}
          </form>
          {notice ? <Text size="small" role="status" className="wrap-anywhere">{notice}</Text> : null}
        </DrawerBody>
        <DrawerFooter><Button type="button" variant="outline" disabled={Boolean(pending)} onClick={() => setOpen(false)}>Close</Button></DrawerFooter>
      </DrawerContent>
    </Drawer>
  </>
}
