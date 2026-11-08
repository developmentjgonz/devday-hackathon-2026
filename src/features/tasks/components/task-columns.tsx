import { createContext, use } from 'react'
import { createDataColumnHelper } from '@/components/ui/data-table'
import { Text } from '@/components/ui/typography'
import { formatTaskDue, type AssignedTask } from '../task-data'
import { TaskRecordActions } from './task-record-actions'
import { TaskEditor } from './task-editor'
import { TaskStatusButton, type TaskStatusChange } from './task-status-button'

const column = createDataColumnHelper<AssignedTask>()

export const taskColumnClassName = (id: string) => ({
  owner: 'hidden w-36 md:table-cell',
  colony: 'hidden w-32 lg:table-cell',
  due: 'hidden w-36 md:table-cell',
  action: 'hidden w-44 sm:table-cell',
})[id]

export const TaskTableActions = createContext<{
  currentUser: string
  showAssignee: boolean
  pendingTaskIds: ReadonlySet<string>
  onStatusChange: TaskStatusChange
} | null>(null)

function useTaskTableActions() {
  const value = use(TaskTableActions)
  if (!value) throw new Error('Task table actions need a provider.')
  return value
}

function TaskTitleCell({ row }: { row: { original: AssignedTask } }) {
  const { currentUser, showAssignee } = useTaskTableActions()
  const task = row.original
  return <div className="min-w-0 space-y-1">
    <Text size="small" weight="medium" className="wrap-anywhere">{task.title}</Text>
    {showAssignee ? <div className="md:hidden"><Text size="caption" tone="muted" className="wrap-anywhere">Assigned to {task.owner}</Text></div> : null}
    {task.careRuleId ? <Text size="caption" tone="muted">Care schedule</Text> : null}
    <div className="lg:hidden"><Text size="caption" tone="muted" className="wrap-anywhere">{task.related.map((item) => item.label).join(' · ') || task.colony}</Text></div>
    <div className="flex flex-wrap items-center"><TaskRecordActions task={task} /><TaskEditor task={task} currentUser={currentUser} /></div>
    {task.status === 'completed' ? <Text size="caption" tone="muted">Completed</Text> : null}
  </div>
}

function TaskActionCell({ row }: { row: { original: AssignedTask } }) {
  const { pendingTaskIds, onStatusChange } = useTaskTableActions()
  return <TaskStatusButton task={row.original} loading={pendingTaskIds.has(row.original.id)} onStatusChange={onStatusChange} />
}

// Stable cell components keep confirmation and edit state while action state changes.
export const taskColumns = column.columns([
  column.accessor('title', { header: 'Task', cell: TaskTitleCell }),
  column.accessor('owner', { header: 'Assigned to', cell: ({ row }) => <Text size="caption" className="wrap-anywhere">{row.original.owner}</Text> }),
  column.accessor('colony', { header: 'Related items', cell: ({ row }) => <div className="space-y-1">{row.original.related.length ? row.original.related.map((item, index) => <Text key={`${item.type}-${item.id ?? index}`} size="caption" className="wrap-anywhere">{item.label}</Text>) : <Text size="caption" tone="muted">{row.original.colony || 'None'}</Text>}</div> }),
  column.accessor((task) => task.due || '9999-12-31', {
    id: 'due', header: 'Due date',
    cell: ({ row }) => <Text render={row.original.due ? <time dateTime={row.original.due} /> : undefined} size="caption" tone="muted">{formatTaskDue(row.original.due)}</Text>,
  }),
  column.display({ id: 'action', header: 'Action', cell: TaskActionCell }),
])
