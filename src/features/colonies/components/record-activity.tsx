import { FileText } from 'lucide-react'
import { Link } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { TextLink } from '@/components/ui/text-link'
import { Text } from '@/components/ui/typography'
import { reportStatusLabels, type InboxReport } from '@/features/inbox/types'
import { formatReportTime } from '../directory-data'

export function ReportActivity({ reports, emptyTitle = 'No reports' }: { reports: InboxReport[]; emptyTitle?: string }) {
  if (!reports.length) return <EmptyState icon={<FileText />} title={emptyTitle} />
  return <Card size="sm"><CardContent><ul className="divide-y divide-border">
    {reports.map((report) => <li key={report.id} className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <TextLink render={<Link to={`/app/reports?report=${encodeURIComponent(report.id)}`} />} className="max-w-full wrap-anywhere">{report.title}</TextLink>
        <Text size="caption" tone="muted">{report.category} · {formatReportTime(report.submittedAt)}</Text>
      </div>
      <div className="flex flex-wrap gap-2 pt-2">
        {report.urgent && report.status !== 'processed' ? <Badge variant="destructive">Urgent</Badge> : null}
        <Badge variant="secondary">{reportStatusLabels[report.status]}</Badge>
      </div>
    </li>)}
  </ul></CardContent></Card>
}
