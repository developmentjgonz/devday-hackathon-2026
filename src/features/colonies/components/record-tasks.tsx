import { useRef } from 'react'
import { Check, ListTodo, RotateCcw } from 'lucide-react'
import { Link, useRouteLoaderData } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { TextLink } from '@/components/ui/text-link'
import { Heading, Text } from '@/components/ui/typography'
import { TaskEditor } from '@/features/tasks/components/task-editor'
import { formatTaskDue, type AssignedTask } from '@/features/tasks/task-data'
import { useTaskActions } from '@/features/tasks/use-task-actions'
import type { WorkspaceData } from '../../../../shared/types/directory'

export function RecordTasks({ tasks, type }: { tasks: AssignedTask[]; type: 'cat' | 'colony' }) {
  const { user } = useRouteLoaderData('workspace') as WorkspaceData
  const regionRef = useRef<HTMLDivElement>(null)
  const { changeTaskStatus, completionDialog, reopeningTaskIds } = useTaskActions(user.id, regionRef, user.role === 'administrator')

  const openTasks = tasks.filter((task) => task.status === 'open')
  const completedTasks = tasks.filter((task) => task.status === 'completed')
  const list = (items: AssignedTask[]) => <Card size="sm"><CardContent><ul className="divide-y divide-border">
      {items.map((task) => {
        const completed = task.status === 'completed'
        const canManage = task.ownerId === user.id || user.role === 'administrator'
        return <li key={task.id} className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
          <div className="min-w-0 space-y-1">
            <Text size="small" weight="medium" className="wrap-anywhere">{task.title}</Text>
            <Text size="caption" tone="muted" className="wrap-anywhere">Assigned to {task.owner} · {task.due ? `Due ${formatTaskDue(task.due)}` : 'No due date'}</Text>
            {task.reportId && task.reportTitle ? <TextLink className="max-w-full wrap-anywhere" render={<Link to={`/app/reports?report=${encodeURIComponent(task.reportId)}`} />}>View report: {task.reportTitle}</TextLink> : null}
          </div>
          {canManage ? <div className="flex flex-wrap items-center gap-1">
            <TaskEditor task={task} currentUser={user.id} fallbackFocus={regionRef} />
            <Button variant="outline" size="sm" loading={reopeningTaskIds.has(task.id)} aria-label={`${completed ? 'Reopen' : 'Complete'} task: ${task.title}`} onClick={(event) => changeTaskStatus(task, completed ? 'open' : 'completed', event.currentTarget)}>
              {completed ? <RotateCcw aria-hidden="true" /> : <Check aria-hidden="true" />}{completed ? 'Reopen' : 'Complete'}
            </Button>
          </div> : null}
        </li>
      })}
    </ul></CardContent></Card>
  return <><div ref={regionRef} tabIndex={-1} className="space-y-6 outline-none focus-visible:ring-2 focus-visible:ring-ring">
    <section aria-labelledby={`${type}-open-tasks`} className="space-y-3">
      <Heading id={`${type}-open-tasks`} level={2} size="card">Open tasks</Heading>
      {openTasks.length ? list(openTasks) : <EmptyState icon={<ListTodo />} title="No open tasks" />}
    </section>
    {completedTasks.length ? <section aria-labelledby={`${type}-completed-tasks`} className="space-y-3">
      <Heading id={`${type}-completed-tasks`} level={2} size="card">Completed tasks</Heading>
      {list(completedTasks)}
    </section> : null}
  </div>{completionDialog}</>
}
