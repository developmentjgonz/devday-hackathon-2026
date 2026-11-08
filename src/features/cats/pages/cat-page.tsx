import { Cat } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { RecordAvatar } from '@/components/ui/record-avatar'
import { TextLink } from '@/components/ui/text-link'
import { Heading, Text } from '@/components/ui/typography'
import { useInbox } from '@/features/inbox/inbox-context'
import { ReportActivity } from '@/features/colonies/components/record-activity'
import { RecordTasks } from '@/features/colonies/components/record-tasks'
import { RecordTimeline } from '@/features/colonies/components/record-timeline'
import { RecordActions } from '@/features/colonies/components/record-actions'
import { recentReports } from '@/features/colonies/directory-data'
import { resolveTasks, tasksForRecord } from '@/features/tasks/task-data'
import { CareRules } from '@/features/tasks/components/care-rules'
import { EditCatButton } from '../components/edit-cat-button'
import { catAge } from '@/lib/cat-age'

const birthDateFormat = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })

export function CatPage() {
  const { catId } = useParams()
  const { data, reports, tasks: allTasks } = useInbox()
  const cat = data.cats.find((item) => item.id === catId)
  if (!cat) return <EmptyState size="page" icon={<Cat />} title="Cat not found" action={<Button render={<Link to="/app/cats" />}>View cats</Button>} />
  const colony = data.colonies.find((item) => item.id === cat.colonyId)
  const associatedReports = reports.filter((report) => report.catId === cat.id)
  const tasks = tasksForRecord(resolveTasks(allTasks, reports, data), 'cat', cat.id)

  return <>
    <title>{`${cat.name} · Mews`}</title>
    <div className="space-y-8">
      <RecordActions colonyId={cat.colonyId} catId={cat.id}><EditCatButton cat={cat} /></RecordActions>
      <section aria-labelledby="cat-details" className="space-y-3">
        <Heading id="cat-details" level={2} size="card">Details</Heading>
        <Card size="sm"><CardContent className="space-y-4"><div className="flex min-w-0 items-start gap-4"><RecordAvatar name={cat.name} kind="cat" src={cat.photoUrl} size="lg" /><div className="min-w-0 flex-1 space-y-1"><Heading level={3} size="card" className="wrap-anywhere">{cat.name}</Heading><Text size="caption" tone="muted">Colony</Text>{colony ? <TextLink render={<Link to={`/app/colonies/${encodeURIComponent(colony.id)}`} />}>{colony.name}</TextLink> : <Text size="small">No colony</Text>}</div></div>
          {cat.birthDate ? <dl className="grid gap-3 sm:grid-cols-2"><div><Text render={<dt />} size="caption" tone="muted">{cat.birthDateEstimated ? 'Estimated birth date' : 'Birth date'}</Text><Text render={<dd />} size="small">{birthDateFormat.format(new Date(`${cat.birthDate}T00:00:00Z`))}</Text></div><div><Text render={<dt />} size="caption" tone="muted">Age</Text><Text render={<dd />} size="small">{catAge(cat.birthDate, Boolean(cat.birthDateEstimated))}</Text></div></dl> : null}
          {cat.description ? <div><Text size="caption" tone="muted">Details</Text><Text size="small" className="whitespace-pre-wrap wrap-anywhere">{cat.description}</Text></div> : null}
        </CardContent></Card>
      </section>
      <RecordTasks type="cat" tasks={tasks} />
      <CareRules recordType="cat" recordId={cat.id} recordName={cat.name} />
      <section aria-labelledby="cat-reports" className="space-y-3">
        <Heading id="cat-reports" level={2} size="card">Recent associated reports</Heading>
        <ReportActivity reports={recentReports(associatedReports).slice(0, 5)} />
      </section>
      <RecordTimeline key={cat.id} type="cat" id={cat.id} />
    </div>
  </>
}
