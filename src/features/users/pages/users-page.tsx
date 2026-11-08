import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PaginationState } from '@tanstack/react-table'
import { ArrowLeft, ArrowRight, Search, ShieldCheck, UserRoundPlus, UsersRound } from 'lucide-react'
import { useRevalidator, useRouteLoaderData } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { createDataColumnHelper, DataTable, type DataTableRequest, useDataTable } from '@/components/ui/data-table'
import { DataTableToolbar } from '@/components/ui/data-table-toolbar'
import { EmptyState } from '@/components/ui/empty-state'
import { toast } from '@/components/ui/toaster'
import { Heading, Text } from '@/components/ui/typography'
import { RecordListItem } from '@/components/ui/record-list'
import { UserAvatar } from '@/components/ui/user-avatar'
import { useInbox } from '@/features/inbox/inbox-context'
import type { AccountStatus, ManagedUser, SessionUser, UserRole } from '../../../../shared/types/auth'
import type { WorkspaceData } from '../../../../shared/types/directory'
import { UserAccessDrawer } from '../components/user-access-drawer'
import { formatJoined, roleLabel, statusLabel } from '../user-display'
import { databaseUsers, type UserStore } from '../users-api'

type StatusFilter = AccountStatus | 'all'
const column = createDataColumnHelper<ManagedUser>()
const statusOptions = [
  { value: 'all', label: 'All accounts' },
  { value: 'pending', label: 'Awaiting approval' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
]
const columnClassName = (id: string) => ({
  role: 'hidden w-36 sm:table-cell',
  status: 'hidden w-40 md:table-cell',
  createdAt: 'hidden w-36 lg:table-cell',
  action: 'w-28',
})[id]

function StatusBadge({ status }: { status: AccountStatus }) {
  return <Badge variant={status === 'active' ? 'success' : status === 'pending' ? 'warning' : 'outline'}>{statusLabel(status)}</Badge>
}

export function UsersPage({ store = databaseUsers }: { store?: UserStore }) {
  const { user } = useRouteLoaderData('workspace') as WorkspaceData
  return <>
    <title>Team · Mews</title>
    {user.role === 'administrator' ? <UsersScreen currentUser={user} store={store} /> : <Card><EmptyState icon={<ShieldCheck />} title="Administrator access required" description="Ask an administrator if you need help with your account." /></Card>}
  </>
}

function UsersScreen({ currentUser, store }: { currentUser: SessionUser; store: UserStore }) {
  const { revalidate } = useRevalidator()
  const { refreshWorkspace } = useInbox()
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [request, setRequest] = useState<DataTableRequest | undefined>({ status: 'loading' })
  const [reload, setReload] = useState(0)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 })
  const [selected, setSelected] = useState<ManagedUser | null>(null)
  const [role, setRole] = useState<UserRole>('member')
  const [status, setStatus] = useState<'active' | 'suspended'>('active')
  const [canBeAssignedTasks, setCanBeAssignedTasks] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const tableRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    setRequest({ status: 'loading' })
    store.list(controller.signal).then((result) => {
      if (!controller.signal.aborted) { setUsers(result); setRequest(undefined) }
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setRequest({ status: 'error', message: error instanceof Error ? error.message : 'Try again in a moment.', onRetry: () => setReload((value) => value + 1) })
    })
    return () => controller.abort()
  }, [store, reload])

  const query = search.trim().toLocaleLowerCase()
  const pendingCount = users.filter((user) => user.status === 'pending').length
  const viewingRequests = filter === 'pending'
  const showRequestCard = !request && pendingCount > 0
  const filteredUsers = useMemo(() => users.filter((user) => (filter === 'all' || user.status === filter)
    && (!query || [user.name, user.email, user.phone ?? ''].some((value) => value.toLocaleLowerCase().includes(query)))), [users, filter, query])

  const openUser = useCallback((user: ManagedUser, trigger: HTMLButtonElement) => {
    triggerRef.current = trigger
    setSelected(user)
    setRole(user.role)
    setStatus(user.status === 'suspended' ? 'suspended' : 'active')
    setCanBeAssignedTasks(user.canBeAssignedTasks)
    setSaveError('')
  }, [])
  const columns = useMemo(() => column.columns([
    column.accessor('name', {
      header: 'Person',
      cell: ({ row }) => <div className="flex min-w-0 items-start gap-3 py-1">
        <UserAvatar name={row.original.name} src={row.original.avatarUrl} size="sm" />
        <div className="min-w-0 space-y-1">
          <Text size="small" weight="medium" className="wrap-anywhere">{row.original.name}{row.original.id === currentUser.id ? ' (you)' : ''}</Text>
          <Text size="caption" tone="muted" className="wrap-anywhere">{row.original.email}</Text>
          <div className="sm:hidden"><Text size="caption" tone="muted">{roleLabel(row.original.role)}</Text></div>
          <div className="md:hidden"><StatusBadge status={row.original.status} /></div>
        </div>
      </div>,
    }),
    column.accessor('role', { header: 'Role', cell: ({ row }) => <Text size="small">{roleLabel(row.original.role)}</Text> }),
    column.accessor('status', { header: 'Access', cell: ({ row }) => <StatusBadge status={row.original.status} /> }),
    column.accessor('createdAt', { header: 'Requested', cell: ({ row }) => <Text size="caption" tone="muted">{formatJoined(row.original.createdAt)}</Text> }),
    column.display({ id: 'action', header: 'Action', cell: ({ row }) => {
      const user = row.original
      const action = user.status === 'pending' ? 'Review' : 'Manage'
      return <Button variant="outline" size="sm" aria-label={`${action} account: ${user.name}`} onClick={(event) => openUser(user, event.currentTarget)}>{action}</Button>
    } }),
  ]), [currentUser.id, openUser])
  const table = useDataTable({
    data: filteredUsers, columns, getRowId: (user) => user.id,
    state: { pagination: { ...pagination, pageIndex: Math.min(pagination.pageIndex, Math.max(0, Math.ceil(filteredUsers.length / pagination.pageSize) - 1)) } },
    onPaginationChange: setPagination,
  })

  async function saveAccess() {
    if (!selected || saving) return
    setSaving(true)
    setSaveError('')
    try {
      const updated = await store.changeAccess(selected.id, { role, status, canBeAssignedTasks, expectedRole: selected.role, expectedStatus: selected.status, expectedCanBeAssignedTasks: selected.canBeAssignedTasks })
      setUsers((items) => items.map((item) => item.id === updated.id ? updated : item))
      setSelected(null)
      toast.success(selected.status === 'pending' ? 'Access approved' : 'Access updated', { description: updated.name })
      void revalidate()
      void refreshWorkspace({ invalidate: true })
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Could not update access. Try again.')
    } finally {
      setSaving(false)
    }
  }

  function refreshList() {
    setSelected(null)
    setReload((value) => value + 1)
  }

  const emptyTitle = query ? 'No matching accounts' : filter === 'pending' ? 'No requests awaiting approval' : filter === 'active' ? 'No active accounts' : filter === 'suspended' ? 'No suspended accounts' : 'No team accounts'
  return <div className="space-y-6">
    {showRequestCard ? <Card size="sm" tone="note">
      <CardContent><div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3"><UserRoundPlus aria-hidden="true" className="mt-1 size-5 shrink-0 text-primary-text" />
          <Heading level={2} size="card">{pendingCount} {pendingCount === 1 ? 'person is' : 'people are'} waiting to join</Heading>
        </div>
        <Button variant="outline" size="sm" onClick={() => { setSearch(''); setFilter(viewingRequests ? 'all' : 'pending'); table.firstPage() }}>
          {viewingRequests ? <><ArrowLeft aria-hidden="true" /> View all accounts</> : <>Review requests <ArrowRight aria-hidden="true" /></>}
        </Button>
      </div></CardContent>
    </Card> : null}
    <div className="space-y-4">
      <DataTableToolbar label="Team controls"
        search={{ label: 'Search team accounts', placeholder: 'Search by name or email…', value: search, onValueChange: (value) => { setSearch(value); table.firstPage() } }}
        filters={[{ id: 'status', label: 'Filter accounts by access', value: filter, options: statusOptions, onValueChange: (value) => { setFilter(value as StatusFilter); table.firstPage() } }]}
        onReset={() => { setSearch(''); setFilter('all'); table.firstPage() }}
        resetActive={Boolean(query || (filter !== 'all' && !(showRequestCard && viewingRequests)))} />
      <DataTable ref={tableRef} table={table} label="Team accounts" itemName="account" request={request} columnClassName={columnClassName} scrollMode="page"
        mobileListKey={`${query}:${filter}`}
        renderMobileRow={(user) => <RecordListItem title={`${user.name}${user.id === currentUser.id ? ' (you)' : ''}`}
          aria-label={`${user.status === 'pending' ? 'Review' : 'Manage'} account: ${user.name}`} aria-haspopup="dialog"
          leading={<UserAvatar name={user.name} src={user.avatarUrl} size="sm" />}
          meta={user.email} description={roleLabel(user.role)} badge={<StatusBadge status={user.status} />}
          onClick={(event) => openUser(user, event.currentTarget)} />}
        emptyState={<EmptyState icon={query ? <Search /> : <UsersRound />} title={emptyTitle} description={query ? 'Try another name, email, or phone number.' : filter === 'pending' ? 'New requests will appear here.' : undefined} />} />
    </div>
    <UserAccessDrawer user={selected} currentUserId={currentUser.id} role={role} status={status} canBeAssignedTasks={canBeAssignedTasks} busy={saving} error={saveError}
      onRoleChange={setRole} onStatusChange={setStatus} onCanBeAssignedTasksChange={setCanBeAssignedTasks} onClose={() => setSelected(null)} onSave={saveAccess} onRefresh={refreshList}
      finalFocus={() => { queueMicrotask(() => (triggerRef.current?.isConnected ? triggerRef.current : tableRef.current)?.focus({ preventScroll: true })); return false }} />
  </div>
}
