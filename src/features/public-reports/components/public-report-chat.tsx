import { useEffect, useLayoutEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router'
import { Brand } from '@/components/brand'
import { CatMark } from '@/components/brand-assets'
import { Alert } from '@/components/ui/alert'
import { AttachmentUpload } from '@/components/ui/attachment-upload'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardList } from '@/components/ui/card'
import { ChatComposer } from '@/components/ui/chat-composer'
import { CurrentLocationButton } from '@/components/ui/current-location-button'
import { LoadingIndicator } from '@/components/ui/loading-indicator'
import { RecordListItem } from '@/components/ui/record-list'
import { TextLink } from '@/components/ui/text-link'
import { Heading, Text } from '@/components/ui/typography'
import type { ChatCoordinates, ChatLocation, ChatPlace, PublicChatDraft, PublicChatMessage } from '../../../../shared/schemas/public-report-chat'
import type { ReportDraft } from './public-report-form'

const greeting = 'Hi, I’m Mews. Tell me what you noticed about the cats. If you’re still where you saw them, share your current location below. Otherwise, tell me the city and a nearby landmark.'
type Phase = 'collecting' | 'confirming' | 'correcting' | 'filed'

function normalizedAnswer(text: string) {
  return text.toLowerCase().replace(/[.!?,'’]/g, '').trim().replace(/\s+/g, ' ')
}
function isYes(text: string) {
  return /^(yes|yeah|yep|yup|correct|thats right|that is right|right|looks good|send it|send report|send the report|please send it|please send the report|yes send it|yes send report|yes please|yes thats right|ok send it|okay send it)$/.test(normalizedAnswer(text))
}
function isNo(text: string) {
  return /^(no|nope|no thanks|not quite|thats not right|that is not right|change details)$/.test(normalizedAnswer(text))
}
export function PublicReportChat({ busy, error, attachments, onAttachmentsChange, contactFields, onSubmit, onUseForm }: {
  busy: boolean
  error: string
  attachments: File[]
  onAttachmentsChange: (files: File[]) => void
  contactFields?: ReactNode
  onSubmit: (draft: ReportDraft, messages: PublicChatMessage[]) => Promise<boolean>
  onUseForm: (messages: PublicChatMessage[], draft?: ReportDraft) => void
}) {
  const [messages, setMessages] = useState<PublicChatMessage[]>([])
  const [message, setMessage] = useState('')
  const [draft, setDraft] = useState<PublicChatDraft | null>(null)
  const [phase, setPhase] = useState<Phase>('collecting')
  const [sending, setSending] = useState(false)
  const [places, setPlaces] = useState<{ index: number; locations: ChatPlace[]; source?: 'search' | 'device' } | null>(null)
  const [selectedLocation, setSelectedLocation] = useState<ChatLocation | null>(null)
  const [locating, setLocating] = useState(false)
  const [chatError, setChatError] = useState('')
  const [reviewedAttachments, setReviewedAttachments] = useState<File[]>([])
  const [skippedAttachments, setSkippedAttachments] = useState<NonNullable<PublicChatDraft['skippedAttachments']>>([])
  const [filedAttachmentCount, setFiledAttachmentCount] = useState(0)
  const inFlight = useRef(false)
  const viewport = useRef<HTMLDivElement>(null)
  const follow = useRef(true)
  const previousScrollTop = useRef(0)
  const limitReached = messages.filter((item) => item.role === 'user').length >= 8
  const lastAssistantIndex = messages.findLastIndex((item) => item.role === 'assistant') + 1
  const attachmentsChanged = attachments.length !== reviewedAttachments.length || attachments.some((file, index) => file !== reviewedAttachments[index])
  const attachmentCount = phase === 'filed' ? filedAttachmentCount : attachments.length

  useLayoutEffect(() => {
    if (follow.current && viewport.current) viewport.current.scrollTop = viewport.current.scrollHeight
  }, [messages, sending, places, chatError, error, attachments.length])

  useEffect(() => {
    const container = viewport.current
    const content = container?.firstElementChild
    if (!container || !content || !window.ResizeObserver) return
    const observer = new ResizeObserver(() => {
      if (follow.current) container.scrollTop = container.scrollHeight
    })
    observer.observe(content)
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  async function sendText(text: string, selection?: ChatLocation | null, currentLocation?: ChatCoordinates) {
    text = text.trim()
    if (!text && attachmentsChanged) text = 'I updated the attachments. Please use the current files to help prepare my cat report.'
    if (!text || text.length > 300 || inFlight.current || phase === 'filed') return
    const next: PublicChatMessage[] = [...messages, { role: 'user', text }]
    const addReply = (reply: string) => setMessages([...next, { role: 'assistant', text: reply }])
    follow.current = true
    setMessage('')
    setPlaces(null)
    setChatError('')

    if (!currentLocation && !selection && phase === 'confirming' && draft && isNo(text)) {
      addReply('Of course. What would you like me to change before we send it?')
      setPhase('correcting')
      return
    }
    if (!currentLocation && !selection && phase === 'confirming' && draft && isYes(text) && !attachmentsChanged) {
      inFlight.current = true
      setMessages(next)
      try {
        if (await onSubmit(draft, next)) {
          setFiledAttachmentCount(attachments.length)
          addReply('Your report has been sent to the care team for review. Thank you for looking out for the cats. If they need immediate help, please contact a local animal emergency service.')
          setPhase('filed')
        } else {
          setMessages(messages)
          setMessage('')
        }
      } finally {
        inFlight.current = false
      }
      return
    }
    if (limitReached) {
      setPlaces(places)
      setMessage(text)
      setChatError('The conversation is full. Use the report form to finish your report.')
      return
    }

    inFlight.current = true
    if (selection !== undefined) setSelectedLocation(selection)
    setMessages(next)
    setSending(true)
    try {
      const data = JSON.stringify({ messages: next,
        ...(currentLocation ? { currentLocation } : selection === null ? {} : selection || selectedLocation ? { selectedLocation: selection ?? selectedLocation } : {}),
      })
      const form = new FormData()
      form.set('data', data)
      attachments.forEach((file) => form.append('files', file))
      const response = await fetch('/api/public-reports/chat', {
        method: 'POST', credentials: 'omit', ...(!attachments.length ? { headers: { 'Content-Type': 'application/json' } } : {}), body: attachments.length ? form : data,
      })
      const result = await response.json().catch(() => null) as (PublicChatDraft & { error?: string }) | null
      if (!response.ok || !result) throw new Error(result?.error ?? 'The assistant is unavailable. Try again or use the report form.')
      setReviewedAttachments(attachments)
      setSkippedAttachments(result.skippedAttachments ?? [])
      if (currentLocation) setSelectedLocation(null)
      if (result.locations?.length) setPlaces({ index: next.length, locations: result.locations, source: result.locationSource })
      if (result.ready) {
        setDraft(result)
        if (!result.mapLocation) setSelectedLocation(null)
        addReply(result.reply)
        setPhase('confirming')
      } else {
        setDraft(null)
        addReply(result.reply)
        if (phase !== 'collecting') setPhase('correcting')
      }
    } catch (cause) {
      setMessages(messages)
      setPlaces(places)
      setMessage(text)
      setChatError(cause instanceof Error ? cause.message : 'The assistant is unavailable. Try again or use the report form.')
    } finally {
      inFlight.current = false
      setSending(false)
    }
  }

  function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void sendText(message)
  }
  function useForm() {
    const pending = message.trim()
    const conversation = pending ? [...messages, { role: 'user' as const, text: pending }] : messages
    onUseForm(conversation, draft ? { location: draft.location, details: `${draft.details}${pending ? `\n\n${pending}` : ''}`, urgent: draft.urgent, ...(draft.mapLocation ? { mapLocation: draft.mapLocation } : {}) }
      : selectedLocation ? { location: selectedLocation.label, details: conversation.filter((item) => item.role === 'user').map((item) => item.text).join('\n\n').slice(0, 3700), urgent: false,
        mapLocation: { type: 'pin', latitude: selectedLocation.latitude, longitude: selectedLocation.longitude } } : undefined)
  }
  function startAgain() {
    follow.current = true
    onAttachmentsChange([])
    setReviewedAttachments([]); setSkippedAttachments([]); setFiledAttachmentCount(0)
    setMessages([]); setMessage(''); setDraft(null); setPhase('collecting'); setChatError(''); setPlaces(null); setSelectedLocation(null)
  }

  return <div className="flex h-dvh min-h-0 flex-col">
    <header className="flex shrink-0 items-center justify-between gap-3 px-5 py-4 sm:px-8">
      <Brand to="/" />
      <Heading level={1} size="compact" className="sr-only">Chat with Mews</Heading>
      {phase !== 'filed' ? <Button type="button" variant="ghost" size="sm" disabled={sending || busy || locating} onClick={useForm}>Use the report form instead</Button> : null}
    </header>
    <div ref={viewport} role="region" aria-label="Conversation" tabIndex={0} onFocusCapture={(event) => { if (event.target instanceof HTMLInputElement) follow.current = true }} onScroll={(event) => {
      const element = event.currentTarget
      if (element.scrollTop < previousScrollTop.current) follow.current = false
      else if (element.scrollHeight - element.scrollTop - element.clientHeight < 48) follow.current = true
      previousScrollTop.current = element.scrollTop
    }} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
      <ol aria-live="polite" className="mx-auto flex min-h-full w-full max-w-3xl flex-col justify-end gap-6 px-5 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-8">
        {[{ role: 'assistant' as const, text: greeting }, ...messages].map((item, index) => <li key={index}>
          {item.role === 'assistant' ? <div className="flex items-start gap-3">
            <CatMark alt="" />
            <div className="min-w-0 flex-1 space-y-1"><Text size="caption" weight="semibold">Mews assistant</Text><Text className="whitespace-pre-wrap wrap-anywhere">{item.text}</Text>
              {(phase === 'confirming' || phase === 'filed') && draft && index === lastAssistantIndex ? <Card size="sm" className="mt-4"><CardContent className="space-y-4">
                <Heading level={2} size="compact">Your report</Heading>
                <div className="space-y-1"><Text size="caption" weight="semibold">Location</Text><Text size="small" className="wrap-anywhere">{draft.location}</Text></div>
                <div className="space-y-1"><Text size="caption" weight="semibold">What you noticed</Text><Text size="small" className="whitespace-pre-wrap wrap-anywhere">{draft.details}</Text></div>
                {draft.urgent ? <Text size="small" weight="semibold">Needs urgent attention</Text> : null}
                {attachmentCount ? <Text size="small">{attachmentCount} {attachmentCount === 1 ? 'attachment' : 'attachments'} {phase === 'filed' ? 'sent' : 'will be sent'} with your report.</Text> : null}
                {phase === 'confirming' ? <>
                  {contactFields}
                  <Text size="caption" tone="muted">Check the details. You can add more information or files before sending.</Text>
                  {message.trim() ? <Text size="caption" tone="muted">Send your new message to update the report before confirming.</Text> : null}
                  <div className="flex flex-wrap gap-2"><Button type="button" size="sm" loading={busy} disabled={sending || Boolean(message.trim())} onClick={() => void sendText(attachmentsChanged ? 'I updated the attachments. Please review the report using the current files.' : 'Yes, send it.')}>{attachmentsChanged ? 'Review attachments' : 'Yes, send report'}</Button><Button type="button" variant="outline" size="sm" disabled={sending || busy || Boolean(message.trim())} onClick={() => void sendText('No.')}>Change details</Button></div>
                </> : null}
              </CardContent>
                {phase === 'filed' ? <CardFooter className="flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                  <Button render={<Link to="/" />}>Back to home</Button>
                  <Button type="button" variant="ghost" onClick={startAgain}>Start another report</Button>
                </CardFooter> : null}
              </Card> : null}
              {places?.index === index - 1 ? <div className="max-w-lg space-y-3 pt-4">
                <Card padding="none"><CardList aria-label="Suggested locations">{places.locations.map((place) => <li key={`${place.latitude}:${place.longitude}:${place.label}`}>
                  <RecordListItem title={place.title} description={place.description} disabled={sending || busy || locating || Boolean(message.trim())}
                    aria-label={`Use location: ${place.label}`} onClick={() => void sendText(`The cats were here: ${place.label}`, { label: place.label, latitude: place.latitude, longitude: place.longitude })} />
                </li>)}</CardList></Card>
                <Button type="button" variant="link" size="sm" disabled={sending || busy || locating || Boolean(message.trim())} onClick={() => void sendText(places.source === 'device' ? 'The cats were somewhere else, not at my current location.' : 'None of these places is correct.', null)}>{places.source === 'device' ? 'The cats were somewhere else' : 'None of these places'}</Button>
                <Text size="caption" tone="muted">Address lookup: <TextLink size="sm" href="https://photon.komoot.io/" target="_blank" rel="noreferrer">Photon</TextLink> · <TextLink size="sm" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</TextLink></Text>
              </div> : null}
            </div>
          </div> : <div className="flex justify-end"><Card size="sm" tone="message" className="max-w-[85%]"><CardContent><Text size="small" className="whitespace-pre-wrap wrap-anywhere"><Text render={<span />} className="sr-only">You: </Text>{item.text}</Text></CardContent></Card></div>}
        </li>)}
        {sending || busy ? <li className="flex items-start gap-3"><CatMark alt="" /><div className="space-y-1"><Text size="caption" weight="semibold">Mews assistant</Text><div className="flex items-center gap-3"><LoadingIndicator size="sm" decorative /><Text role="status" size="caption" tone="muted">{busy ? 'Sending your report…' : 'Mews is replying…'}</Text></div></div></li> : null}
        {chatError || error ? <li><Alert>{chatError || error}</Alert></li> : null}
      </ol>
    </div>
    {phase !== 'filed' ? <div className="mx-auto w-full max-w-3xl shrink-0 space-y-3 px-5 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-8">
        <CurrentLocationButton disabled={sending || busy || limitReached} onLocatingChange={setLocating} onSelect={(point) => void sendText(message.trim() || 'I’m sharing my current location to help find the cats.', undefined, point)} />
        <ChatComposer value={message} onChange={setMessage} onSubmit={send} loading={sending} readOnly={busy || locating} allowEmpty={attachmentsChanged} maxLength={300} actions={<AttachmentUpload files={attachments} onChange={onAttachmentsChange} disabled={sending || busy || locating} compact />} />
        {attachments.length ? <Text size="caption" tone="muted">Mews uses supported files when you send a message. All files go to the care team with your report.</Text> : null}
        {skippedAttachments.filter((item) => attachments.some((file) => file.name === item.name)).map((item, index) => <Text key={index} role="status" size="caption" tone="muted" className="wrap-anywhere">{item.name}: {item.reason} The file can still be sent to the care team.</Text>)}
    </div> : null}
  </div>
}
