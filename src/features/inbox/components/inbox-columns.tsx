import { useMemo } from 'react'
import { createDataColumnHelper } from '@/components/ui/data-table'
import { TableOpenButton } from '@/components/ui/table'
import { Text } from '@/components/ui/typography'
import type { InboxData, InboxReport } from '../types'
import { reportStatusLabels } from '../types'

const column = createDataColumnHelper<InboxReport>()
const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' })

export function ReportStatusText({ report }: { report: InboxReport }) {
  return <Text size="small" tone="muted">{reportStatusLabels[report.status]}</Text>
}

export const inboxColumnClassName = (id: string) => ({
  title: undefined,
  colony: 'hidden w-36 lg:table-cell',
  status: 'hidden w-40 md:table-cell',
  reporter: 'hidden w-32 2xl:table-cell',
  received: 'hidden w-36 xl:table-cell',
})[id]

export function useInboxColumns(data: InboxData) {
  return useMemo(() => {
    const colonies = new Map(data.colonies.map((colony) => [colony.id, colony.name]))
    const cats = new Map(data.cats.map((cat) => [cat.id, cat.name]))
    return column.columns([
      column.accessor('title', {
        header: 'Report',
        cell: ({ row }) => <div className="min-w-0 space-y-1">
          <TableOpenButton aria-label={`Review ${row.original.title}`}>{row.original.title}</TableOpenButton>
          <div className="flex min-h-5 flex-wrap items-center gap-x-3 gap-y-1">
            {row.original.urgent ? <Text size="caption" tone="danger" weight="medium">Urgent</Text> : null}
            <Text size="caption" tone="muted" className="truncate"><span className="lg:hidden">{colonies.get(row.original.colonyId) ?? 'Colony unknown'} · </span>{row.original.category}</Text>
            {row.original.possibleDuplicateOf && !row.original.duplicateOf && row.original.status !== 'processed' ? <Text size="caption" tone="muted">Possible duplicate</Text> : null}
            <span className="md:hidden"><ReportStatusText report={row.original} /></span>
          </div>
        </div>,
      }),
      column.accessor((report) => colonies.get(report.colonyId) ?? '', {
        id: 'colony', header: 'Colony / cat',
        cell: ({ row }) => <div className="min-w-0">
          <Text size="small" className="truncate">{colonies.get(row.original.colonyId) ?? 'Unknown'}</Text>
          {cats.has(row.original.catId) ? <Text size="caption" tone="muted" className="truncate">{cats.get(row.original.catId)}</Text> : null}
        </div>,
      }),
      column.accessor('status', { header: 'Status', enableSorting: false, cell: ({ row }) => <ReportStatusText report={row.original} /> }),
      column.accessor('reporter', { header: 'From', cell: ({ getValue }) => <Text size="small" className="truncate">{getValue()}</Text> }),
      column.accessor((report) => Date.parse(report.submittedAt), {
        id: 'received', header: 'Received', sortDescFirst: true,
        cell: ({ row }) => <Text render={<time dateTime={row.original.submittedAt} />} size="caption" tone="muted">{dateFormat.format(new Date(row.original.submittedAt))}</Text>,
      }),
    ])
  }, [data])
}
