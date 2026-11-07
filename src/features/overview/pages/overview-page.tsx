import { ClipboardList, PawPrint } from 'lucide-react'
import { useRouteLoaderData } from 'react-router'
import { CommunityCat } from '@/components/illustrations/community-cat'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Heading, Text } from '@/components/ui/typography'
import type { SessionUser } from '../../../../shared/types/auth'

export function OverviewPage() {
  const user = useRouteLoaderData('workspace') as SessionUser
  const firstName = user.name.trim().split(/\s+/)[0] || user.name
  return (
    <>
      <title>Overview · Mews</title>
      <section className="grid items-center gap-6 pb-8 sm:grid-cols-[minmax(0,1fr)_160px] xl:grid-cols-[minmax(0,1fr)_240px]" aria-labelledby="overview-title">
        <div className="min-w-0">
          <Text size="small" tone="muted" className="break-words">Hello, {firstName}.</Text>
          <Heading level={1} size="title" id="overview-title" className="mt-3">Your colony care.</Heading>
        </div>
        <CommunityCat className="w-full max-w-48 justify-self-end sm:max-w-none" />
      </section>
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader><Heading size="card" id="colonies-title">Your colonies</Heading></CardHeader>
          <CardContent><section aria-labelledby="colonies-title"><EmptyState title="No colonies yet" icon={<PawPrint aria-hidden="true" />} /></section></CardContent>
        </Card>
        <Card>
          <CardHeader><Heading size="card" id="visits-title">Recent visits</Heading></CardHeader>
          <CardContent><section aria-labelledby="visits-title"><EmptyState title="No visits to show" icon={<ClipboardList aria-hidden="true" />} /></section></CardContent>
        </Card>
      </div>
    </>
  )
}
