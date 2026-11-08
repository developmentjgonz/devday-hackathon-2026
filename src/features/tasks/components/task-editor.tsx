import { useRef, useState, type FormEvent } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SelectField } from '@/components/ui/select-field'
import { toast } from '@/components/ui/toaster'
import { useInbox } from '@/features/inbox/inbox-context'
import type { Task, TaskAssociation } from '@/features/inbox/types'
import { emptyAssociationDraft, pendingAssociation, TaskAssociations } from './task-associations'

export function TaskEditor({ currentUser, task, initialAssociation, onCreated }: { currentUser: string; task?: Task; initialAssociation?: TaskAssociation; onCreated?: () => void }) {
  const { data, members, createTask, editTask } = useInbox()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [owner, setOwner] = useState('')
  const [due, setDue] = useState('')
  const [associations, setAssociations] = useState<TaskAssociation[]>([])
  const [associationDraft, setAssociationDraft] = useState(emptyAssociationDraft)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const trigger = useRef<HTMLButtonElement>(null)
  function begin() {
    setTitle(task?.title ?? '')
    setOwner(task?.ownerId ?? currentUser)
    setDue(task?.due ?? '')
    setAssociationDraft(emptyAssociationDraft())
    setAssociations(task?.associations ?? (initialAssociation ? [initialAssociation] : []))
    setError('')
    setOpen(true)
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!title.trim() || !owner || saving) return
    const pending = pendingAssociation(associationDraft, associations, data)
    const related = pending ? [...associations, pending] : associations
    setSaving(true); setError('')
    try {
      const input = { title: title.trim(), ownerId: owner, due, associations: related, ...(task?.reportId ? { reportId: task.reportId } : {}) }
      if (task) { await editTask(task.id, input); toast.success('Task updated', { description: title.trim() }) }
      else { await createTask(input); toast.success('Task created', { description: title.trim() }); onCreated?.() }
      setOpen(false)
    } catch (error) { setError(error instanceof Error ? error.message : 'Could not save the task. Try again.') }
    finally { setSaving(false) }
  }
  return <>
    <Button ref={trigger} size="sm" variant={task ? 'ghost' : 'default'} onClick={begin} aria-label={task ? `Edit task: ${task.title}` : undefined}>{task ? 'Edit' : <><Plus aria-hidden="true" />New task</>}</Button>
    <Dialog open={open} onOpenChange={(next) => { if (!saving) setOpen(next) }}><DialogContent layout="scroll" closeDisabled={saving} finalFocus={() => trigger.current}>
      <form onSubmit={save} className="flex min-h-0 flex-col">
        <DialogHeader><DialogTitle>{task ? 'Edit task' : 'New task'}</DialogTitle><DialogDescription>{task?.reportId ? 'Update the task and its related items. The report remains linked.' : 'Add a task and any related items.'}</DialogDescription></DialogHeader>
        <DialogBody><fieldset disabled={saving} className="grid min-w-0 gap-5">
        <div className="grid gap-2"><Label htmlFor="task-editor-title">What needs to happen?</Label><Input id="task-editor-title" disabled={saving} required maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} /></div>
        <div className="grid gap-2"><Label htmlFor="task-editor-owner">Assign to</Label><SelectField id="task-editor-owner" disabled={saving} required value={owner} onChange={(event) => setOwner(event.target.value)}>{members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</SelectField></div>
        <div className="grid gap-2"><Label htmlFor="task-editor-due">Due date (optional)</Label><Input id="task-editor-due" disabled={saving} type="date" value={due} onChange={(event) => setDue(event.target.value)} /></div>
        <TaskAssociations disabled={saving} value={associations} onChange={setAssociations} data={data} draft={associationDraft} onDraftChange={setAssociationDraft} />
        </fieldset>
        {error ? <Alert>{error}</Alert> : null}
        </DialogBody>
        <DialogFooter><Button type="button" variant="outline" disabled={saving} onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" loading={saving} disabled={!title.trim() || !owner}>{task ? 'Save task' : 'Create task'}</Button></DialogFooter>
      </form>
    </DialogContent></Dialog>
  </>
}
