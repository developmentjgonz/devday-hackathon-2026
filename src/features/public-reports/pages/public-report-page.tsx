import { useEffect, useRef, useState } from 'react'
import { CircleAlert } from 'lucide-react'
import { Link } from 'react-router'
import { Brand } from '@/components/brand'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { LoadingIndicator } from '@/components/ui/loading-indicator'
import { TextLink } from '@/components/ui/text-link'
import { Heading, Text } from '@/components/ui/typography'
import type { PublicChatMessage } from '../../../../shared/schemas/public-report-chat'
import { publicReportContactSchema } from '../../../../shared/schemas/public-report'
import { PublicReportChat } from '../components/public-report-chat'
import { PublicReportForm, type ReportDraft } from '../components/public-report-form'
import { emptyReportContact, ReportContactFields } from '../components/report-contact-fields'

type PublicOptions = { phone: string | null; email: string | null; chatAvailable: boolean }
const emptyDraft: ReportDraft = { location: '', details: '', urgent: false }

export function PublicReportPage({ preferChat = false }: { preferChat?: boolean }) {
  const [busy, setBusy] = useState(false)
  const [attachments, setAttachments] = useState<File[]>([])
  const [error, setError] = useState('')
  const [contact, setContact] = useState(emptyReportContact)
  const [contactError, setContactError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [mode, setMode] = useState<'chat' | 'form' | null>(null)
  const [formInitial, setFormInitial] = useState<ReportDraft>(emptyDraft)
  const [contacts, setContacts] = useState<PublicOptions | null>(null)
  const [contactsError, setContactsError] = useState(false)
  const [contactsLoading, setContactsLoading] = useState(false)
  const [contactsRetry, setContactsRetry] = useState(0)
  const sending = useRef(false)
  const submissionKey = useRef(crypto.randomUUID())
  const [formVersion, setFormVersion] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setContactsLoading(true)
    fetch('/api/public-reports/contact', { credentials: 'omit', signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('Report options are unavailable.')
        return response.json() as Promise<PublicOptions>
      })
      .then((result) => {
        if (controller.signal.aborted) return
        setContacts(result)
        setContactsError(false)
        setMode((current) => current ?? (preferChat && result.chatAvailable ? 'chat' : 'form'))
      })
      .catch(() => { if (!controller.signal.aborted) { setContactsError(true); setMode((current) => current ?? 'form') } })
      .finally(() => { if (!controller.signal.aborted) setContactsLoading(false) })
    return () => controller.abort()
  }, [contactsRetry, preferChat])

  async function submit(draft: ReportDraft, messages: PublicChatMessage[] = []): Promise<boolean> {
    if (sending.current) return false
    const parsedContact = contact.consent ? publicReportContactSchema.safeParse({
      consent: true,
      ...(contact.phone.trim() ? { phone: contact.phone.trim() } : {}),
      ...(contact.email.trim() ? { email: contact.email.trim() } : {}),
    }) : null
    if (parsedContact && !parsedContact.success) {
      setContactError(parsedContact.error.issues[0]?.message ?? 'Check your contact details.')
      return false
    }
    setContactError('')
    const details = draft.details.trim()
    sending.current = true
    setBusy(true)
    setError('')
    try {
      const data = JSON.stringify({ location: draft.location, details, urgent: draft.urgent, ...(draft.mapLocation ? { mapLocation: draft.mapLocation } : {}), ...(parsedContact?.success ? { contact: parsedContact.data } : {}) })
      const form = new FormData()
      form.set('data', data)
      attachments.forEach((file) => form.append('files', file))
      const response = await fetch('/api/public-reports', {
        method: 'POST', credentials: 'omit', headers: { 'Idempotency-Key': submissionKey.current, ...(!attachments.length ? { 'Content-Type': 'application/json' } : {}) },
        body: attachments.length ? form : data,
      })
      const result = await response.json().catch(() => null) as { error?: string } | null
      if (!response.ok) throw new Error(result?.error ?? 'Could not send your report. Try again.')
      submissionKey.current = crypto.randomUUID()
      setAttachments([])
      setContact(emptyReportContact)
      if (!messages.length) setSubmitted(true)
      return true
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not send your report. Try again.')
      return false
    } finally {
      sending.current = false
      setBusy(false)
    }
  }

  function useForm(messages: PublicChatMessage[], draft?: ReportDraft) {
    setFormInitial(draft ?? { ...emptyDraft, details: messages.filter((item) => item.role === 'user').map((item) => item.text).join('\n\n').slice(0, 3700) })
    setMode('form')
  }

  function startAgain() {
    setAttachments([])
    setContact(emptyReportContact)
    setContactError('')
    setFormInitial(emptyDraft)
    setError('')
    setMode(preferChat && contacts?.chatAvailable ? 'chat' : 'form')
    setSubmitted(false)
    setFormVersion((value) => value + 1)
  }

  const contactFields = <ReportContactFields value={contact} onChange={(value) => { setContact(value); setContactError('') }} disabled={busy} error={contactError} />

  if (preferChat && !submitted && mode === null) return <div className="flex h-full items-center justify-center"><LoadingIndicator label="Loading report options" /></div>
  if (preferChat && !submitted && mode === 'chat') return <><title>Chat with Mews</title><PublicReportChat busy={busy} error={error} attachments={attachments} onAttachmentsChange={setAttachments} contactFields={contactFields} onSubmit={submit} onUseForm={useForm} /></>

  return <div className="landing-width max-w-2xl py-6 sm:py-10">
    <title>Tell us about a cat · Mews</title>
    {preferChat ? <div className="mb-8"><Brand to="/" /></div> : null}
    <>
      <Heading level={1} size="title">Tell us about a cat</Heading>
      <Text tone="muted" className="mt-2">Share a sighting or concern without an account. You can leave contact details for follow-up or send anonymously.</Text>
      {mode === 'form' && !preferChat && contacts?.chatAvailable ? <TextLink render={<Link to="/report/chat" />}>Chat with Mews instead</TextLink> : null}
      <div className="mt-4">
        {mode === null ? <div className="flex min-h-48 items-center justify-center"><LoadingIndicator label="Loading report options" /></div>
          : mode === 'chat' ? <PublicReportChat busy={busy} error={error} attachments={attachments} onAttachmentsChange={setAttachments} contactFields={contactFields} onSubmit={submit} onUseForm={useForm} />
            : <PublicReportForm key={formVersion} initial={formInitial} busy={busy} error={error} attachments={attachments} onAttachmentsChange={setAttachments} contactFields={contactFields} submitted={submitted} onStartAgain={startAgain} onSubmit={(draft) => void submit(draft)} />}
      </div>
      {contactsError ? <Card className="mt-6"><EmptyState icon={<CircleAlert />} title="Contact options unavailable" description="Try again to see other ways to contact the team." action={<Button variant="outline" loading={contactsLoading} onClick={() => setContactsRetry((value) => value + 1)}>Try again</Button>} /></Card>
        : contacts?.phone || contacts?.email ? <Card className="mt-6"><CardContent className="space-y-4">
          <div className="space-y-1"><Heading level={2} size="compact">Other ways to contact the team</Heading><Text size="small" tone="muted">These options contact the team directly.</Text></div>
          {contacts.phone ? <div><Text size="small" weight="semibold">Phone</Text><TextLink render={<a href={`tel:${contacts.phone.replace(/[^\d+]/g, '')}`} />}>{contacts.phone}</TextLink></div> : null}
          {contacts.email ? <div><Text size="small" weight="semibold">Email</Text><TextLink render={<a href={`mailto:${encodeURIComponent(contacts.email)}`} />}>{contacts.email}</TextLink></div> : null}
        </CardContent></Card> : null}
    </>
  </div>
}
