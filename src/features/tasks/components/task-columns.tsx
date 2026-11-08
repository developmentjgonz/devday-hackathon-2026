import { useMemo } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { createDataColumnHelper } from '@/components/ui/data-table'
import { TextLink } from '@/components/ui/text-link'
import { Text } from '@/components/ui/typography'
import { formatTaskDue, type AssignedTask } from '../task-data'
import type { TaskStatus } from '@/features/inbox/types'

const column = createDataColumnHelper<AssignedTask>()

export const taskColumnClassName = (id: string) => ({
  colony: 'hidden w-32 lg:table-cell',
  due: 'hidden w-36 md:table-cell',
  action: 'w-28',
})[id]

export function useTaskColumns(onStatusChange: (task: AssignedTask, status: TaskStatus, trigger: HTMLButtonElement) => void) {
  return useMemo(() => column.columns([
    column.accessor('title', {
      header: 'Task',
      cell: ({ row }) => <div className="min-w-0 space-y-1">
        <Text size="small" weight="medium" className="wrap-anywhere">{row.original.title}</Text>
        <TextLink render={<Link to={`/app/reports?report=${encodeURIComponent(row.original.reportId)}`} />} className="min-w-0 max-w-full" aria-label={`Open report: ${row.original.reportTitle}`}>
          <Text render={<span />} size="caption" className="truncate">{row.original.reportTitle}</Text>
        </TextLink>
        <div className="lg:hidden"><Text size="caption" tone="muted" className="wrap-anywhere">{row.original.colony}</Text></div>
        <div className="md:hidden"><Text size="caption" tone="muted">{row.original.due ? `Due ${formatTaskDue(row.original.due)}` : 'No due date'}</Text></div>
        {row.original.status === 'completed' ? <Text size="caption" tone="muted">Completed</Text> : null}
      </div>,
    }),
    column.accessor('colony', { header: 'Colony', cell: ({ getValue }) => <Text size="small" className="wrap-anywhere">{getValue()}</Text> }),
    column.accessor((task) => task.due || '9999-12-31', {
      id: 'due', header: 'Due date',
      cell: ({ row }) => <Text render={row.original.due ? <time dateTime={row.original.due} /> : undefined} size="caption" tone="muted">{formatTaskDue(row.original.due)}</Text>,
    }),
    column.display({
      id: 'action', header: 'Action',
      cell: ({ row }) => {
        const completed = row.original.status === 'completed'
        return <Button variant="outline" size="sm" aria-label={`${completed ? 'Reopen' : 'Complete'} task: ${row.original.title}`} onClick={(event) => onStatusChange(row.original, completed ? 'open' : 'completed', event.currentTarget)}>{completed ? 'Reopen' : 'Complete'}</Button>
      },
    }),
  ]), [onStatusChange])
}
