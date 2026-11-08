import { ArrowRight, ShieldCheck, UserRound } from 'lucide-react'
import { Link } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { Heading, Text } from '@/components/ui/typography'
import type { SignInOptions } from '../../../../shared/types/auth'

export type SignInScreenProps = SignInOptions & {
  selected: string | null
  error: string
  onSignIn: (userId: string) => void
}

const statusLabels = { active: 'Approved', pending: 'Pending approval', suspended: 'Suspended' }

export function SignInScreen({ localSignInEnabled, users, selected, error, onSignIn }: SignInScreenProps) {
  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-12 sm:py-16">
      <title>Sign in · Mews</title>
      <Heading level={1} size="title">Sign in to Mews</Heading>
      <Text size="small" tone="muted" className="mt-3 max-w-lg">
        {localSignInEnabled
          ? 'Choose your account to continue.'
          : 'Contact your rescue administrator for account access.'}
      </Text>
      {error ? <div className="mt-6"><Alert>{error}</Alert></div> : null}
      {localSignInEnabled ? (
        <>
          <ul className="mt-8 space-y-3" aria-label="Accounts">
            {users.map((user) => {
              const Icon = user.role === 'administrator' ? ShieldCheck : UserRound
              return (
                <li key={user.id}>
                  <Card><CardContent className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <Icon className="mt-1 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <div className="min-w-0">
                      <Heading level={2} size="card" className="break-words">{user.name}</Heading>
                      <Text size="small" tone="muted" className="mt-1 break-all">{user.email}</Text>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge variant="outline">{user.role === 'administrator' ? 'Administrator' : 'Member'}</Badge>
                        <Badge variant={user.status === 'active' ? 'secondary' : 'outline'}>{statusLabels[user.status]}</Badge>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" disabled={selected !== null} loading={selected === user.id} onClick={() => onSignIn(user.id)} aria-label={`Sign in as ${user.name}`}>
                    Sign in <ArrowRight aria-hidden="true" />
                  </Button>
                  </CardContent></Card>
                </li>
              )
            })}
          </ul>
          <div className="mt-8 border-t pt-6">
            <Heading size="card">New to Mews?</Heading>
            <Text size="small" tone="muted" className="mt-2">Request access to join your rescue team.</Text>
            <Button className="mt-4" render={<Link to="/sign-up" />}>Request access <ArrowRight aria-hidden="true" /></Button>
          </div>
        </>
      ) : null}
    </div>
  )
}
