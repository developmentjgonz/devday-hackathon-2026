import { useState } from 'react'
import { Cat, LayoutGrid, Map as MapIcon, Search } from 'lucide-react'
import { DataTableToolbar } from '@/components/ui/data-table-toolbar'
import { EmptyState } from '@/components/ui/empty-state'
import { Text } from '@/components/ui/typography'
import { ViewSwitcher } from '@/components/ui/view-switcher'
import { useInbox } from '@/features/inbox/inbox-context'
import { DirectoryMap } from '@/features/colonies/components/directory-map'
import { openTasksForRecord, resolveTasks } from '@/features/tasks/task-data'
import { NewRecordButton } from '@/features/colonies/components/new-record-button'
import { CatRecordCard } from '../components/cat-record-card'

export function CatsPage() {
  const { data, reports, tasks } = useInbox()
  const resolvedTasks = resolveTasks(tasks, reports, data)
  const [search, setSearch] = useState('')
  const [colonyId, setColonyId] = useState('all')
  const [view, setView] = useState<'cards' | 'map'>('cards')
  const query = search.trim().toLocaleLowerCase()
  const cats = data.cats.filter((cat) => {
    const colony = data.colonies.find((item) => item.id === cat.colonyId)
    return (colonyId === 'all' || cat.colonyId === colonyId) && `${cat.name} ${cat.description ?? ''} ${colony?.name ?? ''}`.toLocaleLowerCase().includes(query)
  }).sort((a, b) => a.name.localeCompare(b.name))

  return <>
    <title>Cats · Mews</title>
    <div className="space-y-6">
      <DataTableToolbar label="Cat controls" search={{ label: 'Search cats', placeholder: 'Search cats…', value: search, onValueChange: setSearch }} filters={[
        { id: 'colony', label: 'Colony', value: colonyId, onValueChange: setColonyId, options: [{ value: 'all', label: 'All colonies' }, ...data.colonies.map((colony) => ({ value: colony.id, label: colony.name }))] },
      ]} actions={<><ViewSwitcher label="Cat view" value={view} onValueChange={setView} options={[
        { value: 'cards', label: 'Cards', icon: <LayoutGrid aria-hidden="true" /> },
        { value: 'map', label: 'Map', icon: <MapIcon aria-hidden="true" /> },
      ]} /><NewRecordButton kind="cat" colonyId={colonyId === 'all' ? '' : colonyId} onCreated={() => { setSearch(''); setColonyId('all') }} /></>} />
      <Text size="caption" tone="muted">{cats.length} {cats.length === 1 ? 'cat' : 'cats'}{query || colonyId !== 'all' ? ' found' : ''}</Text>
      {cats.length ? view === 'map' ? <DirectoryMap scope="cats" colonies={data.colonies} cats={cats} reports={reports} /> : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{cats.map((cat) => {
        const associated = reports.filter((report) => report.catId === cat.id)
        const urgentCount = associated.filter((report) => report.urgent && report.status !== 'processed').length
        const taskCount = openTasksForRecord(resolvedTasks, 'cat', cat.id).length
        return <CatRecordCard key={cat.id} cat={cat} colonyName={data.colonies.find((colony) => colony.id === cat.colonyId)?.name ?? 'Colony unknown'} urgentCount={urgentCount} taskCount={taskCount} />
      })}</div> : <EmptyState icon={query || colonyId !== 'all' ? <Search /> : <Cat />} title={query || colonyId !== 'all' ? 'No matching cats' : 'No cats'} description={query || colonyId !== 'all' ? 'Try another search or colony.' : undefined} />}
    </div>
  </>
}
