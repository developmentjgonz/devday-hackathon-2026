import { PawPrint } from 'lucide-react'
import { Link } from 'react-router'
import { CommunityCat } from '@/components/illustrations/community-cat'
import { Heading, HeadingAccent, Text } from '@/components/ui/typography'
import { Button } from '@/components/ui/button'

export function AboutPage() {
  return (
    <div className="landing about-page landing-width">
      <title>About Mews · Care brings us together.</title>
      <meta name="description" content="Meet Mews: a shared home for community cat care and the people who make it happen." />
      <section className="about-intro" aria-labelledby="about-title">
        <div className="min-w-0">
          <Heading level={1} size="display" id="about-title">Care brings<br />us <HeadingAccent>together.</HeadingAccent></Heading>
          <Text size="lead" className="mt-6">Every community cat has a story.<br />So do the people who care for them.</Text>
          <Text tone="muted" className="mt-5 max-w-md">Mews brings that community into view. It’s a shared home for the daily acts of care that help cats live healthier lives.</Text>
        </div>
        <CommunityCat className="about-cat" />
      </section>
      <section className="about-story" aria-labelledby="about-care-title">
        <Heading id="about-care-title" size="title">Big care starts<br />with <HeadingAccent tone="success">small things.</HeadingAccent></Heading>
        <div className="about-prose">
          <Text>A fresh bowl of water. A morning feeding visit. Someone who notices when a familiar face is missing. Community cat care depends on people who keep showing up.</Text>
          <Text tone="muted">Mews is built around those everyday moments: helping volunteers and rescue coordinators share a clearer picture of each colony and the care it needs.</Text>
          <Heading level={3} size="section" className="mt-6">A community to see. Locations to protect.</Heading>
          <Text tone="muted">Our public map shows activity across broad areas. Individual colony locations and volunteer contact details stay out of the public view.</Text>
          <Button size="lg" className="mt-3" render={<Link to="/#tracker" />}>View colony activity <PawPrint aria-hidden="true" /></Button>
        </div>
      </section>
    </div>
  )
}
