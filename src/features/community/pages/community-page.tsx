import { CircleAlert } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Heading, Text } from '@/components/ui/typography'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { LoadingIndicator } from '@/components/ui/loading-indicator'
import { usePublicContent } from '@/features/landing/public-content'
import { CommunityBoard } from '../components/community-board'
import type { PublicContent } from '../../../../shared/types/public'

export function CommunityPage({ initialContent }: { initialContent?: PublicContent } = {}) {
  const { content, state, retry } = usePublicContent(initialContent)
  return <div className="landing-width py-12 sm:py-16">
    <title>Community board · Mews</title>
    <div className="mx-auto max-w-5xl">
      <Heading level={1} size="title">Community board</Heading>
      <Text tone="muted" className="mt-4">Find ways to help cats in your community.</Text>
      <div className="mt-12">
        {state === 'loading' ? <LoadingIndicator label="Loading community board" /> : null}
        {state === 'error' ? <Card><EmptyState icon={<CircleAlert />} title="Could not load the community board" action={<Button variant="outline" onClick={retry}>Try again</Button>} /></Card> : null}
        {state === 'ready' && content ? <CommunityBoard board={content.board} /> : null}
      </div>
    </div>
  </div>
}
