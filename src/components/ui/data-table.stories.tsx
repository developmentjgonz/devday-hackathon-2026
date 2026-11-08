import { useEffect, useRef, useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import type { PaginationState, Updater } from '@tanstack/react-table'
import { DataTable, useDataTable, type DataTableRequest } from './data-table'
import { Button } from './button'
import { DialogTitle, DialogDescription } from './dialog'
import { Drawer, DrawerContent, DrawerHeader, DrawerBody } from './drawer'
import { Text } from './typography'
import type { InboxReport } from '@/features/inbox/types'
import { localInboxData } from '@/features/inbox/data/local-inbox'
import { inboxColumnClassName, useInboxColumns } from '@/features/inbox/components/inbox-columns'

const records = Array.from({ length: 36 }, (_, index) => ({
  ...localInboxData.reports[index % 5]!,
  id: `table-report-${index}`,
  title: `${localInboxData.reports[index % 5]!.title} · ${index + 1}`,
}))

function DataTableExample({ mode = 'ready', scrollMode = 'contained' }: { mode?: 'ready' | 'loading' | 'error' | 'delayed' | 'empty'; scrollMode?: 'contained' | 'page' }) {
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 })
  const [opened, setOpened] = useState<InboxReport | null>(null)
  const [data, setData] = useState(mode === 'empty' || mode === 'error' || mode === 'loading' ? [] : mode === 'delayed' ? records.slice(0, 10) : records)
  const [request, setRequest] = useState<DataTableRequest | undefined>(() => mode === 'loading' ? { status: 'loading' } : mode === 'error' ? { status: 'error', message: 'The connection was interrupted. Try loading the reports again.', onRetry: retry } : undefined)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const returnFocus = useRef<HTMLButtonElement | null>(null)
  useEffect(() => () => clearTimeout(timer.current), [])
  const columns = useInboxColumns(localInboxData)

  function retry() {
    setRequest({ status: 'loading' })
    timer.current = setTimeout(() => { setData(records); setRequest(undefined) }, 700)
  }
  function paginate(updater: Updater<PaginationState>) {
    const next = typeof updater === 'function' ? updater(pagination) : updater
    setPagination(next)
    if (mode !== 'delayed') return
    clearTimeout(timer.current)
    setRequest({ status: 'refreshing', action: next.pageSize === pagination.pageSize ? next.pageIndex > pagination.pageIndex ? 'next' : 'previous' : undefined })
    timer.current = setTimeout(() => {
      setData(records.slice(next.pageIndex * next.pageSize, (next.pageIndex + 1) * next.pageSize))
      setRequest(undefined)
    }, 700)
  }

  const table = useDataTable({
    columns, data, getRowId: (row) => row.id,
    manualPagination: mode === 'delayed', rowCount: mode === 'delayed' ? records.length : undefined,
    manualSorting: mode === 'delayed', enableSorting: mode !== 'delayed',
    state: { pagination }, onPaginationChange: paginate,
  })

  return <>
    <DataTable table={table} label="Reports" itemName="report" request={request} columnClassName={inboxColumnClassName} scrollMode={scrollMode}
      onOpenRow={(report, trigger) => { returnFocus.current = trigger; setOpened(report) }} activeRowId={opened?.id}
      selection={{ getLabel: (report) => report.title, actions: (selected) => <Button variant="outline" size="sm" onClick={() => {
        const ids = new Set(selected.map((row) => row.id))
        setData((rows) => rows.map((row) => ids.has(row.id) ? { ...row, unread: false } : row))
        table.resetRowSelection()
      }}>Mark read</Button> }} />
    <Drawer open={Boolean(opened)} onOpenChange={(open) => { if (!open) setOpened(null) }}>
      <DrawerContent closeLabel="Close report" finalFocus={() => returnFocus.current}>
        <DrawerHeader><DialogTitle>{opened?.title}</DialogTitle><DialogDescription>{opened?.reporter}</DialogDescription></DrawerHeader>
        <DrawerBody><Text size="small">{opened?.message}</Text></DrawerBody>
      </DrawerContent>
    </Drawer>
  </>
}

const meta = {
  title: 'Display/Data table',
  component: DataTableExample,
  args: { mode: 'ready' },
  parameters: {
    layout: 'fullscreen',
    docs: { description: { component: 'Shared TanStack Table v9 implementation using createTableHook. Features supply stable columns, row IDs, data, and update callbacks. The shared component supplies sortable headers, page size, page navigation, row selection, a sticky table header, empty/error states, and the shared cat-print loader. Keep pagination controlled when data changes; clamp it after removals and reset to the first page when filters change. Existing rows stay visible but inert while a refresh is pending. Loading and retry delays are Storybook-only fixtures; no request is made. Delayed pages uses manual pagination with a known row count and disables sorting so it cannot sort only the loaded page. In production, server pagination must also perform filtering and sorting over the full dataset. Query and mutations belong to the feature; the shared table has no dependency on an API or QueryClient.' } },
  },
  decorators: [(Story) => <div className="mx-auto max-w-6xl p-6"><Story /></div>],
} satisfies Meta<typeof DataTableExample>
export default meta
type Story = StoryObj<typeof meta>
export const Reports: Story = {}
export const PageScroll: Story = { args: { scrollMode: 'page' }, parameters: { docs: { description: { story: 'The page scrolls naturally through the current set of rows. Horizontal table overflow remains scrollable.' } } } }
export const Loading: Story = { args: { mode: 'loading' } }
export const ErrorAndRetry: Story = { args: { mode: 'error' } }
export const DelayedPages: Story = { args: { mode: 'delayed' } }
export const Empty: Story = { args: { mode: 'empty' } }
