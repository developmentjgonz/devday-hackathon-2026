import { useEffect, useMemo, useRef, useState } from 'react'
import { CheckCheck, LayoutGrid, List, Search } from 'lucide-react'
import { useSearchParams } from 'react-router'
import type { PaginationState } from '@tanstack/react-table'
import { Card } from '@/components/ui/card'
import { DataTable, DataTablePagination, useDataTable } from '@/components/ui/data-table'
import { DataTableToolbar } from '@/components/ui/data-table-toolbar'
import { EmptyState } from '@/components/ui/empty-state'
import { ViewSwitcher } from '@/components/ui/view-switcher'
import { Text } from '@/components/ui/typography'
import { useInbox } from '@/features/inbox/inbox-context'
import type { TaskStatus } from '@/features/inbox/types'
import { getAssignedTasks } from '../task-data'
import { useTaskActions } from '../use-task-actions'
import { taskColumnClassName, useTaskColumns } from './task-columns'
import { TaskCards } from './task-cards'
import { TaskEditor } from './task-editor'

type TaskFilter = TaskStatus | 'all'
type TaskView = 'cards' | 'list'
const viewPreferenceKey = 'mews.tasks.view'
function preferredView(): TaskView {
  try { return window.localStorage.getItem(viewPreferenceKey) === 'list' ? 'list' : 'cards' } catch { return 'cards' }
}
const statuses = [
  { value: 'open', label: 'Open tasks' },
  { value: 'completed', label: 'Completed tasks' },
  { value: 'all', label: 'All tasks' },
]

export function MyTasksScreen({ currentUser, initialStatus = 'open' }: { currentUser: string; initialStatus?: TaskFilter }) {
  const { data, reports, tasks: allTasks } = useInbox()
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedTask = searchParams.get('task')
  const [status, setStatus] = useState<TaskFilter>(initialStatus)
  const [view, setView] = useState<TaskView>(preferredView)
  const [search, setSearch] = useState('')
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 })
  const contentRef = useRef<HTMLDivElement>(null)
  const query = search.trim().toLocaleLowerCase()
  const tasks = useMemo(() => getAssignedTasks(allTasks, reports, data, currentUser), [allTasks, reports, data, currentUser])
  const visibleTasks = useMemo(() => tasks.filter((task) => (!requestedTask || task.id === requestedTask)
    && (status === 'all' || task.status === status)
    && (!query || [task.title, task.reportTitle, ...task.related.map((item) => item.label)].join(' ').toLocaleLowerCase().includes(query))), [tasks, status, query, requestedTask])

  useEffect(() => {
    if (!requestedTask) return
    setStatus('open')
    setSearch('')
    setPagination((current) => ({ ...current, pageIndex: 0 }))
  }, [requestedTask])

  function clearRequestedTask() {
    if (!requestedTask) return
    const next = new URLSearchParams(searchParams)
    next.delete('task')
    setSearchParams(next, { replace: true, preventScrollReset: true })
  }

  const { changeTaskStatus, completionDialog, reopeningTaskIds } = useTaskActions(currentUser, contentRef)
  const columns = useTaskColumns(changeTaskStatus, currentUser, reopeningTaskIds)
  const table = useDataTable({
    data: visibleTasks,
    columns,
    getRowId: (task) => task.id,
    state: { pagination: { ...pagination, pageIndex: Math.min(pagination.pageIndex, Math.max(0, Math.ceil(visibleTasks.length / pagination.pageSize) - 1)) } },
    onPaginationChange: setPagination,
  })

  function changeView(next: TaskView) {
    setView(next)
    try { window.localStorage.setItem(viewPreferenceKey, next) } catch { /* The view still works if storage is unavailable. */ }
  }

  const emptyState = <EmptyState
        icon={query ? <Search /> : <CheckCheck />}
        title={requestedTask ? 'Task unavailable' : query ? 'No matching tasks' : status === 'completed' ? 'No completed tasks' : status === 'open' ? 'No open tasks' : 'No tasks assigned to you'}
        description={requestedTask ? 'This task may be complete or no longer assigned to you.' : query ? 'Try another task or related item.' : status === 'completed' ? 'Tasks you complete will appear here.' : 'Tasks assigned to you will appear here.'}
      />

  return <><div className="space-y-3">
    <DataTableToolbar
      label="Task controls"
      search={{ label: 'Search my tasks', placeholder: 'Search tasks…', value: search, onValueChange: (value) => { clearRequestedTask(); setSearch(value); table.firstPage() } }}
      filters={[{ id: 'status', label: 'Filter tasks by status', value: status, options: statuses, onValueChange: (value) => { clearRequestedTask(); setStatus(value as TaskFilter); table.firstPage() } }]}
      onReset={() => { clearRequestedTask(); setSearch(''); table.firstPage() }}
      resetActive={Boolean(query || requestedTask)}
      actions={<><ViewSwitcher label="Task view" value={view} onValueChange={changeView} options={[
        { value: 'cards', label: 'Cards', icon: <LayoutGrid aria-hidden="true" /> },
        { value: 'list', label: 'List', icon: <List aria-hidden="true" /> },
      ]} /><TaskEditor currentUser={currentUser} onCreated={() => { clearRequestedTask(); setSearch(''); setStatus('open'); table.firstPage() }} /></>}
    />
    {requestedTask ? <Text size="small" tone="muted">Showing selected task. Clear filters to see all your tasks.</Text> : null}
    {view === 'list' ? <DataTable ref={contentRef} table={table} label="My tasks" itemName="task" columnClassName={taskColumnClassName} emptyState={emptyState} /> :
      <div ref={contentRef} role="region" aria-label="My tasks" tabIndex={-1} className="rounded-control outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {table.getRowModel().rows.length ? <TaskCards tasks={table.getRowModel().rows.map((row) => row.original)} onStatusChange={changeTaskStatus} reopeningTaskIds={reopeningTaskIds} currentUser={currentUser} /> : <Card>{emptyState}</Card>}
        <DataTablePagination table={table} label="My tasks" itemName="task" presentation="cards" />
      </div>}
  </div>
  {completionDialog}</>
}
