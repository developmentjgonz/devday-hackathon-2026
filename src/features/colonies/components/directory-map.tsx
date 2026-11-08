import { useMemo } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ColonyMap, type ColonyMapData } from '@/components/ui/colony-map'
import { RecordAvatar } from '@/components/ui/record-avatar'
import { TextLink } from '@/components/ui/text-link'
import { Heading, Text } from '@/components/ui/typography'
import type { InboxCat, InboxColony, InboxReport } from '@/features/inbox/types'

export function DirectoryMap({ colonies, cats, reports, scope }: {
  colonies: InboxColony[]
  cats: InboxCat[]
  reports: InboxReport[]
  scope: 'colonies' | 'cats'
}) {
  const mapData = useMemo<ColonyMapData>(() => ({
    audience: 'team',
    colonies: colonies.flatMap((colony) => {
      const matchingCats = cats.filter((cat) => cat.colonyId === colony.id)
      if (!colony.coordinates || (scope === 'cats' && !matchingCats.length)) return []
      const urgent = reports.some((report) => report.colonyId === colony.id && report.urgent && report.status !== 'processed')
      return [{ id: colony.id, name: colony.name, coordinates: colony.coordinates, status: urgent ? 'urgent-report' as const : 'unknown' as const, catCount: matchingCats.length }]
    }),
  }), [colonies, cats, reports, scope])
  const missingColonies = colonies.filter((colony) => !colony.coordinates)
  const missingCats = cats.filter((cat) => !colonies.some((colony) => colony.id === cat.colonyId && colony.coordinates))

  return <div className="space-y-4">
    <ColonyMap
      data={mapData}
      title={scope === 'cats' ? 'Cats by colony' : 'Colony map'}
      subtitle={scope === 'cats' ? 'Markers show colony locations, not individual cat sightings.' : 'Colony locations'}
      renderSelection={(id) => scope === 'colonies'
        ? <Button variant="outline" size="sm" render={<Link to={`/app/colonies/${encodeURIComponent(id)}`} />}>View colony</Button>
        : <div className="space-y-2"><Heading level={3} size="compact">Cats in this colony</Heading><ul className="grid gap-2 sm:grid-cols-2">{cats.filter((cat) => cat.colonyId === id).map((cat) => <li key={cat.id} className="flex items-center gap-3"><RecordAvatar name={cat.name} kind="cat" src={cat.photoUrl} size="sm" /><TextLink render={<Link to={`/app/cats/${encodeURIComponent(cat.id)}`} />}>{cat.name}</TextLink></li>)}</ul></div>}
    />
    {(scope === 'colonies' ? missingColonies.length : missingCats.length) > 0 ? <Card size="sm"><CardContent className="space-y-2">
      <Heading level={2} size="compact">{scope === 'colonies' ? 'Colonies without a location' : 'Cats in colonies without a location'}</Heading>
      <Text size="caption" tone="muted">These records are not shown on the map.</Text>
      <ul className="flex flex-wrap gap-x-4">{scope === 'colonies'
        ? missingColonies.map((colony) => <li key={colony.id}><TextLink render={<Link to={`/app/colonies/${encodeURIComponent(colony.id)}`} />}>{colony.name}</TextLink></li>)
        : missingCats.map((cat) => <li key={cat.id}><TextLink render={<Link to={`/app/cats/${encodeURIComponent(cat.id)}`} />}>{cat.name}</TextLink></li>)}</ul>
    </CardContent></Card> : null}
  </div>
}
