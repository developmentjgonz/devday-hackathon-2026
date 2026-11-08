import { DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Drawer, DrawerBody, DrawerContent, DrawerHeader } from '@/components/ui/drawer'
import { TaskDetailContent } from '../pages/task-page'
import { useTaskDetail } from './task-detail-context'

export function TaskDetailHost() {
  const { taskId, open, closeTask, returnFocus } = useTaskDetail()
  if (!taskId) return null
  return <Drawer open={open} onOpenChange={(next) => { if (!next) closeTask() }}>
    <DrawerContent closeLabel="Close task" finalFocus={() => { queueMicrotask(() => returnFocus()?.focus({ preventScroll: true })); return false }}>
      <DrawerHeader density="compact"><DialogTitle size="card" className="flex min-h-11 items-center pr-10">Task</DialogTitle><DialogDescription className="sr-only">Task details and actions.</DialogDescription></DrawerHeader>
      <DrawerBody><TaskDetailContent taskId={taskId} inDrawer /></DrawerBody>
    </DrawerContent>
  </Drawer>
}
