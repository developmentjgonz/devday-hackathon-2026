import { useId, useRef, type ReactNode, type Ref } from 'react'
import {
  columnVisibilityFeature, createPaginatedRowModel, createSortedRowModel,
  createTableHook, rowPaginationFeature, rowSelectionFeature, rowSortingFeature,
  sortFns, tableFeatures, type ReactTable, type RowData,
} from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, CircleAlert, Search } from 'lucide-react'
import { Button } from './button'
import { Card } from './card'
import { Checkbox } from './checkbox'
import { EmptyState } from './empty-state'
import { Label } from './label'
import { LoadingIndicator } from './loading-indicator'
import { SelectField } from './select-field'
import { Table, TableCell, TableHead, TableRow } from './table'
import { Text } from './typography'
import { cn } from '@/lib/utils'
import { DataTableToolbar, type DataTableToolbarProps } from './data-table-toolbar'
import '@/styles/data-table.css'

const features = tableFeatures({
  columnVisibilityFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  paginatedRowModel: createPaginatedRowModel(),
  sortedRowModel: createSortedRowModel(),
  sortFns,
})

/** Features own columns and data; this factory owns the shared table behavior. */
export const { useAppTable: useDataTable, createAppColumnHelper: createDataColumnHelper } = createTableHook({
  features,
  autoResetPageIndex: false,
  enableMultiSort: false,
})

export type DataTableInstance<T extends RowData> = ReactTable<typeof features, T>
export type DataTableRequest =
  | { status: 'loading' }
  | { status: 'refreshing'; action?: 'previous' | 'next' }
  | { status: 'error'; message: string; onRetry: () => void }

type DataTableProps<T extends RowData> = {
  table: DataTableInstance<T>
  label: string
  itemName?: string
  emptyState?: ReactNode
  request?: DataTableRequest
  activeRowId?: string
  onOpenRow?: (row: T, trigger: HTMLButtonElement | null) => void
  selection?: { getLabel: (row: T) => string; actions: (rows: T[]) => ReactNode }
  columnClassName?: (columnId: string) => string | undefined
  ref?: Ref<HTMLDivElement>
  toolbar?: Omit<DataTableToolbarProps, 'selection'>
}

