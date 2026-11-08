import { useState } from 'react'
import { Bubbles, House, Map as MapIcon } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ColonyBubbleChart } from '@/components/ui/colony-bubble-chart'
import { EmptyState } from '@/components/ui/empty-state'
import { RecordAvatar } from '@/components/ui/record-avatar'
import { TextLink } from '@/components/ui/text-link'
import { Heading, Text } from '@/components/ui/typography'
import { ViewSwitcher } from '@/components/ui/view-switcher'
import { useInbox } from '@/features/inbox/inbox-context'
import { DirectoryMap } from '../components/directory-map'

export function ColonyBubblesPage() {
  const { data, reports } = useInbox()
  const [view, setView] = useState<'bubbles' | 'map'>('bubbles')
  const colonyIds = new Set(data.colonies.map((colony) => colony.id))
  const unassigned = data.cats.filter((cat) => !colonyIds.has(cat.colonyId)).sort((a, b) => a.name.localeCompare(b.name))
  return <>
    <title>Colony bubbles · Mews</title>
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Text size="small" tone="muted" aria-label="Community totals">{data.colonies.length} {data.colonies.length === 1 ? 'colony' : 'colonies'} · {data.cats.length} {data.cats.length === 1 ? 'cat' : 'cats'}</Text>
        <ViewSwitcher label="Colony view" value={view} onValueChange={setView} options={[
          { value: 'bubbles', label: 'Bubbles', icon: <Bubbles aria-hidden="true" /> },
          { value: 'map', label: 'Map', icon: <MapIcon aria-hidden="true" /> },
        ]} />
      </div>
      {view === 'map' ? <DirectoryMap scope="colonies" colonies={data.colonies} cats={data.cats} reports={reports} /> : <Card tone="note">
        <CardContent className="space-y-3">
          {data.colonies.length ? <ColonyBubbleChart colonies={data.colonies} cats={data.cats} /> : <EmptyState icon={<House />} title="No colonies yet" description="Add a colony to see it here." action={<Button variant="outline" render={<Link to="/app/colonies" />}>View colonies</Button>} />}
        </CardContent>
      </Card>}
      {view === 'bubbles' && unassigned.length ? <section className="space-y-3" aria-labelledby="cats-without-colony">
        <div><Heading id="cats-without-colony" level={2} size="card">Cats without a colony</Heading><Text size="small" tone="muted">{unassigned.length} {unassigned.length === 1 ? 'cat is' : 'cats are'} not assigned to a colony.</Text></div>
        <Card size="sm"><CardContent><ul className="flex flex-wrap gap-x-6 gap-y-2">{unassigned.map((cat) => <li key={cat.id}><TextLink aria-label={`Open cat: ${cat.name}`} render={<Link to={`/app/cats/${encodeURIComponent(cat.id)}`} />}><RecordAvatar name={cat.name} kind="cat" src={cat.photoUrl} size="sm" /><Text render={<span />} size="small">{cat.name}</Text></TextLink></li>)}</ul></CardContent></Card>
      </section> : null}
    </div>
  </>
}
