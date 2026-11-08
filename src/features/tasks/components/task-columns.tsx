import { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { createDataColumnHelper } from '@/components/ui/data-table'
import { Text } from '@/components/ui/typography'
import { formatTaskDue, type AssignedTask } from '../task-data'
import type { TaskStatus } from '@/features/inbox/types'
import { TaskRecordActions } from './task-record-actions'
import { TaskEditor } from './task-editor'

const column = createDataColumnHelper<AssignedTask>()

export const taskColumnClassName = (id: string) => ({
  colony: 'hidden w-32 lg:table-cell',
  due: 'hidden w-36 md:table-cell',
  action: 'w-28',
})[id]

export function useTaskColumns(onStatusChange: (task: AssignedTask, status: TaskStatus, trigger: HTMLButtonElement) => void, currentUser: string, reopeningTaskIds: ReadonlySet<string>) {
  return useMemo(() => column.columns([
    column.accessor('title', {
      header: 'Task',
      cell: ({ row }) => <div className="min-w-0 space-y-1">
        <Text size="small" weight="medium" className="wrap-anywhere">{row.original.title}</Text>
        {row.original.reportTitle ? <Text size="caption" tone="muted" className="wrap-anywhere">{row.original.reportTitle}</Text> : null}
        <div className="lg:hidden">{row.original.related.length ? row.original.related.map((item, index) => <Text key={`${item.type}-${item.id ?? index}`} size="caption" tone="muted" className="wrap-anywhere">{item.label}</Text>) : row.original.colony ? <Text size="caption" tone="muted">{row.original.colony}</Text> : null}</div>
        <div className="md:hidden"><Text size="caption" tone="muted">{row.original.due ? `Due ${formatTaskDue(row.original.due)}` : 'No due date'}</Text></div>
        <div className="flex flex-wrap items-center"><TaskRecordActions task={row.original} /><TaskEditor task={row.original} currentUser={currentUser} /></div>
        {row.original.status === 'completed' ? <Text size="caption" tone="muted">Completed</Text> : null}
      </div>,
    }),
    column.accessor('colony', { header: 'Related items', cell: ({ row }) => <div className="space-y-1">{row.original.related.length ? row.original.related.map((item, index) => <Text key={`${item.type}-${item.id ?? index}`} size="caption" className="wrap-anywhere">{item.label}</Text>) : <Text size="caption" tone="muted">{row.original.colony || 'None'}</Text>}</div> }),
    column.accessor((task) => task.due || '9999-12-31', {
      id: 'due', header: 'Due date',
      cell: ({ row }) => <Text render={row.original.due ? <time dateTime={row.original.due} /> : undefined} size="caption" tone="muted">{formatTaskDue(row.original.due)}</Text>,
    }),
    column.display({
      id: 'action', header: 'Action',
      cell: ({ row }) => {
        const completed = row.original.status === 'completed'
        return <Button variant="outline" size="sm" loading={reopeningTaskIds.has(row.original.id)} aria-label={`${completed ? 'Reopen' : 'Complete'} task: ${row.original.title}`} onClick={(event) => onStatusChange(row.original, completed ? 'open' : 'completed', event.currentTarget)}>{completed ? 'Reopen' : 'Complete'}</Button>
      },
    }),
  ]), [onStatusChange, currentUser, reopeningTaskIds])
}
