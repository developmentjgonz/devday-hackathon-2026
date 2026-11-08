import { isReportClosed } from '../../../../shared/types/workspace'
import { Cat, House } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { RecordList } from '@/components/ui/record-list'
import { RecordAvatar } from '@/components/ui/record-avatar'
import { TextLink } from '@/components/ui/text-link'
import { Heading, Text } from '@/components/ui/typography'
import { useInbox } from '@/features/inbox/inbox-context'
import { CatRecordCard, CatRecordListItem } from '@/features/cats/components/cat-record-card'
import { openTasksForRecord, resolveTasks, tasksForRecord } from '@/features/tasks/task-data'
import { CareRules } from '@/features/tasks/components/care-rules'
import { ReportActivity } from '../components/record-activity'
import { RecordTasks } from '../components/record-tasks'
import { RecordTimeline } from '../components/record-timeline'
import { NewRecordButton } from '../components/new-record-button'
import { ManageColonyCats } from '../components/manage-colony-cats'
import { RecordActions } from '../components/record-actions'
import { ColonyLocation } from '../components/colony-location'
import { recentReports, reportsForColony } from '../directory-data'

export function ColonyPage() {
  const { colonyId } = useParams()
  return <ColonyDetailContent colonyId={colonyId} />
}

export function ColonyDetailContent({ colonyId, inDrawer = false }: { colonyId?: string; inDrawer?: boolean }) {
  const { data, reports, tasks: allTasks } = useInbox()
  const colony = data.colonies.find((item) => item.id === colonyId)
  if (!colony) return <EmptyState size="page" icon={<House />} title="Colony not found" action={<Button render={<Link to="/app/colonies" />}>View colonies</Button>} />

  const relatedReports = reportsForColony(reports, colony.id)
  const openReports = relatedReports.filter((report) => !isReportClosed(report.status))
  const urgentReports = openReports.filter((report) => report.urgent)
    .sort((a, b) => Date.parse(a.submittedAt) - Date.parse(b.submittedAt))
  const resolvedTasks = resolveTasks(allTasks, reports, data)
  const tasks = openTasksForRecord(resolvedTasks, 'colony', colony.id)
  const cats = data.cats.filter((cat) => cat.colonyId === colony.id)
  const visibleReports = [...urgentReports, ...recentReports(openReports.filter((report) => !report.urgent)).slice(0, Math.max(0, 5 - urgentReports.length))]

  return <>
    {!inDrawer ? <title>{`${colony.name} · Mews`}</title> : null}
    <div className="space-y-8">
      {inDrawer ? <RecordActions colonyId={colony.id} /> : <div className="flex flex-wrap items-center justify-between gap-5">
        <div className="flex min-w-0 items-center gap-4">
          <RecordAvatar name={colony.name} kind="colony" src={colony.photoUrl} size="lg" fallback="illustration" />
          <div className="min-w-0"><Text size="caption" tone="muted">Colony</Text><Heading level={2} size="title" className="wrap-anywhere">{colony.name}</Heading></div>
        </div>
        <RecordActions colonyId={colony.id} />
      </div>}
      <section aria-labelledby="colony-glance" className="space-y-3">
        <Heading id="colony-glance" level={2} size="card">At a glance</Heading>
        <ul className={inDrawer ? 'grid list-none grid-cols-2 gap-3 p-0' : 'grid list-none grid-cols-2 gap-3 p-0 lg:grid-cols-4'}>
          {[
            { label: 'Urgent reports', value: urgentReports.length },
            { label: 'Open reports', value: openReports.length },
            { label: 'Open tasks', value: tasks.length },
            { label: 'Known cats', value: cats.length },
          ].map(({ label, value }) => <Card key={label} size="sm" render={<li />}><CardContent className="space-y-1"><Text size="caption" tone="muted">{label}</Text><Text size="metric" weight="semibold">{value}</Text></CardContent></Card>)}
        </ul>
      </section>
      <section aria-labelledby="colony-cats" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3"><Heading id="colony-cats" level={2} size="card">Cats</Heading><div className="flex flex-wrap gap-2"><ManageColonyCats colony={colony} /><NewRecordButton kind="cat" colonyId={colony.id} fixedColony /></div></div>
        {cats.length ? <>
          <Text size="small" tone="muted">Select a cat to edit its profile or move it to another colony.</Text>
          <div className="md:hidden"><RecordList items={cats} getKey={(cat) => cat.id} label="Colony cats" itemName="cat" renderItem={(cat) => <CatRecordListItem cat={cat} urgentCount={reports.filter((report) => report.catId === cat.id && report.urgent && !isReportClosed(report.status)).length} taskCount={openTasksForRecord(resolvedTasks, 'cat', cat.id).length} />} /></div>
          <div className={inDrawer ? 'hidden gap-3 md:grid' : 'hidden gap-3 md:grid md:grid-cols-2 lg:grid-cols-3'}>{cats.map((cat) => <CatRecordCard key={cat.id} cat={cat} headingLevel={3} urgentCount={reports.filter((report) => report.catId === cat.id && report.urgent && !isReportClosed(report.status)).length} taskCount={openTasksForRecord(resolvedTasks, 'cat', cat.id).length} />)}</div>
        </> : <EmptyState icon={<Cat />} title="No cats in this colony" />}
      </section>
      <div className={inDrawer ? 'grid gap-8' : 'grid items-start gap-8 lg:grid-cols-2 lg:items-stretch'}>
        <RecordTasks type="colony" tasks={tasksForRecord(resolvedTasks, 'colony', colony.id)} alignHeadingWithAction={!inDrawer} />
        <ColonyLocation colony={colony} catCount={cats.length} fill={!inDrawer} />
      </div>
      <CareRules recordType="colony" recordId={colony.id} recordName={colony.name} />
      <section aria-labelledby="colony-reports" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2"><Heading id="colony-reports" level={2} size="card">Open reports</Heading><TextLink render={<Link to={`/app/reports?colony=${encodeURIComponent(colony.id)}`} />}>View all colony reports</TextLink></div>
        {visibleReports.length < openReports.length ? <Text size="caption" tone="muted">Showing {visibleReports.length} of {openReports.length} open reports.</Text> : null}
        <ReportActivity reports={visibleReports} emptyTitle="No open reports" />
      </section>
      <RecordTimeline key={colony.id} type="colony" id={colony.id} />
    </div>
  </>
}
