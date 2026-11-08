import { useCallback, useRef, useState, type RefObject } from 'react'
import { toast } from '@/components/ui/toaster'
import { useInbox } from '@/features/inbox/inbox-context'
import type { TaskStatus } from '@/features/inbox/types'
import type { AssignedTask } from './task-data'

/** Keep task feedback and focus behavior the same on every task surface. */
export function useTaskActions(currentUser: string, fallbackFocus: RefObject<HTMLElement | null>, canManageOthers = false) {
  const { changeTaskStatus: saveStatus } = useInbox()
  const [pendingTaskIds, setPendingTaskIds] = useState<ReadonlySet<string>>(() => new Set())
  const pending = useRef(new Set<string>())

  const updateStatus = useCallback(async (task: AssignedTask, status: TaskStatus, trigger?: HTMLButtonElement, completionNote?: string) => {
    if (pending.current.has(task.id)) return false
    const restoreFocus = status === 'completed' || (trigger && document.activeElement === trigger)
    pending.current.add(task.id)
    setPendingTaskIds((current) => new Set(current).add(task.id))
    try {
      await saveStatus(task.id, status, completionNote)
      return true
    } finally {
      pending.current.delete(task.id)
      setPendingTaskIds((current) => { const next = new Set(current); next.delete(task.id); return next })
      if (restoreFocus) requestAnimationFrame(() => {
        if (document.activeElement !== document.body) return
        const target = trigger?.isConnected && !trigger.disabled ? trigger : fallbackFocus.current
        target?.focus({ preventScroll: true })
      })
    }
  }, [saveStatus, fallbackFocus])

  const reopenTask = useCallback(async (task: AssignedTask, trigger?: HTMLButtonElement) => {
    if (pending.current.has(task.id)) return false
    const id = `${trigger ? 'task-status' : 'task-undo'}-${task.id}`
    if (!trigger) toast.loading('Reopening task…', { id, description: task.title })
    try {
      const saved = await updateStatus(task, 'open', trigger)
      if (saved) toast.success('Task reopened', { id, description: task.title })
      return saved
    } catch {
      toast.error('Could not reopen the task. Try again.', { id, description: task.title })
      return false
    }
  }, [updateStatus])

  const changeTaskStatus = useCallback(async (task: AssignedTask, next: TaskStatus, trigger: HTMLButtonElement, completionNote?: string) => {
    if ((task.ownerId !== currentUser && !canManageOthers) || pending.current.has(task.id)) return false
    if (next === 'open') return reopenTask(task, trigger)
    toast.dismiss(`task-undo-${task.id}`)
    const id = `task-status-${task.id}`
    try {
      const saved = await updateStatus(task, 'completed', trigger, completionNote)
      if (saved) toast.success('Task completed', {
        id,
        description: task.title,
        action: { label: 'Undo', onClick: () => { void reopenTask(task) } },
      })
      return saved
    } catch {
      return false
    }
  }, [currentUser, canManageOthers, reopenTask, updateStatus])

  return { changeTaskStatus, pendingTaskIds }
}
