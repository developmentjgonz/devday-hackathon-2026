import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Heading, Text } from '@/components/ui/typography'
import { sampleNews, sampleOpenings } from '../data/sample-posts'

export function CommunityPage() {
  return (
    <div className="landing-width py-12 sm:py-16">
      <title>Community board · Mews</title>
      <div className="mx-auto max-w-5xl">
        <Heading level={1} size="title">Community board</Heading>
        <Text tone="muted" className="mt-4">Find ways to help cats in your community.</Text>
        <section className="mt-12" aria-labelledby="volunteer-openings-title">
          <Heading id="volunteer-openings-title" size="section">Volunteer openings</Heading>
          <div className="mt-6 grid gap-5 lg:grid-cols-3">
            {sampleOpenings.map((opening) => (
              <article key={opening.id} aria-labelledby={`${opening.id}-title`} className="flex min-w-0">
                <Card className="w-full">
                  <CardHeader className="gap-3">
                    <Text size="small" tone="muted">{opening.area}</Text>
                    <Heading level={3} size="card" id={`${opening.id}-title`}>{opening.title}</Heading>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col gap-5">
                    <Text size="small">{opening.description}</Text>
                    <Text size="small" tone="muted" className="mt-auto">{opening.schedule}</Text>
                  </CardContent>
                </Card>
              </article>
            ))}
          </div>
        </section>
        <section className="mt-14" aria-labelledby="community-news-title">
          <Heading id="community-news-title" size="section">Community news</Heading>
          <div className="mt-6 grid gap-5">
            {sampleNews.map((post) => (
              <article key={post.id} aria-labelledby={`${post.id}-title`}>
                <Card>
                  <CardHeader className="gap-3">
                    <Text size="small" tone="muted"><time dateTime={post.date}>{post.dateLabel}</time></Text>
                    <Heading level={3} size="card" id={`${post.id}-title`}>{post.title}</Heading>
                  </CardHeader>
                  <CardContent><Text size="small">{post.description}</Text></CardContent>
                </Card>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
