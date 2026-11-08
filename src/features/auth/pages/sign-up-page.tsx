import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authRequest } from '../auth'
import { Heading, Text } from '@/components/ui/typography'
import { TextLink } from '@/components/ui/text-link'
import { Alert } from '@/components/ui/alert'

export function SignUpPage() {
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setBusy(true)
    setError('')
    try {
      await authRequest('/api/auth/local/sign-up', {
        method: 'POST',
        body: JSON.stringify({ name: data.get('name'), email: data.get('email'), phone: data.get('phone') }),
      })
      await navigate('/account-status', { replace: true })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not create this account. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-lg px-6 py-12 sm:py-16">
      <title>Request access · Mews</title>
      <Heading level={1} size="title">Request access</Heading>
      <Text size="small" tone="muted" className="mt-3">Join your rescue team. An administrator will review your request.</Text>
      <form onSubmit={submit} className="mt-8 space-y-6">
        <div className="space-y-2">
          <Label htmlFor="signup-name">Name</Label>
          <Input id="signup-name" name="name" autoComplete="name" required maxLength={120} disabled={busy} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="signup-email">Email</Label>
          <Input id="signup-email" name="email" type="email" autoComplete="email" required maxLength={254} disabled={busy} aria-describedby="email-help" />
          <Text id="email-help" size="small" tone="muted">Use the email address you share with your team.</Text>
        </div>
        <div className="space-y-2">
          <Label htmlFor="signup-phone">Phone (optional)</Label>
          <Input id="signup-phone" name="phone" type="tel" autoComplete="tel" maxLength={40} disabled={busy} aria-describedby="phone-help" />
          <Text id="phone-help" size="small" tone="muted">For coordinating care visits. You can leave this blank.</Text>
        </div>
        {error ? <Alert>{error}</Alert> : null}
        <Button type="submit" size="lg" loading={busy} className="w-full">Request access</Button>
      </form>
      <TextLink className="mt-6" render={<Link to="/sign-in" />}>Back to sign in</TextLink>
    </div>
  )
}
