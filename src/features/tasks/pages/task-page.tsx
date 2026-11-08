import { useRef } from 'react'
import { ListTodo } from 'lucide-react'
import { Link, useParams, useRouteLoaderData } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { TextLink } from '@/components/ui/text-link'
import { Heading, Text } from '@/components/ui/typography'
import { useReportDetailLink } from '@/features/inbox/components/report-detail-context'
import { useInbox } from '@/features/inbox/inbox-context'
import type { WorkspaceData } from '../../../../shared/types/directory'
import { TaskEditor } from '../components/task-editor'
import { TaskStatusButton } from '../components/task-status-button'
import { formatTaskDue, resolveTasks } from '../task-data'
import { useTaskActions } from '../use-task-actions'

export function TaskPage() {
  const { taskId } = useParams()
  return <TaskDetailContent taskId={taskId} />
}

export function TaskDetailContent({ taskId, inDrawer = false }: { taskId?: string; inDrawer?: boolean }) {
  const { user } = useRouteLoaderData('workspace') as WorkspaceData
  const { data, reports, tasks } = useInbox()
  const reportLink = useReportDetailLink()
  const container = useRef<HTMLDivElement>(null)
  const { changeTaskStatus, pendingTaskIds } = useTaskActions(user.id, container, user.role === 'administrator')
  const saved = tasks.find((item) => item.id === taskId)
  const task = saved ? resolveTasks([saved], reports, data)[0] : undefined
  if (!task) return <EmptyState size="page" icon={<ListTodo />} title="Task not found" action={<Button render={<Link to="/app/tasks" />}>View my tasks</Button>} />
  const canManage = task.ownerId === user.id || user.role === 'administrator'
  const hasReport = Boolean(task.reportId && task.reportTitle)
  const content = <>
    <Heading level={2} size="card" className="wrap-anywhere">{task.title}</Heading>
    <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
      <div className="space-y-1"><Text render={<dt />} size="caption" tone="muted">Status</Text><Text render={<dd />} size="small">{task.status === 'completed' ? 'Completed' : 'Open'}</Text></div>
      <div className="space-y-1"><Text render={<dt />} size="caption" tone="muted">Assigned to</Text><Text render={<dd />} size="small" className="wrap-anywhere">{task.owner}</Text></div>
      <div className="space-y-1"><Text render={<dt />} size="caption" tone="muted">Due date</Text><Text render={<dd />} size="small">{task.due ? formatTaskDue(task.due) : 'No due date'}{task.careRuleId ? ' · Care schedule' : ''}</Text></div>
    </dl>
    {task.completionNote ? <div className="space-y-1"><Text size="caption" tone="muted">{task.status === 'completed' ? 'Completion note' : 'Previous completion note'}</Text><Text size="small" className="whitespace-pre-wrap wrap-anywhere">{task.completionNote}</Text></div> : null}
    {hasReport || task.related.length ? <section aria-labelledby="task-related-items" className="space-y-2">
      <Heading id="task-related-items" level={3} size="compact">Related items</Heading>
      <dl className="space-y-1">
        {hasReport ? <div className="grid grid-cols-[6rem_minmax(0,1fr)] gap-x-3"><Text render={<dt />} size="caption" tone="muted" className="self-center">Report</Text><dd className="min-w-0"><TextLink variant="underlined" render={<Link {...reportLink(task.reportId!, `my-task:${task.id}`)} />} aria-label={`Open report: ${task.reportTitle}`} className="max-w-full"><span className="wrap-anywhere">{task.reportTitle}</span></TextLink></dd></div> : null}
        {task.related.map((item, index) => {
          const label = item.type === 'cat' ? 'Cat' : item.type === 'colony' ? 'Colony' : item.type === 'person' ? 'Person' : item.type === 'paperwork' ? 'Paperwork' : 'Other'
          const linked = item.id && (item.type === 'cat' || item.type === 'colony')
          return <div key={`${item.type}-${item.id ?? index}`} className="grid grid-cols-[6rem_minmax(0,1fr)] gap-x-3">
            <Text render={<dt />} size="caption" tone="muted" className="self-center">{label}</Text>
            {linked ? <dd className="min-w-0"><TextLink variant="underlined" render={<Link to={`/app/${item.type === 'cat' ? 'cats' : 'colonies'}/${encodeURIComponent(item.id!)}`} />} aria-label={`Open ${item.type}: ${item.label}`} className="max-w-full"><span className="wrap-anywhere">{item.label}</span></TextLink></dd> : <Text render={<dd />} size="small" className="self-center wrap-anywhere">{item.label}</Text>}
          </div>
        })}
      </dl>
    </section> : null}
    {canManage ? <div className="flex flex-wrap items-center gap-2"><TaskEditor task={task} currentUser={user.id} fallbackFocus={container} /><TaskStatusButton task={task} loading={pendingTaskIds.has(task.id)} onStatusChange={changeTaskStatus} /></div> : null}
  </>
  return <div ref={container} tabIndex={-1} className="space-y-4 outline-none focus-visible:ring-2 focus-visible:ring-ring">
    {!inDrawer ? <title>{`${task.title} · Mews`}</title> : null}
    {inDrawer ? <div className="space-y-6">{content}</div> : <Card><CardContent className="space-y-6">{content}</CardContent></Card>}
  </div>
}
