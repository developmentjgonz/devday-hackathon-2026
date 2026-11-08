import { ColonyMap } from '@/components/ui/colony-map'
import { Heading } from '@/components/ui/typography'
import type { PublicContent } from '../../../../shared/types/public'
import { usePublicContent } from '../public-content'

export function CommunityTracker({ initialContent }: { initialContent?: PublicContent }) {
  const { content, state, retry } = usePublicContent(initialContent)
  return (
    <section id="tracker" className="landing-tracker landing-width" aria-labelledby="tracker-title">
      <Heading size="title" id="tracker-title" className="mb-7">Around the neighborhood.</Heading>
      <ColonyMap data={{ audience: 'public', areas: content?.areas ?? [] }} state={state} onRetry={retry} title="Colony activity" />
    </section>
  )
}
