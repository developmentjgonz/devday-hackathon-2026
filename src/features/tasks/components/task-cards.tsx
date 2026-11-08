import { Card, CardContent } from '@/components/ui/card'
import { Heading, Text } from '@/components/ui/typography'
import { formatTaskDue, type AssignedTask } from '../task-data'
import { TaskRecordActions } from './task-record-actions'
import { TaskEditor } from './task-editor'
import { TaskStatusButton, type TaskStatusChange } from './task-status-button'

export function TaskCards({ tasks, onStatusChange, pendingTaskIds, headingLevel = 2, currentUser }: {
  tasks: AssignedTask[]
  currentUser: string
  pendingTaskIds: ReadonlySet<string>
  onStatusChange: TaskStatusChange
  headingLevel?: 2 | 3
}) {
  return <ul aria-label="Tasks" className="grid list-none gap-3 p-0 sm:grid-cols-2 2xl:grid-cols-3">
    {tasks.map((task) => {
      const completed = task.status === 'completed'
      return <Card key={task.id} render={<li />} tone="note" size="sm" className="min-h-40">
        <CardContent className="flex flex-1 flex-col gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center justify-between gap-x-3"><Text size="caption" tone="muted" className="wrap-anywhere">{task.colony || 'Task'}</Text>{completed ? <Text size="caption" tone="muted">Completed</Text> : null}</div>
            <Heading level={headingLevel} size="card" className="wrap-anywhere">{task.title}</Heading>
            {task.related.filter((item) => item.type !== 'colony').map((item, index) => <Text key={`${item.type}-${item.id ?? index}`} size="caption" tone="muted" className="wrap-anywhere">{item.type === 'cat' ? item.label : `${item.type === 'person' ? 'Person' : item.type === 'paperwork' ? 'Paperwork' : 'Other'}: ${item.label}`}</Text>)}
            <Text size="caption" tone="muted" render={task.due ? <time dateTime={task.due} /> : undefined}>{task.due ? `Due ${formatTaskDue(task.due)}` : 'No due date'}</Text>
            {task.careRuleId ? <Text size="caption" tone="muted">Care schedule</Text> : null}
          </div>
          <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-2">
            <div className="flex min-w-0 flex-wrap items-center"><TaskRecordActions task={task} /><TaskEditor task={task} currentUser={currentUser} /></div>
            <div className="ml-auto"><TaskStatusButton task={task} loading={pendingTaskIds.has(task.id)} onStatusChange={onStatusChange} /></div>
          </div>
        </CardContent>
      </Card>
    })}
  </ul>
}
