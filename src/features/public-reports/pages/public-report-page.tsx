import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowLeft, Cat } from 'lucide-react'
import { Link } from 'react-router'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Heading, Text } from '@/components/ui/typography'

export function PublicReportPage() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const sending = useRef(false)
  const successHeading = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (submitted) successHeading.current?.focus()
  }, [submitted])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (sending.current) return
    const data = new FormData(event.currentTarget)
    sending.current = true
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/public-reports', {
        method: 'POST',
        credentials: 'omit',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location: data.get('location'), details: data.get('details'), urgent: data.get('urgent') === 'on' }),
      })
      const result = await response.json().catch(() => null) as { error?: string } | null
      if (!response.ok) throw new Error(result?.error ?? 'Could not send your report. Try again.')
      setSubmitted(true)
      window.scrollTo({ top: 0 })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not send your report. Try again.')
    } finally {
      sending.current = false
      setBusy(false)
    }
  }

  return (
    <div className="landing-width max-w-2xl py-10 sm:py-16">
      <title>Report a cat · Mews</title>
      {submitted ? (
        <div className="space-y-5">
          <Heading ref={successHeading} tabIndex={-1} level={1} size="title">Thank you for helping cats.</Heading>
          <Text tone="muted">Your report has been sent to the team for review.</Text>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button render={<Link to="/" />}><ArrowLeft aria-hidden="true" />Back to home</Button>
            <Button variant="outline" onClick={() => setSubmitted(false)}>Send another report</Button>
          </div>
        </div>
      ) : (
        <>
          <Heading level={1} size="title">Report a cat</Heading>
          <Text tone="muted" className="mt-4">Tell us where you saw a cat and what you noticed. You can report anonymously without an account or contact details.</Text>
          <Card className="mt-8">
            <CardContent>
              <form onSubmit={submit} className="space-y-6">
                <fieldset disabled={busy} className="min-w-0 space-y-6">
                  <div className="grid gap-2">
                    <Label htmlFor="public-report-location">Where did you see the cat?</Label>
                    <Input id="public-report-location" name="location" required maxLength={200} placeholder="Street, intersection, or nearby landmark" />
                    <Text size="caption" tone="muted">Give enough detail for the team to find the location.</Text>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="public-report-details">What did you notice?</Label>
                    <Textarea id="public-report-details" name="details" required maxLength={3700} placeholder="Describe the cat and what you saw." />
                  </div>
                  <div className="flex items-center gap-3">
                    <Checkbox id="public-report-urgent" name="urgent" />
                    <Label htmlFor="public-report-urgent">Needs urgent attention</Label>
                  </div>
                </fieldset>
                <Text size="small" tone="muted">Reports are not an emergency service. If a cat needs immediate help, contact a local animal emergency service.</Text>
                {error ? <Alert>{error}</Alert> : null}
                <Button type="submit" size="lg" loading={busy}>Send report <Cat aria-hidden="true" /></Button>
              </form>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
