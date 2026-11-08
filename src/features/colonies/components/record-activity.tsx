import { FileText } from 'lucide-react'
import { Link } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { Card, CardList } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { RecordListItem } from '@/components/ui/record-list'
import { useReportDetailLink } from '@/features/inbox/components/report-detail-context'
import { reportStatusLabels, type InboxReport } from '@/features/inbox/types'
import { formatReportTime } from '../directory-data'

export function ReportActivity({ reports, emptyTitle = 'No reports' }: { reports: InboxReport[]; emptyTitle?: string }) {
  const reportLink = useReportDetailLink()
  if (!reports.length) return <EmptyState icon={<FileText />} title={emptyTitle} />
  return <Card padding="none"><CardList aria-label="Reports">
    {reports.map((report) => <li key={report.id}><RecordListItem title={report.title} aria-label={report.title}
      render={<Link {...reportLink(report.id, `record-report:${report.id}`)} />}
      meta={`${report.category} · ${formatReportTime(report.submittedAt)}`}
      badge={<>
        {report.urgent && report.status !== 'processed' ? <Badge variant="destructive">Urgent</Badge> : null}
        <Badge variant="secondary">{reportStatusLabels[report.status]}</Badge>
      </>} />
    </li>)}
  </CardList></Card>
}
