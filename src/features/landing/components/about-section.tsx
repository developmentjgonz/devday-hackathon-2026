import { Heading, HeadingAccent, Text } from '@/components/ui/typography'

export function AboutSection() {
  return (
    <section id="about" className="landing-about landing-width" aria-labelledby="about-title">
      <Heading level={2} size="title" id="about-title">About <HeadingAccent>us.</HeadingAccent></Heading>
      <div className="about-prose">
        <Text>A fresh bowl of water. A morning feeding visit. Someone who notices when a familiar face is missing. Mews helps volunteers and rescue teams build on these daily acts of care, so each cat gets the attention it needs.</Text>
        <Text tone="muted">Care also means protecting cats and their carers. Our public map shows activity across broad areas. Individual colony locations and volunteer contact details stay private.</Text>
      </div>
    </section>
  )
}
