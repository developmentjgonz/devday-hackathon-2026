import { isReportClosed } from '../../../../shared/types/workspace'
import { useMemo, useRef, useState } from 'react'
import { CheckCheck, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable, useDataTable } from '@/components/ui/data-table'
import { DataTableToolbar } from '@/components/ui/data-table-toolbar'
import { RecordListItem } from '@/components/ui/record-list'
import { SelectField } from '@/components/ui/select-field'
import { useSearchParams } from 'react-router'
import { useInbox } from '../inbox-context'
import { formatReceivedDate, inboxColumnClassName, useInboxColumns } from './inbox-columns'
import type { PaginationState } from '@tanstack/react-table'
import { EmptyState } from '@/components/ui/empty-state'
import { reportStatusLabels } from '../types'
import type { InboxReport, ReportStatus } from '../types'
import { useReportDetail } from './report-detail-context'
import { NewReportButton } from './report-composer'

type StatusFilter = ReportStatus | 'all'
const statuses: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All reports' },
  ...(['pending', 'waiting', 'processed', 'dismissed'] as const).map((value) => ({ value, label: reportStatusLabels[value] })),
]
const sortOptions = [
  { value: 'received-desc', label: 'Sort: newest first', sorting: [{ id: 'received', desc: true }] },
  { value: 'received-asc', label: 'Sort: oldest first', sorting: [{ id: 'received', desc: false }] },
  { value: 'priority', label: 'Sort: urgent, oldest', sorting: [] },
  { value: 'title-asc', label: 'Sort: title A–Z', sorting: [{ id: 'title', desc: false }] },
  { value: 'title-desc', label: 'Sort: title Z–A', sorting: [{ id: 'title', desc: true }] },
  { value: 'colony-asc', label: 'Sort: colony A–Z', sorting: [{ id: 'colony', desc: false }] },
  { value: 'colony-desc', label: 'Sort: colony Z–A', sorting: [{ id: 'colony', desc: true }] },
  { value: 'reporter-asc', label: 'Sort: reporter A–Z', sorting: [{ id: 'reporter', desc: false }] },
  { value: 'reporter-desc', label: 'Sort: reporter Z–A', sorting: [{ id: 'reporter', desc: true }] },
]
function sortedReports(reports: InboxReport[]) {
  return [...reports].sort((a, b) => Number(b.urgent) - Number(a.urgent) || Date.parse(a.submittedAt) - Date.parse(b.submittedAt))
}
function reportPreview(message: string) {
  const text = message.replace(/\s+/g, ' ').trim()
  const characters = Array.from(text)
  return characters.length > 180 ? `${characters.slice(0, 177).join('').trimEnd()}…` : text
}

