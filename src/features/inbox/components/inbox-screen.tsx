import { useEffect, useMemo, useRef, useState } from 'react'
import { CheckCheck, Search } from 'lucide-react'
import { Button, ButtonLabel } from '@/components/ui/button'
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

export function InboxScreen({ initialStatus = 'pending' }: {
  initialStatus?: StatusFilter
}) {
  const { data: initialData, reports, markReports } = useInbox()
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedId = searchParams.get('report')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(searchParams.has('colony') ? 'all' : initialStatus)
  const [selectedId, setSelectedId] = useState<string | null>(requestedId)
  const [drawerOpen, setDrawerOpen] = useState(Boolean(requestedId))
  const [marking, setMarking] = useState(false)
  const [search, setSearch] = useState('')
  const [colonyFilter, setColonyFilter] = useState(() => initialData.colonies.some((colony) => colony.id === searchParams.get('colony')) ? searchParams.get('colony')! : 'all')
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
  const requestedUnread = reports.find((report) => report.id === requestedId)?.unread
  // The global bell and report composer can open a report from any route.
  useEffect(() => {
    if (!requestedId) return
    setSelectedId(requestedId)
    setDrawerOpen(true)
    if (requestedUnread) void markReports([requestedId], false).catch(() => toast.error('Could not mark the report as read.'))
  }, [requestedId, requestedUnread, markReports])

  function openReport(report: InboxReport, trigger: HTMLButtonElement | null) {
    returnFocus.current = trigger
    setSelectedId(report.id)
    setDrawerOpen(true)
    if (report.unread) void markReports([report.id], false).catch(() => toast.error('Could not mark the report as read.'))
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

  async function markRead(items: InboxReport[], unread: boolean) {
    if (marking) return
    setMarking(true)
    try {
      await markReports(items.map((report) => report.id), unread)
      table.resetRowSelection()
      toast.success(`${items.length} ${items.length === 1 ? 'report' : 'reports'} marked as ${unread ? 'unread' : 'read'}.`)
    } catch { toast.error('Could not update the selected reports. Try again.') }
    finally { setMarking(false) }
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
          onReset: () => { setSearch(''); setColonyFilter('all'); setStatusFilter('all'); resetTable(); closeDrawer() },
          resetActive: Boolean(query || colonyFilter !== 'all' || statusFilter !== 'all'),
        }}
        columnClassName={inboxColumnClassName}
        activeRowId={drawerOpen ? selected?.id : undefined}
        onOpenRow={openReport}
        selection={{
          busy: marking,
          getLabel: (report) => report.title,
          actions: (items) => {
            const unread = items.every((report) => !report.unread)
            return <Button variant="outline" size="sm" loading={marking} onClick={() => void markRead(items, unread)}><ButtonLabel labels={['Mark read', 'Mark unread']}>Mark {unread ? 'unread' : 'read'}</ButtonLabel></Button>
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
        open={drawerOpen}
        onClose={closeDrawer}
        onNotice={(message) => { toast.success(message) }}
        finalFocus={() => returnFocus.current?.isConnected ? returnFocus.current : listRef.current}
      />
    </>
  )
}
