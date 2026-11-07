import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ColonyMap } from '@/components/ui/colony-map'
import { Heading, Text } from '@/components/ui/typography'
import { publicMapData } from '@/data/demo-public-map'

export function CommunityTracker() {
  const [filter, setFilter] = useState<'all' | 'high'>('all')
  const data = filter === 'all' ? publicMapData : {
    ...publicMapData,
    areas: publicMapData.areas.filter(area => area.activity === 'high'),
  }

  return (
    <section id="tracker" className="landing-tracker landing-width" aria-labelledby="tracker-title">
      <div className="landing-tracker-heading">
        <div>
          <Heading size="title" id="tracker-title">Around the neighborhood.</Heading>
        </div>
        <Badge variant="outline">Sample data</Badge>
      </div>
      <div className="landing-tracker-tools">
        <div role="group" aria-label="Filter community areas" className="landing-tracker-filters">
          <Button variant={filter === 'all' ? 'secondary' : 'ghost'} aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>All areas</Button>
          <Button variant={filter === 'high' ? 'secondary' : 'ghost'} aria-pressed={filter === 'high'} onClick={() => setFilter('high')}>Higher activity</Button>
        </div>
        <Text size="label" tone="muted" role="status">{data.areas.length} {data.areas.length === 1 ? 'area' : 'areas'}</Text>
      </div>
      <ColonyMap data={data} title="Community tracker" />
    </section>
  )
}
