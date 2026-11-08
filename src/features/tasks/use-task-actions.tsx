import { useCallback, useRef, useState, type RefObject } from 'react'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from '@/components/ui/toaster'
import { Text } from '@/components/ui/typography'
import { useInbox } from '@/features/inbox/inbox-context'
import type { TaskStatus } from '@/features/inbox/types'
import type { AssignedTask } from './task-data'

/** Keep task confirmation, feedback, and focus behavior the same on every task surface. */
export function useTaskActions(currentUser: string, fallbackFocus: RefObject<HTMLElement | null>, canManageOthers = false) {
  const { changeTaskStatus: saveStatus } = useInbox()
  const [completion, setCompletion] = useState<AssignedTask | null>(null)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [reopeningTaskIds, setReopeningTaskIds] = useState<ReadonlySet<string>>(() => new Set())
  const [error, setError] = useState('')
  const reopening = useRef(new Set<string>())
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)

  const reopenTask = useCallback((task: AssignedTask, trigger?: HTMLButtonElement) => {
    if (reopening.current.has(task.id)) return
    reopening.current.add(task.id)
    setReopeningTaskIds((current) => new Set(current).add(task.id))
    const notice = trigger ? undefined : toast.loading('Reopening task…', { description: task.title })
    void saveStatus(task.id, 'open').then(() => {
      toast.success('Task reopened', { id: notice, description: task.title })
      if (trigger) requestAnimationFrame(() => { if (!trigger.isConnected) fallbackFocus.current?.focus({ preventScroll: true }) })
    }).catch(() => toast.error('Could not reopen the task. Try again.', { id: notice }))
      .finally(() => {
        reopening.current.delete(task.id)
        setReopeningTaskIds((current) => { const next = new Set(current); next.delete(task.id); return next })
      })
  }, [saveStatus, fallbackFocus])

  const changeTaskStatus = useCallback((task: AssignedTask, next: TaskStatus, trigger: HTMLButtonElement) => {
    if (task.ownerId !== currentUser && !canManageOthers) return
    if (next === 'completed') {
      triggerRef.current = trigger
      setCompletion(task)
      setError('')
      setOpen(true)
      return
    }
    reopenTask(task, trigger)
  }, [currentUser, canManageOthers, reopenTask])

  async function confirmCompletion() {
    if (!completion || !open || saving) return
    const task = completion
    setSaving(true); setError('')
    try {
      await saveStatus(task.id, 'completed')
      setOpen(false)
      toast.success('Task completed', {
        description: task.title,
        action: { label: 'Undo', onClick: () => reopenTask(task) },
      })
    } catch (error) { setError(error instanceof Error ? error.message : 'Could not complete the task. Try again.') }
    finally { setSaving(false) }
  }

  function restoreFocus() {
    queueMicrotask(() => {
      const target = triggerRef.current?.isConnected ? triggerRef.current : fallbackFocus.current
      target?.focus({ preventScroll: true })
    })
    return false
  }

  const completionDialog = <Dialog open={open} onOpenChange={(next) => { if (!saving) setOpen(next) }}>
    <DialogContent closeDisabled={saving} initialFocus={cancelRef} finalFocus={restoreFocus}>
      <DialogHeader>
        <DialogTitle size="card">Complete this task?</DialogTitle>
        <DialogDescription>Confirm that this task is finished.</DialogDescription>
      </DialogHeader>
      <div className="space-y-1">
        <Text size="small" weight="medium" className="wrap-anywhere">{completion?.title}</Text>
        <Text size="caption" tone="muted" className="wrap-anywhere">{completion?.related.map((item) => item.label).join(' · ')}</Text>
      </div>
      {error ? <Alert>{error}</Alert> : null}
      <DialogFooter>
        <Button ref={cancelRef} variant="outline" disabled={saving} onClick={() => setOpen(false)}>Cancel</Button>
        <Button loading={saving} onClick={confirmCompletion}>Complete task</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  return { changeTaskStatus, completionDialog, reopeningTaskIds }
}
