import { useRef, useState, type FormEvent, type RefObject } from 'react'
import { Plus } from 'lucide-react'
import { DiscardOnNavigation } from '@/components/layout/discard-on-navigation'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { DiscardChangesDialog, useDiscardConfirmation } from '@/components/ui/discard-changes-dialog'
import { Drawer, DrawerBody, DrawerContent, DrawerFooter, DrawerHeader } from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SelectField } from '@/components/ui/select-field'
import { toast } from '@/components/ui/toaster'
import { Text } from '@/components/ui/typography'
import { useInbox } from '@/features/inbox/inbox-context'
import type { Task, TaskAssociation } from '@/features/inbox/types'
import { emptyAssociationDraft, pendingAssociation, TaskAssociations } from './task-associations'
import { TaskRecordContextDetails, TaskRecordContextSummary } from './task-record-context'
import { resolveTaskRecordContext } from '../task-data'

export function TaskEditor({ currentUser, task, initialAssociation, onCreated, fallbackFocus }: { currentUser: string; task?: Task; initialAssociation?: TaskAssociation; onCreated?: () => void; fallbackFocus?: RefObject<HTMLElement | null> }) {
  const { data, reports, members, createTask, editTask } = useInbox()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [owner, setOwner] = useState('')
  const [due, setDue] = useState('')
  const [associations, setAssociations] = useState<TaskAssociation[]>([])
  const [associationDraft, setAssociationDraft] = useState(emptyAssociationDraft)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const trigger = useRef<HTMLButtonElement>(null)
  const initialAssociations = task?.associations ?? (initialAssociation ? [initialAssociation] : [])
  const defaultOwner = task?.ownerId ?? (members.some((member) => member.id === currentUser) ? currentUser : '')
  const validOwner = members.some((member) => member.id === owner) || Boolean(task && owner === task.ownerId)
  const pending = open ? pendingAssociation(associationDraft, associations, data) : null
  const contextTask: Task = { id: task?.id ?? '', title, ownerId: owner, owner: '', due, status: task?.status ?? 'open', ...(task?.reportId ? { reportId: task.reportId } : {}), associations: pending ? [...associations, pending] : associations }
  const context = open ? resolveTaskRecordContext(contextTask, reports, data) : { colonies: [], cats: [], emptyColony: 'No colony' }
  const hasChanges = open && (title !== (task?.title ?? '') || owner !== defaultOwner || due !== (task?.due ?? '') || JSON.stringify(associations) !== JSON.stringify(initialAssociations) || associationDraft.entry !== '')
  const discard = useDiscardConfirmation(hasChanges)
  function close() { discard.requestDiscard(() => setOpen(false)) }
  function begin() {
    setTitle(task?.title ?? '')
    setOwner(defaultOwner)
    setDue(task?.due ?? '')
    setAssociationDraft(emptyAssociationDraft())
    setAssociations(task?.associations ?? (initialAssociation ? [initialAssociation] : []))
    setError('')
    setOpen(true)
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!title.trim() || !validOwner || saving) return
    const pending = pendingAssociation(associationDraft, associations, data)
    const related = pending ? [...associations, pending] : associations
    setSaving(true); setError('')
    try {
      const input = { title: title.trim(), ownerId: owner, due, associations: related, ...(task?.reportId ? { reportId: task.reportId } : {}) }
      if (task) { await editTask(task.id, input); toast.success('Task updated', { description: title.trim() }) }
      else { await createTask(input); toast.success('Task created', { description: title.trim() }); onCreated?.() }
      setOpen(false)
      requestAnimationFrame(() => { if (!trigger.current?.isConnected) fallbackFocus?.current?.focus({ preventScroll: true }) })
    } catch (error) { setError(error instanceof Error ? error.message : 'Could not save the task. Try again.') }
    finally { setSaving(false) }
  }
  return <>
    <Button ref={trigger} size="sm" variant={task ? 'ghost' : 'default'} onClick={begin} aria-label={task ? `Edit task: ${task.title}` : undefined}>{task ? 'Edit' : <><Plus aria-hidden="true" />New task</>}</Button>
    <Drawer open={open} onOpenChange={(next, event) => { if (!next) { if (saving || hasChanges) event.cancel(); if (!saving) close() } }}><DrawerContent render={<form onSubmit={save} />} closeLabel={task ? 'Close edit task' : 'Close new task'} closeDisabled={saving} finalFocus={() => trigger.current?.isConnected ? trigger.current : fallbackFocus?.current ?? null}>
        <DrawerHeader density="compact" className="pr-6">
          <DialogTitle size="card" className="flex min-h-11 items-center pr-10">{task ? 'Edit task' : 'New task'}</DialogTitle>
          <DialogDescription className="sr-only">{task?.careRuleId ? 'Changes apply only to this task. The care rule stays the same.' : task?.reportId ? 'Update the task and its related items. The report remains linked.' : 'Add a task and any related items.'}</DialogDescription>
        </DrawerHeader>
        <DrawerBody><fieldset disabled={saving} className="grid min-w-0 gap-5">
        {task?.careRuleId ? <Text size="small" tone="muted">Changes apply only to this task. The care rule stays the same.</Text> : task?.reportId ? <Text size="small" tone="muted">The report remains linked.</Text> : null}
        <div className="grid gap-2"><Label htmlFor="task-editor-title">What needs to happen?</Label><Input id="task-editor-title" disabled={saving} required maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} /></div>
        <div className="grid gap-2"><Label htmlFor="task-editor-owner">Assign to</Label><SelectField id="task-editor-owner" disabled={saving} required value={owner} onChange={(event) => setOwner(event.target.value)}><option value="">Choose a team member</option>{task && !members.some((member) => member.id === task.ownerId) ? <option value={task.ownerId}>{task.owner} (current assignee)</option> : null}{members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</SelectField>{!members.length ? <Text size="caption" tone="muted">No team members are available for new tasks. Ask an administrator to enable task assignments.</Text> : null}</div>
        <div className="grid gap-2"><Label htmlFor="task-editor-due">Due date (optional)</Label><Input id="task-editor-due" disabled={saving} type="date" value={due} onChange={(event) => setDue(event.target.value)} /></div>
        <TaskRecordContextSummary context={context} />
        <TaskRecordContextDetails context={context} />
        <TaskAssociations disabled={saving} value={associations} onChange={setAssociations} data={data} draft={associationDraft} onDraftChange={setAssociationDraft} />
        </fieldset>
        {error ? <Alert>{error}</Alert> : null}
        </DrawerBody>
        <DrawerFooter><Button type="button" variant="outline" disabled={saving} onClick={close}>Cancel</Button><Button type="submit" loading={saving} disabled={!title.trim() || !validOwner}>{task ? 'Save task' : 'Create task'}</Button></DrawerFooter>
        <DiscardChangesDialog {...discard.dialogProps} />
        {hasChanges && !saving ? <DiscardOnNavigation onDiscard={() => setOpen(false)} /> : null}
    </DrawerContent></Drawer>
  </>
}
