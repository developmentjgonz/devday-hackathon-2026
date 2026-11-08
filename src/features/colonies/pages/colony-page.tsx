import { Cat, House } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { RecordAvatar } from '@/components/ui/record-avatar'
import { TextLink } from '@/components/ui/text-link'
import { Heading, Text } from '@/components/ui/typography'
import { useInbox } from '@/features/inbox/inbox-context'
import { openTasksForRecord, resolveTasks } from '@/features/tasks/task-data'
import { reportStatusLabels } from '@/features/inbox/types'
import { OpenTasks, ReportActivity } from '../components/record-activity'
import { NewRecordButton } from '../components/new-record-button'
import { RecordActions } from '../components/record-actions'
import { ColonyLocation } from '../components/colony-location'
import { colonySummary, formatReportTime, recentReports, reportsForColony } from '../directory-data'

export function ColonyPage() {
  const { colonyId } = useParams()
  const { data, reports, tasks: allTasks } = useInbox()
  const colony = data.colonies.find((item) => item.id === colonyId)
  if (!colony) return <EmptyState size="page" icon={<House />} title="Colony not found" action={<Button render={<Link to="/app/colonies" />}>View colonies</Button>} />

  const relatedReports = reportsForColony(reports, colony.id)
  const urgentReports = relatedReports.filter((report) => report.urgent && report.status !== 'processed')
    .sort((a, b) => Date.parse(a.submittedAt) - Date.parse(b.submittedAt))
  const tasks = openTasksForRecord(resolveTasks(allTasks, reports, data), 'colony', colony.id)
  const summary = colonySummary(colony, data.cats, reports, resolveTasks(allTasks, reports, data))
  const cats = data.cats.filter((cat) => cat.colonyId === colony.id)
  const urgentIds = new Set(urgentReports.map((report) => report.id))
  const recent = recentReports(relatedReports).filter((report) => !urgentIds.has(report.id) && report.id !== summary.feedingReport?.id).slice(0, 5)

  return <>
    <title>{colony.name} · Mews</title>
    <div className="space-y-8">
      <RecordActions colonyId={colony.id} />
      <ColonyLocation colony={colony} />
      {urgentReports.length ? <section aria-labelledby="colony-urgent-reports" className="space-y-3">
        <Heading id="colony-urgent-reports" level={2} size="card">Urgent reports to review</Heading>
        <ReportActivity reports={urgentReports} />
      </section> : null}
      <div className="grid items-start gap-8 lg:grid-cols-2">
        <section aria-labelledby="colony-tasks" className="space-y-3">
          <Heading id="colony-tasks" level={2} size="card">Open tasks</Heading>
          <OpenTasks tasks={tasks} />
        </section>
        {!summary.feedingReport || !urgentIds.has(summary.feedingReport.id) ? <section aria-labelledby="colony-feeding" className="space-y-3">
          <Heading id="colony-feeding" level={2} size="card">Latest feeding report</Heading>
          {summary.feedingReport ? <Card size="sm"><CardContent className="space-y-2">
            <TextLink render={<Link to={`/app/reports?report=${encodeURIComponent(summary.feedingReport.id)}`} />}>{summary.feedingReport.title}</TextLink>
            <Text size="caption" tone="muted">{formatReportTime(summary.feedingReport.submittedAt)}</Text>
            <Badge variant="secondary">{reportStatusLabels[summary.feedingReport.status]}</Badge>
          </CardContent></Card> : <EmptyState icon={<House />} title="No feeding reports" />}
        </section> : null}
      </div>
      <section aria-labelledby="colony-cats" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3"><Heading id="colony-cats" level={2} size="card">Cats</Heading><NewRecordButton kind="cat" colonyId={colony.id} /></div>
        {cats.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{cats.map((cat) => <Card key={cat.id} size="sm" interactive render={<Link to={`/app/cats/${encodeURIComponent(cat.id)}`} />} aria-label={cat.name}><CardContent className="flex items-center gap-3"><RecordAvatar name={cat.name} kind="cat" src={cat.photoUrl} /><Text size="small" weight="medium">{cat.name}</Text></CardContent></Card>)}</div> : <EmptyState icon={<Cat />} title="No cats in this colony" />}
      </section>
      <section aria-labelledby="colony-reports" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2"><Heading id="colony-reports" level={2} size="card">Other recent reports</Heading><TextLink render={<Link to={`/app/reports?colony=${encodeURIComponent(colony.id)}`} />}>View colony reports</TextLink></div>
        <ReportActivity reports={recent} emptyTitle="No other reports" />
      </section>
    </div>
  </>
}
