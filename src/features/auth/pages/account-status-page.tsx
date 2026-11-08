import { Clock3, LockKeyhole } from 'lucide-react'
import { useLoaderData, useRevalidator } from 'react-router'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Heading, Text } from '@/components/ui/typography'
import type { SessionUser } from '../../../../shared/types/auth'
import { SignOutButton } from '../components/sign-out-button'

export function AccountStatusPage() {
  const user = useLoaderData() as SessionUser
  const revalidator = useRevalidator()
  const pending = user.status === 'pending'
  const title = pending ? 'Waiting for approval' : 'Access suspended'
  const Icon = pending ? Clock3 : LockKeyhole

  return (
    <div className="mx-auto w-full max-w-lg px-6 py-16 sm:py-24">
      <title>{`${title} · Mews`}</title>
      <Badge variant={pending ? 'warning' : 'destructive'}><Icon aria-hidden="true" />{pending ? 'Pending approval' : 'Suspended'}</Badge>
      <Heading level={1} size="title" className="mt-6">{title}</Heading>
      <Text size="small" tone="muted" className="mt-4">
        {pending
          ? 'Your account is waiting for administrator approval. Once approved, you can join your team in the workspace.'
          : 'You cannot enter the workspace with this account. Contact your rescue administrator for help.'}
      </Text>
      <Card className="mt-8"><CardContent>
        <Heading size="card" className="break-words">{user.name}</Heading>
        <Text size="small" tone="muted" className="mt-1 break-all">{user.email}</Text>
      </CardContent></Card>
      <div className="mt-6 flex flex-wrap items-start justify-between gap-3">
        <Button variant="outline" loading={revalidator.state === 'loading'} onClick={() => revalidator.revalidate()}>Check access</Button>
        <SignOutButton />
      </div>
    </div>
  )
}
