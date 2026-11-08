import { useEffect, useMemo, useRef, useState } from 'react'
import { CheckCheck, Search } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import type { PaginationState } from '@tanstack/react-table'
import { DataTable, useDataTable } from '@/components/ui/data-table'
import { DataTableToolbar } from '@/components/ui/data-table-toolbar'
import { EmptyState } from '@/components/ui/empty-state'
import { RecordListItem } from '@/components/ui/record-list'
import { Button } from '@/components/ui/button'
import { Text } from '@/components/ui/typography'
import { useInbox } from '@/features/inbox/inbox-context'
import type { TaskStatus } from '@/features/inbox/types'
import { formatTaskDue, getAssignedTasks } from '../task-data'
import { useTaskActions } from '../use-task-actions'
import { taskColumnClassName, taskColumns, TaskTableActions } from './task-columns'
import { useTaskDetailLink } from './task-detail-context'
import { TaskEditor } from './task-editor'

type TaskFilter = TaskStatus | 'all'
const statuses = [
  { value: 'open', label: 'Open tasks' },
  { value: 'completed', label: 'Completed tasks' },
  { value: 'all', label: 'All tasks' },
]

export function MyTasksScreen({ currentUser, initialStatus = 'open', scope = 'mine' }: { currentUser: string; initialStatus?: TaskFilter; scope?: 'mine' | 'team' }) {
  const { data, reports, tasks: allTasks } = useInbox()
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedTask = searchParams.get('task')
  const [status, setStatus] = useState<TaskFilter>(initialStatus)
  const [assignee, setAssignee] = useState('')
  const team = scope === 'team'
  const taskLink = useTaskDetailLink()
  const [search, setSearch] = useState('')
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 })
  const contentRef = useRef<HTMLDivElement>(null)
  const query = search.trim().toLocaleLowerCase()
  const tasks = useMemo(() => getAssignedTasks(allTasks, reports, data, team ? undefined : currentUser), [allTasks, reports, data, currentUser, team])
  // Include owners of existing tasks even if they are unavailable for new work.
  const assignees = useMemo(() => [...new Map(allTasks.map((task) => [task.ownerId, { value: task.ownerId, label: task.owner }])).values()]
    .sort((a, b) => a.label.localeCompare(b.label) || a.value.localeCompare(b.value)), [allTasks])
  const visibleTasks = useMemo(() => tasks.filter((task) => (!requestedTask || task.id === requestedTask)
    && (!team || !assignee || task.ownerId === assignee)
    && (status === 'all' || task.status === status)
    && (!query || [task.title, task.reportTitle, ...(team ? [task.owner] : []), ...task.related.map((item) => item.label)].join(' ').toLocaleLowerCase().includes(query))), [tasks, status, query, requestedTask, team, assignee])

  useEffect(() => {
    if (!requestedTask) return
    setStatus('open')
    setSearch('')
    setAssignee('')
    setPagination((current) => ({ ...current, pageIndex: 0 }))
  }, [requestedTask])

  function clearRequestedTask() {
    if (!requestedTask) return
    const next = new URLSearchParams(searchParams)
    next.delete('task')
    setSearchParams(next, { replace: true, preventScrollReset: true })
  }

  const { changeTaskStatus, pendingTaskIds } = useTaskActions(currentUser, contentRef, team)
  const table = useDataTable({
    data: visibleTasks,
    columns: taskColumns,
    getRowId: (task) => task.id,
    state: { columnVisibility: { owner: team }, pagination: { ...pagination, pageIndex: Math.min(pagination.pageIndex, Math.max(0, Math.ceil(visibleTasks.length / pagination.pageSize) - 1)) } },
    onPaginationChange: setPagination,
  })

  const emptyState = <EmptyState
        icon={query || assignee ? <Search /> : <CheckCheck />}
        title={requestedTask ? 'Task unavailable' : query || assignee ? 'No matching tasks' : status === 'completed' ? 'No completed tasks' : status === 'open' ? 'No open tasks' : team ? 'No team tasks' : 'No tasks assigned to you'}
        description={requestedTask ? team ? 'This task may be complete or unavailable.' : 'This task may be complete or no longer assigned to you.' : query || assignee ? 'Try another search or change the filters.' : team ? 'Tasks assigned across the team will appear here.' : status === 'completed' ? 'Tasks you complete will appear here.' : 'Tasks assigned to you will appear here.'}
      />

  return <div className="space-y-3">
    <DataTableToolbar
      label="Task controls"
      search={{ label: team ? 'Search team tasks' : 'Search my tasks', placeholder: 'Search tasks…', value: search, onValueChange: (value) => { clearRequestedTask(); setSearch(value); table.firstPage() } }}
      filterPresentation={team ? 'popover' : 'inline'}
      filters={[
        { id: 'status', label: 'Filter tasks by status', displayLabel: 'Status', value: status, active: status !== 'all', options: statuses, onValueChange: (value) => { clearRequestedTask(); setStatus(value as TaskFilter); table.firstPage() } },
        ...(team ? [{ id: 'assignee', label: 'Filter tasks by assignee', displayLabel: 'Assignee', value: assignee, active: Boolean(assignee), options: [{ value: '', label: 'All assignees' }, ...assignees], onValueChange: (value: string) => { clearRequestedTask(); setAssignee(value); table.firstPage() } }] : []),
      ]}
      onReset={team ? () => { clearRequestedTask(); setStatus('all'); setAssignee(''); table.firstPage() } : undefined}
      resetActive={status !== 'all' || Boolean(assignee)}
      actions={<TaskEditor currentUser={currentUser} onCreated={() => { clearRequestedTask(); setSearch(''); setAssignee(''); setStatus('open'); table.firstPage() }} />}
    />
    {requestedTask ? <div className="flex flex-wrap items-center gap-2"><Text size="small" tone="muted">Showing selected task.</Text><Button variant="ghost" size="sm" onClick={clearRequestedTask}>{team ? 'View all team tasks' : 'View all my tasks'}</Button></div> : null}
    <TaskTableActions value={{ currentUser, showAssignee: team, pendingTaskIds, onStatusChange: changeTaskStatus }}><DataTable ref={contentRef} table={table} label={team ? 'Team tasks' : 'My tasks'} itemName="task" columnClassName={taskColumnClassName} emptyState={emptyState} scrollMode="contained"
      mobileListKey={`${query}:${status}:${requestedTask}:${assignee}`}
      renderMobileRow={(task) => <RecordListItem render={<Link {...taskLink(task.id, `my-task:${task.id}`)} />}
        aria-label={`View task: ${task.title}`} title={task.title}
        meta={[task.colony, ...task.related.filter((item) => item.type !== 'colony').map((item) => item.label)].filter(Boolean).join(' · ')}
        description={<>{team ? `Assigned to ${task.owner} · ` : ''}{task.status === 'completed' ? 'Completed · ' : ''}{task.due ? `Due ${formatTaskDue(task.due)}` : 'No due date'}{task.careRuleId ? ' · Care schedule' : ''}</>} />}
    /></TaskTableActions>
  </div>
}
