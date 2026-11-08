import { useState } from 'react'
import { Cat, ClipboardList, LayoutGrid, List, Map as MapIcon, Search, Soup } from 'lucide-react'
import { Link } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { DataTableToolbar } from '@/components/ui/data-table-toolbar'
import { RecordAvatar } from '@/components/ui/record-avatar'
import { Heading, Text } from '@/components/ui/typography'
import { ViewSwitcher } from '@/components/ui/view-switcher'
import { useInbox } from '@/features/inbox/inbox-context'
import { resolveTasks } from '@/features/tasks/task-data'
import { reportStatusLabels } from '@/features/inbox/types'
import { colonySummary, formatReportTime } from '../directory-data'
import { NewRecordButton } from '../components/new-record-button'
import { DirectoryMap } from '../components/directory-map'

type Summary = ReturnType<typeof colonySummary>

function ColonyRecord({ summary, view }: { summary: Summary; view: string }) {
  const { colony, catCount, urgentCount, taskCount, feedingReport } = summary
  if (view === 'cards') return <Card size="sm" interactive render={<Link to={`/app/colonies/${encodeURIComponent(colony.id)}`} />} aria-label={colony.name}>
    <CardHeader>
      <div className="flex flex-wrap items-center gap-3">
        <RecordAvatar name={colony.name} kind="colony" src={colony.photoUrl} size="lg" fallback="illustration" />
        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-2">
          <Heading level={2} size="card" className="min-w-0 wrap-anywhere">{colony.name}</Heading>
          {urgentCount > 0 ? <Badge variant="destructive">{urgentCount} urgent {urgentCount === 1 ? 'report' : 'reports'}</Badge> : null}
        </div>
      </div>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2"><Cat aria-hidden="true" className="size-5 shrink-0" /><Text size="small">{catCount} known {catCount === 1 ? 'cat' : 'cats'}</Text></div>
        <div className="flex items-center gap-2"><ClipboardList aria-hidden="true" className="size-5 shrink-0" /><Text size="small">{taskCount} open {taskCount === 1 ? 'task' : 'tasks'}</Text></div>
      </div>
      <Card size="sm" tone="subtle"><CardContent className="flex items-center gap-3">
        <Soup aria-hidden="true" className="size-5 shrink-0" />
        <div className="min-w-0"><Text size="caption" tone="muted">Latest feeding report</Text><Text size="small" weight="medium">{feedingReport ? `${formatReportTime(feedingReport.submittedAt)} · ${reportStatusLabels[feedingReport.status]}` : 'No feeding reports'}</Text></div>
      </CardContent></Card>
    </CardContent>
  </Card>

  return <Card size="sm" interactive render={<Link to={`/app/colonies/${encodeURIComponent(colony.id)}`} />} aria-label={colony.name}>
    <CardHeader>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <div className="flex min-w-0 items-center gap-3"><RecordAvatar name={colony.name} kind="colony" src={colony.photoUrl} size="sm" /><Heading level={2} size="card" className="wrap-anywhere">{colony.name}</Heading></div>
        {urgentCount > 0 ? <Badge variant="destructive">{urgentCount} urgent {urgentCount === 1 ? 'report' : 'reports'}</Badge> : null}
      </div>
    </CardHeader>
    <CardContent>
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div><Text render={<dt />} size="caption" tone="muted">Known cats</Text><Text render={<dd />} size="small" weight="medium">{catCount}</Text></div>
        <div><Text render={<dt />} size="caption" tone="muted">Open tasks</Text><Text render={<dd />} size="small" weight="medium">{taskCount}</Text></div>
        <div className="col-span-2 sm:col-span-1"><Text render={<dt />} size="caption" tone="muted">Latest feeding report</Text><Text render={<dd />} size="small">{feedingReport ? `${formatReportTime(feedingReport.submittedAt)} · ${reportStatusLabels[feedingReport.status]}` : 'No feeding reports'}</Text></div>
      </dl>
    </CardContent>
  </Card>
}

export function ColoniesPage() {
  const { data, reports, tasks } = useInbox()
  const resolvedTasks = resolveTasks(tasks, reports, data)
  const [search, setSearch] = useState('')
  const [view, setView] = useState<'list' | 'cards' | 'map'>('list')
  const query = search.trim().toLocaleLowerCase()
  const summaries = data.colonies
    .filter((colony) => colony.name.toLocaleLowerCase().includes(query))
    .map((colony) => colonySummary(colony, data.cats, reports, resolvedTasks))
    .sort((a, b) => b.urgentCount - a.urgentCount || a.colony.name.localeCompare(b.colony.name))

  return <>
    <title>Colonies · Mews</title>
    <div className="space-y-5">
      <DataTableToolbar label="Colony controls" search={{ label: 'Search colonies', placeholder: 'Search colonies…', value: search, onValueChange: setSearch }} actions={<>
        <ViewSwitcher label="Colony view" value={view} onValueChange={setView} options={[
          { value: 'list', label: 'List', icon: <List aria-hidden="true" /> },
          { value: 'cards', label: 'Cards', icon: <LayoutGrid aria-hidden="true" /> },
          { value: 'map', label: 'Map', icon: <MapIcon aria-hidden="true" /> },
        ]} />
        <NewRecordButton kind="colony" onCreated={() => setSearch('')} />
      </>} />
      <Text size="caption" tone="muted">{summaries.length} {summaries.length === 1 ? 'colony' : 'colonies'}{query ? ' found' : ''}</Text>
      {summaries.length ? view === 'map' ? <DirectoryMap scope="colonies" colonies={summaries.map((summary) => summary.colony)} cats={data.cats} reports={reports} /> : <div className={view === 'cards' ? 'grid gap-4 md:grid-cols-2 xl:grid-cols-3' : 'grid gap-3'}>{summaries.map((summary) => <ColonyRecord key={summary.colony.id} summary={summary} view={view} />)}</div>
        : <EmptyState icon={<Search />} title={query ? 'No matching colonies' : 'No colonies'} description={query ? 'Try another colony name.' : undefined} />}
    </div>
  </>
}
