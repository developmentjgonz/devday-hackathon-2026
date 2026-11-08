import { createContext, useContext, useRef, type MouseEvent, type ReactNode } from 'react'
import { matchPath, useLocation, useNavigate } from 'react-router'
import { detailBackgroundKey } from '@/components/layout/detail-route'

type TaskDetailContextValue = {
  taskId: string | null
  open: boolean
  openTask: (id: string, trigger: HTMLElement) => void
  closeTask: () => void
  returnFocus: () => HTMLElement | null
}

const TaskDetailContext = createContext<TaskDetailContextValue | null>(null)

export function TaskDetailProvider({ children, hasBackground }: { children: ReactNode; hasBackground: boolean }) {
  const triggerRef = useRef<HTMLElement | null>(null)
  const triggerKey = useRef<string | undefined>(undefined)
  const location = useLocation()
  const navigate = useNavigate()
  const backgroundKey = detailBackgroundKey(location.state)
  const taskId = hasBackground ? matchPath('/app/tasks/:taskId', location.pathname)?.params.taskId ?? null : null

  function openTask(id: string, trigger: HTMLElement) {
    triggerRef.current = trigger
    triggerKey.current = trigger.dataset.taskDetailTrigger
    void navigate(`/app/tasks/${encodeURIComponent(id)}`, { state: { detailBackgroundKey: backgroundKey ?? location.key }, preventScrollReset: true })
  }

  return <TaskDetailContext value={{
    taskId, open: Boolean(taskId), openTask,
    closeTask: () => { void navigate(-1) },
    returnFocus: () => {
      if (triggerRef.current?.isConnected) return triggerRef.current
      const replacement = triggerKey.current && Array.from(document.querySelectorAll<HTMLElement>('[data-task-detail-trigger]'))
        .find((element) => element.dataset.taskDetailTrigger === triggerKey.current)
      return replacement || document.getElementById('main-content')
    },
  }}>{children}</TaskDetailContext>
}

export function useTaskDetail() {
  const context = useContext(TaskDetailContext)
  if (!context) throw new Error('Task details need a TaskDetailProvider.')
  return context
}

export function useTaskDetailLink() {
  const { openTask } = useTaskDetail()
  return (id: string, triggerKey: string) => ({
    to: `/app/tasks/${encodeURIComponent(id)}`,
    'data-task-detail-trigger': triggerKey,
    onClick: (event: MouseEvent<HTMLAnchorElement>) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.currentTarget.target) return
      event.preventDefault()
      openTask(id, event.currentTarget)
    },
  })
}
