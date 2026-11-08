import type { ReactNode } from 'react'
import { Newspaper } from 'lucide-react'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Heading, Text } from '@/components/ui/typography'
import type { CommunityBoard as Board, CommunityPost, CommunitySection } from '../../../../shared/types/public'

const dateFormat = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })

/** The public board and administrator use the same section and post presentation. */
export function CommunityBoard({ board, renderSectionActions, renderPostActions, emptyTitle = 'No posts yet' }: {
  board: Board
  renderSectionActions?: (section: CommunitySection) => ReactNode
  renderPostActions?: (post: CommunityPost) => ReactNode
  emptyTitle?: string
}) {
  return <div className="space-y-14">
    {board.sections.map((section) => {
      const posts = board.posts.filter((post) => post.sectionId === section.id)
      return <section key={section.id} aria-labelledby={`section-${section.id}`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Heading id={`section-${section.id}`} size="section" className="min-w-0 wrap-anywhere">{section.title}</Heading>
          {renderSectionActions?.(section)}
        </div>
        {posts.length ? <div className={section.layout === 'cards' ? 'mt-6 grid gap-5 lg:grid-cols-3' : 'mt-6 grid gap-5'}>
          {posts.map((post) => <article key={post.id} aria-labelledby={`post-${post.id}`} className="flex min-w-0">
            <Card className="w-full">
              <CardHeader className="gap-3">
                {post.area ? <Text size="small" tone="muted" className="wrap-anywhere">{post.area}</Text> : null}
                {post.date ? <Text size="small" tone="muted"><time dateTime={post.date}>{dateFormat.format(new Date(`${post.date}T00:00:00Z`))}</time></Text> : null}
                <Heading level={3} size="card" id={`post-${post.id}`} className="wrap-anywhere">{post.title}</Heading>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-5">
                <Text size="small" className="whitespace-pre-wrap wrap-anywhere">{post.description}</Text>
                {post.schedule ? <Text size="small" tone="muted" className="mt-auto wrap-anywhere">{post.schedule}</Text> : null}
              </CardContent>
              {renderPostActions ? <CardFooter className="flex-wrap justify-end gap-2">{renderPostActions(post)}</CardFooter> : null}
            </Card>
          </article>)}
        </div> : <Card className="mt-6"><EmptyState icon={<Newspaper />} title={emptyTitle} /></Card>}
      </section>
    })}
    {!board.sections.length ? <Card><EmptyState icon={<Newspaper />} title="No sections yet" /></Card> : null}
  </div>
}
