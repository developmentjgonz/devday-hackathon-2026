import { Check, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Heading, Text } from '@/components/ui/typography'
import type { TaskStatus } from '@/features/inbox/types'
import { formatTaskDue, type AssignedTask } from '../task-data'
import { TaskRecordActions } from './task-record-actions'
import { TaskEditor } from './task-editor'

export function TaskCards({ tasks, onStatusChange, reopeningTaskIds, headingLevel = 2, currentUser }: {
  tasks: AssignedTask[]
  currentUser: string
  reopeningTaskIds: ReadonlySet<string>
  onStatusChange: (task: AssignedTask, status: TaskStatus, trigger: HTMLButtonElement) => void
  headingLevel?: 2 | 3
}) {
  return <ul aria-label="Tasks" className="grid list-none gap-3 p-0 sm:grid-cols-2 xl:grid-cols-3">
    {tasks.map((task) => {
      const completed = task.status === 'completed'
      return <Card key={task.id} render={<li />} tone="note" size="sm" className="min-h-48">
        <CardContent className="flex flex-1 flex-col gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center justify-between gap-x-3"><Text size="caption" tone="muted" className="wrap-anywhere">{task.colony || 'Task'}</Text>{completed ? <Text size="caption" tone="muted">Completed</Text> : null}</div>
            <Heading level={headingLevel} size="card" className="wrap-anywhere">{task.title}</Heading>
            {task.related.filter((item) => item.type !== 'colony').map((item, index) => <Text key={`${item.type}-${item.id ?? index}`} size="caption" tone="muted" className="wrap-anywhere">{item.type === 'cat' ? item.label : `${item.type === 'person' ? 'Person' : item.type === 'paperwork' ? 'Paperwork' : 'Other'}: ${item.label}`}</Text>)}
            <Text size="caption" tone="muted" render={task.due ? <time dateTime={task.due} /> : undefined}>{task.due ? `Due ${formatTaskDue(task.due)}` : 'No due date'}</Text>
          </div>
          <div className="mt-auto space-y-2">
            <div className="flex flex-wrap items-center"><TaskRecordActions task={task} /><TaskEditor task={task} currentUser={currentUser} /></div>
            <div className="flex justify-end">
            <Button variant="outline" size="sm" loading={reopeningTaskIds.has(task.id)} aria-label={`${completed ? 'Reopen' : 'Complete'} task: ${task.title}`} onClick={(event) => onStatusChange(task, completed ? 'open' : 'completed', event.currentTarget)}>
              {completed ? <RotateCcw aria-hidden="true" /> : <Check aria-hidden="true" />}{completed ? 'Reopen' : 'Complete'}
            </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    })}
  </ul>
}