export function InboxScreen({ initialStatus = 'pending' }: {
  initialStatus?: StatusFilter
}) {
  const { data: initialData, reports } = useInbox()
  const [searchParams] = useSearchParams()
  const { reportId, open: drawerOpen, openReport: showReport, closeReport } = useReportDetail()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(searchParams.has('colony') ? 'all' : initialStatus)
  const [search, setSearch] = useState('')
  const [colonyFilter, setColonyFilter] = useState(() => initialData.colonies.some((colony) => colony.id === searchParams.get('colony')) ? searchParams.get('colony')! : 'all')
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 })
  const listRef = useRef<HTMLDivElement>(null)

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
    initialState: { sorting: [{ id: 'received', desc: true }] },
    state: { pagination: { ...pagination, pageIndex: Math.min(pagination.pageIndex, Math.max(0, Math.ceil(visibleReports.length / pagination.pageSize) - 1)) } },
    onPaginationChange: setPagination,
  })
  const selected = reports.find((report) => report.id === reportId) ?? null
  const currentSort = table.state.sorting[0]
  const sortValue = currentSort ? `${currentSort.id}-${currentSort.desc ? 'desc' : 'asc'}` : 'priority'
  function openReport(report: InboxReport, trigger: HTMLButtonElement | null) {
    showReport(report.id, trigger, listRef.current)
  }

  function closeDrawer() {
    if (drawerOpen) closeReport()
  }

  function changeStatus(next: StatusFilter) {
    setStatusFilter(next)
    resetTable()
    closeDrawer()
  }

  function resetTable() {
    table.firstPage()
  }

  function clearFilters() {
    setColonyFilter('all')
    setStatusFilter('all')
    resetTable()
    closeDrawer()
  }

  const hasActiveFilters = colonyFilter !== 'all' || statusFilter !== 'all'
  const emptyState = <EmptyState
    icon={query || colonyFilter !== 'all' ? <Search /> : <CheckCheck />}
    title={query || colonyFilter !== 'all' ? 'No matching reports' : statusFilter === 'pending' ? 'No reports need review' : statusFilter === 'waiting' ? 'No reports waiting' : statusFilter === 'processed' ? 'No reviewed reports' : statusFilter === 'dismissed' ? 'No dismissed reports' : 'No reports'}
    description={query || colonyFilter !== 'all' ? 'Try another search or change the filters.' : statusFilter === 'pending' ? 'Reports that need review will appear here.' : undefined}
    action={query || colonyFilter !== 'all' ? <Button variant="outline" onClick={() => {
      setSearch('')
      clearFilters()
      requestAnimationFrame(() => listRef.current?.focus({ preventScroll: true }))
    }}>{query ? hasActiveFilters ? 'Clear search and filters' : 'Clear search' : 'Clear filters'}</Button> : undefined}
  />
  if (reportId && !selected) return <EmptyState icon={<Search />} title="Report not found" action={<Button onClick={closeReport}>View reports</Button>} />
  return (
    <>
      <div className="space-y-3">
        <DataTableToolbar
          label="Report controls"
          actions={<>
            <SelectField aria-label="Sort reports" controlSize="sm" className="w-56 max-w-full" value={sortValue} onChange={(event) => {
              const selectedSort = sortOptions.find((option) => option.value === event.target.value)
              if (selectedSort) { table.setSorting(selectedSort.sorting); table.firstPage() }
            }}>{sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</SelectField>
            <NewReportButton />
          </>}
          search={{ label: 'Search reports', placeholder: 'Search reports…', value: search, onValueChange: (value) => { setSearch(value); resetTable(); closeDrawer() } }}
          filterPresentation="popover"
          filters={[{
            id: 'status', label: 'Filter by status', displayLabel: 'Status', value: statusFilter, active: statusFilter !== 'all',
            options: statuses,
            onValueChange: (value) => changeStatus(value as StatusFilter),
          }, {
            id: 'colony', label: 'Filter by colony', displayLabel: 'Colony', value: colonyFilter, active: colonyFilter !== 'all',
            options: [{ value: 'all', label: 'All colonies' }, { value: '', label: 'Colony unknown' }, ...initialData.colonies.map((colony) => ({ value: colony.id, label: colony.name }))],
            onValueChange: (value) => { setColonyFilter(value); resetTable(); closeDrawer() },
          }]}
          onReset={clearFilters}
          resetActive={hasActiveFilters}
        />
        <DataTable
          ref={listRef} table={table} label="Reports" itemName="report"
          columnClassName={inboxColumnClassName}
          activeRowId={drawerOpen ? selected?.id : undefined}
          onOpenRow={openReport} emptyState={emptyState}
          mobileListKey={`${query}:${statusFilter}:${colonyFilter}`}
          renderMobileRow={(report, { selected, onOpen }) => {
            const colony = initialData.colonies.find((item) => item.id === report.colonyId)?.name ?? 'Colony unknown'
            const duplicate = Boolean(report.possibleDuplicateOf && !report.duplicateOf && !isReportClosed(report.status))
            return <RecordListItem title={report.title} description={reportPreview(report.message)}
              meta={<>{colony} · {report.category} · <time dateTime={report.submittedAt}>{formatReceivedDate(report.submittedAt)}</time></>}
              aria-description={`${report.urgent ? 'Urgent. ' : ''}${reportStatusLabels[report.status]}. ${colony}. ${report.category}. Received ${formatReceivedDate(report.submittedAt)}.${duplicate ? ' Possible duplicate.' : ''} ${reportPreview(report.message)}`}
              selected={selected} aria-haspopup="dialog" aria-label={`Review ${report.title}`} onClick={onOpen}
              badge={<>
                {report.urgent ? <Badge variant="destructive">Urgent</Badge> : null}
                {statusFilter !== 'pending' || report.status !== 'pending' ? <Badge variant={report.status === 'processed' ? 'success' : 'outline'}>{reportStatusLabels[report.status]}</Badge> : null}
                {duplicate ? <Badge variant="outline">Possible duplicate</Badge> : null}
              </>} />
          }}
        />
      </div>
    </>
  )
}
