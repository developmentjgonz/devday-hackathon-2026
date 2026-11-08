import { FileText, ListTodo } from 'lucide-react'
import { Link } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { TextLink } from '@/components/ui/text-link'
import { Text } from '@/components/ui/typography'
import { reportStatusLabels, type InboxReport } from '@/features/inbox/types'
import { formatTaskDue, type AssignedTask } from '@/features/tasks/task-data'
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

export function OpenTasks({ tasks }: { tasks: AssignedTask[] }) {
  if (!tasks.length) return <EmptyState icon={<ListTodo />} title="No open tasks" />
  return <Card size="sm"><CardContent><ul className="divide-y divide-border">
    {tasks.map((task) => <li key={task.id} className="py-3 first:pt-0 last:pb-0">
      {task.reportId && task.reportTitle ? <TextLink render={<Link to={`/app/reports?report=${encodeURIComponent(task.reportId)}`} />} className="max-w-full wrap-anywhere">{task.title}</TextLink> : <Text size="small" weight="medium" className="wrap-anywhere">{task.title}</Text>}
      <Text size="caption" tone="muted">{task.owner} · {task.due ? `Due ${formatTaskDue(task.due)}` : 'No due date'}</Text>
      {task.reportTitle ? <Text size="caption" tone="muted">From: {task.reportTitle}</Text> : null}
    </li>)}
  </ul></CardContent></Card>
}
