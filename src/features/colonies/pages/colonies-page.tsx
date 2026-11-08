import { useState } from 'react'
import { Bubbles, Cat, ClipboardList, LayoutGrid, List, Map as MapIcon, Search } from 'lucide-react'
import { Link } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { DataTableToolbar } from '@/components/ui/data-table-toolbar'
import { RecordList, RecordListItem } from '@/components/ui/record-list'
import { RecordAvatar } from '@/components/ui/record-avatar'
import { Heading, Text } from '@/components/ui/typography'
import { ViewSwitcher } from '@/components/ui/view-switcher'
import { useInbox } from '@/features/inbox/inbox-context'
import { resolveTasks } from '@/features/tasks/task-data'
import { colonySummary } from '../directory-data'
import { NewRecordButton } from '../components/new-record-button'
import { DirectoryMap } from '../components/directory-map'

type Summary = ReturnType<typeof colonySummary>

function ColonyRecord({ summary, view }: { summary: Summary; view: string }) {
  const { colony, catCount, urgentCount, taskCount } = summary
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
    <CardContent>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2"><Cat aria-hidden="true" className="size-4 shrink-0" /><Text size="small">{catCount} known {catCount === 1 ? 'cat' : 'cats'}</Text></div>
        <div className="flex items-center gap-2"><ClipboardList aria-hidden="true" className="size-4 shrink-0" /><Text size="small">{taskCount} open {taskCount === 1 ? 'task' : 'tasks'}</Text></div>
      </div>
    </CardContent>
  </Card>

  return <RecordListItem render={<Link to={`/app/colonies/${encodeURIComponent(colony.id)}`} />} aria-label={colony.name}
    title={colony.name} leading={<RecordAvatar name={colony.name} kind="colony" src={colony.photoUrl} size="sm" />}
    meta={`${catCount} known ${catCount === 1 ? 'cat' : 'cats'} · ${taskCount} open ${taskCount === 1 ? 'task' : 'tasks'}`}
    badge={urgentCount > 0 ? <Badge variant="destructive">{urgentCount} urgent {urgentCount === 1 ? 'report' : 'reports'}</Badge> : undefined} />
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
        <Button variant="outline" size="sm" render={<Link to="/app/colonies/bubbles" />}><Bubbles aria-hidden="true" />Colony bubbles</Button>
        <NewRecordButton kind="colony" onCreated={() => setSearch('')} />
      </>} />
      {view !== 'list' ? <Text size="caption" tone="muted">{summaries.length} {summaries.length === 1 ? 'colony' : 'colonies'}{query ? ' found' : ''}</Text> : null}
      {summaries.length ? view === 'map' ? <DirectoryMap scope="colonies" colonies={summaries.map((summary) => summary.colony)} cats={data.cats} reports={reports} /> : view === 'cards' ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{summaries.map((summary) => <ColonyRecord key={summary.colony.id} summary={summary} view="cards" />)}</div>
        : <RecordList key={query} items={summaries} getKey={(summary) => summary.colony.id} label="Colonies" itemName="colony" renderItem={(summary) => <ColonyRecord summary={summary} view="list" />} />
        : <EmptyState icon={<Search />} title={query ? 'No matching colonies' : 'No colonies'} description={query ? 'Try another colony name.' : undefined} />}
    </div>
  </>
}
