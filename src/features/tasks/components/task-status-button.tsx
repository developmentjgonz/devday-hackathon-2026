import { useId, useRef, useState, type FormEvent } from 'react'
import { Check, RotateCcw } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { TaskStatus } from '@/features/inbox/types'
import type { AssignedTask } from '../task-data'

export type TaskStatusChange = (task: AssignedTask, status: TaskStatus, trigger: HTMLButtonElement, completionNote?: string) => Promise<boolean>

export function TaskStatusButton({ task, loading, onStatusChange }: {
  task: AssignedTask
  loading: boolean
  onStatusChange: TaskStatusChange
}) {
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')
  const [error, setError] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  const noteId = useId()
  const completed = task.status === 'completed'
  async function confirm(event: FormEvent) {
    event.preventDefault()
    if (!trigger.current || loading) return
    setError(false)
    if (await onStatusChange(task, 'completed', trigger.current, note.trim())) {
      setOpen(false)
      setNote('')
    } else setError(true)
  }
  return <><Button
    ref={trigger}
    variant={completed ? 'outline' : 'subtle'}
    size="sm"
    loading={loading}
    aria-label={`${completed ? 'Reopen task' : 'Mark complete'}: ${task.title}`}
    onClick={(event) => {
      if (completed) void onStatusChange(task, 'open', event.currentTarget)
      else { setNote(''); setError(false); setOpen(true) }
    }}
  >
    {completed ? <RotateCcw aria-hidden="true" /> : <Check aria-hidden="true" />}{completed ? 'Reopen' : 'Mark complete'}
  </Button>
  <Dialog open={open} onOpenChange={(next) => { if (!loading) setOpen(next) }}>
    <DialogContent closeDisabled={loading}>
      <DialogHeader>
        <DialogTitle>Complete this task?</DialogTitle>
        <DialogDescription>{task.title}</DialogDescription>
      </DialogHeader>
      <form onSubmit={confirm} className="space-y-5">
        <div className="grid gap-2">
          <Label htmlFor={noteId}>Completion note (optional)</Label>
          <Textarea id={noteId} maxLength={4000} disabled={loading} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Add details about what you did" />
        </div>
        {error ? <Alert>Could not complete the task. Try again.</Alert> : null}
        <DialogFooter>
          <Button type="button" variant="outline" disabled={loading} onClick={() => setOpen(false)}>Cancel</Button>
          <Button type="submit" loading={loading}>Complete task</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog></>
}
