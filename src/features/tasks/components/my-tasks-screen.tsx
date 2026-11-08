import { useCallback, useMemo, useRef, useState } from 'react'
import { CheckCheck, Search } from 'lucide-react'
import type { PaginationState } from '@tanstack/react-table'
import { DataTable, useDataTable } from '@/components/ui/data-table'
import { EmptyState } from '@/components/ui/empty-state'
import { toast } from '@/components/ui/toaster'
import { useInbox } from '@/features/inbox/inbox-context'
import type { TaskStatus } from '@/features/inbox/types'
import { getAssignedTasks, setAssignedTaskStatus, type AssignedTask } from '../task-data'
import { taskColumnClassName, useTaskColumns } from './task-columns'

type TaskFilter = TaskStatus | 'all'
const statuses = [
  { value: 'open', label: 'Open tasks' },
  { value: 'completed', label: 'Completed tasks' },
  { value: 'all', label: 'All tasks' },
]

export function MyTasksScreen({ currentUser, initialStatus = 'open' }: { currentUser: string; initialStatus?: TaskFilter }) {
  const { data, reports, setReports } = useInbox()
  const [status, setStatus] = useState<TaskFilter>(initialStatus)
  const [search, setSearch] = useState('')
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 })
  const tableRef = useRef<HTMLDivElement>(null)
  const query = search.trim().toLocaleLowerCase()
  const tasks = useMemo(() => getAssignedTasks(reports, data.colonies, currentUser), [reports, data.colonies, currentUser])
  const visibleTasks = useMemo(() => tasks.filter((task) => (status === 'all' || task.status === status)
    && (!query || [task.title, task.reportTitle, task.colony].join(' ').toLocaleLowerCase().includes(query))), [tasks, status, query])

  const changeTaskStatus = useCallback((task: AssignedTask, next: TaskStatus, trigger: HTMLButtonElement) => {
    setReports((items) => setAssignedTaskStatus(items, task.reportId, task.id, currentUser, next))
    toast.success(next === 'completed' ? 'Task completed' : 'Task reopened', { description: task.title })
    requestAnimationFrame(() => {
      if (!trigger.isConnected) tableRef.current?.focus({ preventScroll: true })
    })
  }, [currentUser, setReports])
  const columns = useTaskColumns(changeTaskStatus)
  const table = useDataTable({
    data: visibleTasks,
    columns,
    getRowId: (task) => `${task.reportId}/${task.id}`,
    state: { pagination: { ...pagination, pageIndex: Math.min(pagination.pageIndex, Math.max(0, Math.ceil(visibleTasks.length / pagination.pageSize) - 1)) } },
    onPaginationChange: setPagination,
  })

  return <DataTable
      ref={tableRef}
      table={table}
      label="My tasks"
      itemName="task"
      columnClassName={taskColumnClassName}
      toolbar={{
        search: { label: 'Search my tasks', placeholder: 'Search tasks…', value: search, onValueChange: (value) => { setSearch(value); table.firstPage() } },
        filters: [{ id: 'status', label: 'Filter tasks by status', value: status, options: statuses, onValueChange: (value) => { setStatus(value as TaskFilter); table.firstPage() } }],
        onReset: query ? () => { setSearch(''); table.firstPage() } : undefined,
      }}
      emptyState={<EmptyState
        icon={query ? <Search /> : <CheckCheck />}
        title={query ? 'No matching tasks' : status === 'completed' ? 'No completed tasks' : status === 'open' ? 'No open tasks' : 'No tasks assigned to you'}
        description={query ? 'Try another task, report, or colony name.' : status === 'completed' ? 'Tasks you complete will appear here.' : 'Tasks assigned to you will appear here.'}
      />}
    />
}
