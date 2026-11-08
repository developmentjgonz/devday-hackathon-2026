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
import { CatRecordCard } from '@/features/cats/components/cat-record-card'
import { openTasksForRecord, resolveTasks, tasksForRecord } from '@/features/tasks/task-data'
import { reportStatusLabels } from '@/features/inbox/types'
import { ReportActivity } from '../components/record-activity'
import { RecordTasks } from '../components/record-tasks'
import { RecordTimeline } from '../components/record-timeline'
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
  const resolvedTasks = resolveTasks(allTasks, reports, data)
  const tasks = openTasksForRecord(resolvedTasks, 'colony', colony.id)
  const summary = colonySummary(colony, data.cats, reports, resolvedTasks)
  const cats = data.cats.filter((cat) => cat.colonyId === colony.id)
  const openReportCount = relatedReports.filter((report) => report.status !== 'processed').length
  const urgentIds = new Set(urgentReports.map((report) => report.id))
  const recent = recentReports(relatedReports).filter((report) => !urgentIds.has(report.id) && report.id !== summary.feedingReport?.id).slice(0, 5)

  return <>
    <title>{colony.name} · Mews</title>
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-5">
        <div className="flex min-w-0 items-center gap-4">
          <RecordAvatar name={colony.name} kind="colony" src={colony.photoUrl} size="lg" fallback="illustration" />
          <div className="min-w-0"><Text size="caption" tone="muted">Colony</Text><Heading level={2} size="title" className="wrap-anywhere">{colony.name}</Heading></div>
        </div>
        <RecordActions colonyId={colony.id} />
      </div>
      <section aria-labelledby="colony-glance" className="space-y-3">
        <Heading id="colony-glance" level={2} size="card">At a glance</Heading>
        <ul className="grid list-none grid-cols-2 gap-3 p-0 lg:grid-cols-4">
          {[
            { label: 'Urgent reports', value: urgentReports.length },
            { label: 'Open reports', value: openReportCount },
            { label: 'Open tasks', value: tasks.length },
            { label: 'Known cats', value: cats.length },
          ].map(({ label, value }) => <Card key={label} size="sm" render={<li />}><CardContent className="space-y-1"><Text size="caption" tone="muted">{label}</Text><Text size="metric" weight="semibold">{value}</Text></CardContent></Card>)}
        </ul>
      </section>
      <div className="grid items-start gap-8 lg:grid-cols-2">
        <div className="lg:col-start-1 lg:row-start-1">
          <ColonyLocation colony={colony} catCount={cats.length} />
        </div>
        {urgentReports.length ? <section aria-labelledby="colony-urgent-reports" className="space-y-3 lg:col-start-2 lg:row-start-1">
          <Heading id="colony-urgent-reports" level={2} size="card">Urgent reports to review</Heading>
          <ReportActivity reports={urgentReports} />
        </section> : null}
        <div className={`lg:col-start-2 ${urgentReports.length ? 'lg:row-start-2' : 'lg:row-start-1'}`}>
          <RecordTasks type="colony" tasks={tasksForRecord(resolvedTasks, 'colony', colony.id)} />
        </div>
        {!summary.feedingReport || !urgentIds.has(summary.feedingReport.id) ? <section aria-labelledby="colony-feeding" className="space-y-3 lg:col-start-1 lg:row-start-2">
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
        {cats.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{cats.map((cat) => <CatRecordCard key={cat.id} cat={cat} headingLevel={3} urgentCount={reports.filter((report) => report.catId === cat.id && report.urgent && report.status !== 'processed').length} taskCount={openTasksForRecord(resolvedTasks, 'cat', cat.id).length} />)}</div> : <EmptyState icon={<Cat />} title="No cats in this colony" />}
      </section>
      <section aria-labelledby="colony-reports" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2"><Heading id="colony-reports" level={2} size="card">Other recent reports</Heading><TextLink render={<Link to={`/app/reports?colony=${encodeURIComponent(colony.id)}`} />}>View colony reports</TextLink></div>
        <ReportActivity reports={recent} emptyTitle="No other reports" />
      </section>
      <RecordTimeline key={colony.id} type="colony" id={colony.id} />
    </div>
  </>
}
