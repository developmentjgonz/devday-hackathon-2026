import { useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { createDataColumnHelper } from '@/components/ui/data-table'
import { TableOpenButton } from '@/components/ui/table'
import { Text } from '@/components/ui/typography'
import type { InboxData, InboxReport } from '../types'

const column = createDataColumnHelper<InboxReport>()
const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' })

export function ReviewSignal({ report }: { report: InboxReport }) {
  if (report.status === 'processed') return <Badge variant={report.duplicateOf ? 'outline' : 'success'}>{report.duplicateOf ? 'Duplicate linked' : 'Processed'}</Badge>
  if (report.status === 'waiting') return <Badge variant="outline">Waiting for details</Badge>
  if (report.possibleDuplicateOf) return <Badge variant="warning">Check duplicate</Badge>
  if (!report.colonyId) return <Badge variant="warning">Needs location</Badge>
  return <Badge variant="outline">Ready to review</Badge>
}

export const inboxColumnClassName = (id: string) => ({
  title: undefined,
  colony: 'hidden w-36 lg:table-cell',
  review: 'hidden w-40 md:table-cell',
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
          <TableOpenButton unread={row.original.unread} aria-label={`Review ${row.original.title}`}>{row.original.title}</TableOpenButton>
          <div className="flex min-h-6 flex-wrap items-center gap-x-3 gap-y-1">
            {row.original.urgent ? <Badge variant="destructive">Urgent</Badge> : null}
            <Text size="caption" tone="muted" className="truncate"><span className="lg:hidden">{colonies.get(row.original.colonyId) ?? 'Colony unknown'} · </span>{row.original.category}</Text>
            <span className="md:hidden"><ReviewSignal report={row.original} /></span>
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
      column.display({ id: 'review', header: 'Review', cell: ({ row }) => <ReviewSignal report={row.original} /> }),
      column.accessor('reporter', { header: 'From', cell: ({ getValue }) => <Text size="small" className="truncate">{getValue()}</Text> }),
      column.accessor((report) => Date.parse(report.submittedAt), {
        id: 'received', header: 'Received', sortDescFirst: true,
        cell: ({ row }) => <Text render={<time dateTime={row.original.submittedAt} />} size="caption" tone="muted">{dateFormat.format(new Date(row.original.submittedAt))}</Text>,
      }),
    ])
  }, [data])
}