export function DataTable<T extends RowData>({ table, label, itemName = 'record', emptyState, request, activeRowId, onOpenRow, selection, columnClassName, ref, toolbar }: DataTableProps<T>) {
  const pageSizeId = useId()
  const viewport = useRef<HTMLDivElement>(null)
  const rows = table.getRowModel().rows
  const total = table.getRowCount()
  const { pageIndex, pageSize } = table.state.pagination
  const selected = table.getSelectedRowModel().rows
  const busy = request?.status === 'loading' || request?.status === 'refreshing'
  const pages = Math.max(1, table.getPageCount())

  function changePage(direction: 'previous' | 'next') {
    if (direction === 'previous') table.previousPage()
    else table.nextPage()
    viewport.current?.scrollTo({ top: 0 })
  }

  return (
    <div className="space-y-3">
      {toolbar || (selection && selected.length) ? <DataTableToolbar {...toolbar} selection={selection && selected.length ? { count: selected.length, actions: selection.actions(selected.map((row) => row.original)), onClear: () => table.resetRowSelection() } : undefined} /> : null}
      <Card ref={ref} padding="none" tabIndex={-1} aria-label={label}>
      <div className="relative" aria-busy={busy || undefined}>
        {request?.status === 'error' ? <EmptyState
          icon={<CircleAlert />} tone="danger" title={`Could not load ${label.toLowerCase()}`}
          description={request.message} action={<Button variant="outline" onClick={request.onRetry}>Try again</Button>}
        /> : request?.status === 'loading' && !rows.length ? <div className="flex min-h-64 flex-col items-center justify-center gap-4">
          <LoadingIndicator label={`Loading ${label.toLowerCase()}`} />
          <Text size="small" tone="muted">Loading {label.toLowerCase()}…</Text>
        </div> : <>
          <div ref={viewport} className={cn('mews-table-scroll overflow-auto overscroll-contain', pages > 1 ? 'h-[65svh]' : 'max-h-[65svh]')} inert={busy || undefined}>
            <Table aria-label={label} density="compact">
              <caption className="sr-only">{label}{onOpenRow ? '. Activate a row title to open its details.' : ''}</caption>
              <thead className="sticky top-0 z-10 bg-card">
                {table.getHeaderGroups().map((group) => <tr key={group.id}>
                  {selection ? <TableHead className="w-12">
                    <Checkbox aria-label="Select this page" checked={rows.length > 0 && table.getIsAllPageRowsSelected()}
                      indeterminate={table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected()}
                      disabled={!rows.length || busy} onCheckedChange={(checked) => table.toggleAllPageRowsSelected(checked)} />
                  </TableHead> : null}
                  {group.headers.map((header) => {
                    const direction = header.column.getIsSorted()
                    const SortIcon = direction === 'asc' ? ArrowUp : ArrowDown
                    return <TableHead key={header.id} className={columnClassName?.(header.column.id)}
                      aria-sort={direction === 'asc' ? 'ascending' : direction === 'desc' ? 'descending' : undefined}>
                      {header.isPlaceholder ? null : header.column.getCanSort() ? <Button variant="table-header" size="sm" className="-ml-2.5 max-w-full" onClick={() => { header.column.toggleSorting(); table.firstPage() }} disabled={busy}>
                        <table.FlexRender header={header} />{direction ? <SortIcon aria-hidden="true" /> : null}
                      </Button> : <table.FlexRender header={header} />}
                    </TableHead>
                  })}
                </tr>)}
              </thead>
              <tbody>
                {rows.map((row) => <TableRow key={row.id} interactive={Boolean(onOpenRow)}
                  selected={row.getIsSelected() || row.id === activeRowId}
                  aria-selected={selection ? row.getIsSelected() : undefined}
                  onClick={(event) => {
                    if (!onOpenRow || busy) return
                    const target = event.target as HTMLElement
                    if (target.closest('button, a, input, select, textarea, [role="checkbox"]') && !target.closest('[data-slot="table-open-button"]')) return
                    onOpenRow(row.original, event.currentTarget.querySelector('[data-slot="table-open-button"]'))
                  }}>
                  {selection ? <TableCell>
                    <Checkbox aria-label={`Select ${selection.getLabel(row.original)}`} checked={row.getIsSelected()}
                      disabled={!row.getCanSelect() || busy} onCheckedChange={(checked) => row.toggleSelected(checked)} />
                  </TableCell> : null}
                  {row.getVisibleCells().map((cell) => <TableCell key={cell.id} className={columnClassName?.(cell.column.id)}>
                    <table.FlexRender cell={cell} />
                  </TableCell>)}
                </TableRow>)}
              </tbody>
            </Table>
            {!rows.length ? emptyState ?? <EmptyState icon={<Search />} title="No matching records" /> : null}
          </div>
          {busy ? <div className="absolute inset-0 z-20 flex items-center justify-center bg-card/80">
            <LoadingIndicator label={`Updating ${label.toLowerCase()}`} />
          </div> : null}
        </>}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
        <div className="flex flex-wrap items-center gap-2" aria-live="polite">
          <Text size="caption" tone="muted">{total > pageSize ? `${pageIndex * pageSize + 1}–${Math.min((pageIndex + 1) * pageSize, total)} of ${total}` : total} {itemName}{total === 1 ? '' : 's'}</Text>
        </div>
        {total > 10 || pages > 1 ? <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor={pageSizeId}>Rows</Label>
            <SelectField id={pageSizeId} aria-label="Rows per page" className="w-20" value={pageSize} disabled={busy} onChange={(event) => { table.setPagination({ pageIndex: 0, pageSize: Number(event.target.value) }); viewport.current?.scrollTo({ top: 0 }) }}>
              {[10, 25, 50].map((size) => <option key={size} value={size}>{size}</option>)}
            </SelectField>
          </div>
          <nav aria-label={`${label} pagination`} className="flex items-center gap-1">
            <Button variant="ghost" size="icon-sm" aria-label="Previous page" loading={request?.status === 'refreshing' && request.action === 'previous'} disabled={!table.getCanPreviousPage() || busy || request?.status === 'error'} onClick={() => changePage('previous')}><ChevronLeft aria-hidden="true" /></Button>
            <Text size="caption" className="min-w-20 text-center" aria-live="polite">Page {pageIndex + 1} of {pages}</Text>
            <Button variant="ghost" size="icon-sm" aria-label="Next page" loading={request?.status === 'refreshing' && request.action === 'next'} disabled={!table.getCanNextPage() || busy || request?.status === 'error'} onClick={() => changePage('next')}><ChevronRight aria-hidden="true" /></Button>
          </nav>
        </div> : null}
      </div>
      </Card>
    </div>
  )
}
