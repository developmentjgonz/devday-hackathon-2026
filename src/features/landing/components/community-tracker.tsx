import { ColonyMap } from '@/components/ui/colony-map'
import { Heading } from '@/components/ui/typography'
import { publicMapData } from '@/data/demo-public-map'

export function CommunityTracker() {
  return (
    <section id="tracker" className="landing-tracker landing-width" aria-labelledby="tracker-title">
      <Heading size="title" id="tracker-title" className="mb-7">Around the neighborhood.</Heading>
      <ColonyMap data={publicMapData} title="Colony activity" />
    </section>
  )
}
