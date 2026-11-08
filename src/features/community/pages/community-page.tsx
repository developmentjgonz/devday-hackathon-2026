import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { CircleAlert, Newspaper, Users } from 'lucide-react'
import { Heading, Text } from '@/components/ui/typography'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { LoadingIndicator } from '@/components/ui/loading-indicator'
import { usePublicContent } from '@/features/landing/public-content'
import type { PublicContent } from '../../../../shared/types/public'

export function CommunityPage({ initialContent }: { initialContent?: PublicContent } = {}) {
  const { content, state, retry } = usePublicContent(initialContent)
  const dateFormat = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })
  return (
    <div className="landing-width py-12 sm:py-16">
      <title>Community board · Mews</title>
      <div className="mx-auto max-w-5xl">
        <Heading level={1} size="title">Community board</Heading>
        <Text tone="muted" className="mt-4">Find ways to help cats in your community.</Text>
        {state === 'loading' ? <div className="mt-12"><LoadingIndicator label="Loading community board" /></div> : null}
        {state === 'error' ? <Card className="mt-12"><EmptyState icon={<CircleAlert />} title="Could not load the community board" action={<Button variant="outline" onClick={retry}>Try again</Button>} /></Card> : null}
        {state === 'ready' ? <>
        <section className="mt-12" aria-labelledby="volunteer-openings-title">
          <Heading id="volunteer-openings-title" size="section">Volunteer openings</Heading>
          <div className="mt-6 grid gap-5 lg:grid-cols-3">
            {content?.openings.map((opening) => (
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
          {content?.openings.length === 0 ? <Card className="mt-6"><EmptyState icon={<Users />} title="No volunteer openings" /></Card> : null}
        </section>
        <section className="mt-14" aria-labelledby="community-news-title">
          <Heading id="community-news-title" size="section">Community news</Heading>
          <div className="mt-6 grid gap-5">
            {content?.news.map((post) => (
              <article key={post.id} aria-labelledby={`${post.id}-title`}>
                <Card>
                  <CardHeader className="gap-3">
                    <Text size="small" tone="muted"><time dateTime={post.date}>{dateFormat.format(new Date(`${post.date}T00:00:00Z`))}</time></Text>
                    <Heading level={3} size="card" id={`${post.id}-title`}>{post.title}</Heading>
                  </CardHeader>
                  <CardContent><Text size="small">{post.description}</Text></CardContent>
                </Card>
              </article>
            ))}
          </div>
          {content?.news.length === 0 ? <Card className="mt-6"><EmptyState icon={<Newspaper />} title="No community news" /></Card> : null}
        </section>
        </> : null}
      </div>
    </div>
  )
}
