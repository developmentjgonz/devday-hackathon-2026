import { useEffect, useMemo, useRef, useState } from 'react'
import { CheckCheck, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DataTable, useDataTable } from '@/components/ui/data-table'
import { useSearchParams } from 'react-router'
import { useInbox } from '../inbox-context'
import { inboxColumnClassName, useInboxColumns } from './inbox-columns'
import type { PaginationState } from '@tanstack/react-table'
import { EmptyState } from '@/components/ui/empty-state'
import { toast } from '@/components/ui/toaster'
import { reportStatusLabels } from '../types'
import type { InboxReport, ReportStatus } from '../types'
import { ReportReviewDrawer } from './report-review-drawer'
import { NewReportButton } from './report-composer'

type StatusFilter = ReportStatus | 'all'
const statuses: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All reports' },
  ...(['pending', 'waiting', 'processed'] as const).map((value) => ({ value, label: reportStatusLabels[value] })),
]
function sortedReports(reports: InboxReport[]) {
  return [...reports].sort((a, b) => Number(b.urgent) - Number(a.urgent) || Date.parse(a.submittedAt) - Date.parse(b.submittedAt))
}

export function InboxScreen({ currentUser = 'Alex Morgan', initialStatus = 'pending' }: {
  currentUser?: string
  initialStatus?: StatusFilter
}) {
  const { data: initialData, reports, setReports } = useInbox()
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedId = searchParams.get('report')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialStatus)
  const [selectedId, setSelectedId] = useState<string | null>(requestedId)
  const [drawerOpen, setDrawerOpen] = useState(Boolean(requestedId))
  const [search, setSearch] = useState('')
  const [colonyFilter, setColonyFilter] = useState('all')
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 })
  const listRef = useRef<HTMLDivElement>(null)
  const returnFocus = useRef<HTMLButtonElement | null>(null)

  const query = search.trim().toLocaleLowerCase()
  const visibleReports = useMemo(() => sortedReports(reports.filter((report) => {
    const colony = initialData.colonies.find((item) => item.id === report.colonyId)
    return (statusFilter === 'all' || report.status === statusFilter)
      && (colonyFilter === 'all' || report.colonyId === colonyFilter)
      && (!query || [report.title, report.message, report.reporter, colony?.name ?? '', initialData.cats.find((cat) => cat.id === report.catId)?.name ?? ''].join(' ').toLocaleLowerCase().includes(query))
  })), [reports, initialData, statusFilter, colonyFilter, query])
  const columns = useInboxColumns(initialData)
  const table = useDataTable({
    data: visibleReports,
    columns,
    getRowId: (report) => report.id,
    state: { pagination: { ...pagination, pageIndex: Math.min(pagination.pageIndex, Math.max(0, Math.ceil(visibleReports.length / pagination.pageSize) - 1)) } },
    onPaginationChange: setPagination,
  })
  const selected = reports.find((report) => report.id === selectedId) ?? null
  // The global bell and report composer can open a report from any route.
  useEffect(() => {
    if (!requestedId) return
    setSelectedId(requestedId)
    setDrawerOpen(true)
    setReports((items) => items.map((report) => report.id === requestedId ? { ...report, unread: false } : report))
  }, [requestedId, setReports])

  function updateReport(id: string, update: (report: InboxReport) => InboxReport) {
    setReports((items) => items.map((report) => report.id === id ? update(report) : report))
  }

  function openReport(report: InboxReport, trigger: HTMLButtonElement | null) {
    returnFocus.current = trigger
    setSelectedId(report.id)
    setDrawerOpen(true)
    updateReport(report.id, (item) => ({ ...item, unread: false }))
  }

  function closeDrawer() {
    setDrawerOpen(false)
    if (requestedId) {
      const next = new URLSearchParams(searchParams)
      next.delete('report')
      setSearchParams(next, { replace: true, preventScrollReset: true })
    }
  }

  function changeStatus(next: StatusFilter) {
    setStatusFilter(next)
    resetTable()
    closeDrawer()
  }

  function resetTable() {
    table.firstPage()
    table.resetRowSelection()
  }

  function markRead(items: InboxReport[], unread: boolean) {
    const ids = new Set(items.map((report) => report.id))
    setReports((reports) => reports.map((report) => ids.has(report.id) ? { ...report, unread } : report))
    table.resetRowSelection()
    toast.success(`${items.length} ${items.length === 1 ? 'report' : 'reports'} marked as ${unread ? 'unread' : 'read'}.`)
  }

  return (
    <>
      <DataTable
        ref={listRef}
        table={table}
        label="Reports"
        itemName="report"
        toolbar={{
          actions: <NewReportButton />,
          search: { label: 'Search reports', placeholder: 'Search reports…', value: search, onValueChange: (value) => { setSearch(value); resetTable(); closeDrawer() } },
          filters: [{
            id: 'status', label: 'Filter by status', value: statusFilter,
            options: statuses,
            onValueChange: (value) => changeStatus(value as StatusFilter),
          }, {
            id: 'colony',
            label: 'Filter by colony', value: colonyFilter,
            options: [{ value: 'all', label: 'All colonies' }, { value: '', label: 'Colony unknown' }, ...initialData.colonies.map((colony) => ({ value: colony.id, label: colony.name }))],
            onValueChange: (value) => { setColonyFilter(value); resetTable(); closeDrawer() },
          }],
          onReset: query || colonyFilter !== 'all' || statusFilter !== 'all' ? () => { setSearch(''); setColonyFilter('all'); setStatusFilter('all'); resetTable(); closeDrawer() } : undefined,
        }}
        columnClassName={inboxColumnClassName}
        activeRowId={drawerOpen ? selected?.id : undefined}
        onOpenRow={openReport}
        selection={{
          getLabel: (report) => report.title,
          actions: (items) => {
            const unread = items.every((report) => !report.unread)
            return <Button variant="outline" size="sm" onClick={() => markRead(items, unread)}>Mark {unread ? 'unread' : 'read'}</Button>
          },
        }}
        emptyState={<EmptyState
          icon={query || colonyFilter !== 'all' ? <Search /> : <CheckCheck />}
          title={query || colonyFilter !== 'all' ? 'No matching reports' : statusFilter === 'pending' ? 'All reports reviewed' : statusFilter === 'waiting' ? 'No reports waiting' : statusFilter === 'processed' ? 'No processed reports' : 'No reports'}
          description={query || colonyFilter !== 'all' ? 'Try another search or colony.' : statusFilter === 'pending' ? 'Reports that need review will appear here.' : undefined}
        />}
      />

      <ReportReviewDrawer
        report={selected}
        reports={reports}
        data={initialData}
        currentUser={currentUser}
        open={drawerOpen}
        onClose={closeDrawer}
        onUpdate={updateReport}
        onNotice={(message) => { toast.success(message) }}
        finalFocus={() => returnFocus.current?.isConnected ? returnFocus.current : listRef.current}
      />
    </>
  )
}
