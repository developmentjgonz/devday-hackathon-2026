import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Heading, HeadingAccent, Text } from '@/components/ui/typography'
import { CareSticker, CatPawPrint } from '@/components/brand-assets'
import { CommunityCat } from '@/components/illustrations/community-cat'
import { CommunityTracker } from '../components/community-tracker'
import '@/styles/landing.css'
import type { PublicContent } from '../../../../shared/types/public'

export function LandingPage({ initialContent }: { initialContent?: PublicContent } = {}) {
  return (
    <div className="landing">
      <title>Mews · Every cat counts.</title>
      <meta name="description" content="Track cat colonies, feeding visits, cat records, and care needs with your rescue team in Mews." />
      <section className="landing-hero landing-width" aria-labelledby="landing-title">
        <div className="min-w-0">
          <Heading level={1} size="display" id="landing-title">Track cat colonies.<br /><HeadingAccent>Care together.</HeadingAccent></Heading>
          <Text size="lead" tone="muted" className="mt-6 max-w-sm">Feeding visits, cat records, and care needs in one shared place.</Text>
          <div className="landing-hero-actions">
            <Button size="lg" render={<a href="#tracker" />}>View colony activity <CatPawPrint /></Button>
            <Button variant="outline" size="lg" render={<Link to="/report" />}>Report a cat</Button>
          </div>
        </div>
        <div className="landing-illustration">
          <CommunityCat className="community-cat" />
          <div className="landing-sticker"><CareSticker /></div>
        </div>
      </section>
      <CommunityTracker initialContent={initialContent} />
    </div>
  )
}
