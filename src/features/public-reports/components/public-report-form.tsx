import { useEffect, useLayoutEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router'
import { Cat } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { AttachmentUpload } from '@/components/ui/attachment-upload'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { ContentSwap } from '@/components/ui/content-swap'
import { CurrentLocationButton } from '@/components/ui/current-location-button'
import { Disclosure } from '@/components/ui/disclosure'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { locationCoordinates, locationDraft, locationIsEmpty, LocationPicker } from '@/components/ui/location-picker'
import { Textarea } from '@/components/ui/textarea'
import { Heading, Text } from '@/components/ui/typography'
import { googleMapsEnabled } from '@/lib/google-maps'
import type { PublicReportInput, PublicReportMapLocation } from '../../../../shared/schemas/public-report'

export type ReportDraft = PublicReportInput

export function PublicReportForm({ initial, busy, error, onSubmit, attachments, onAttachmentsChange, contactFields, submitted = false, onStartAgain }: {
  initial: ReportDraft
  busy: boolean
  error: string
  onSubmit: (draft: ReportDraft) => void
  submitted?: boolean
  onStartAgain?: () => void
  attachments?: File[]
  onAttachmentsChange?: (files: File[]) => void
  contactFields?: ReactNode
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const successHeading = useRef<HTMLHeadingElement>(null)
  const [formHeight, setFormHeight] = useState(0)
  const [location, setLocation] = useState(initial.location)
  const [details, setDetails] = useState(initial.details)
  const [urgent, setUrgent] = useState(initial.urgent)
  const [map, setMap] = useState(() => initial.mapLocation?.type === 'pin'
    ? locationDraft([initial.mapLocation.longitude, initial.mapLocation.latitude]) : locationDraft())
  const [pickerVersion, setPickerVersion] = useState(0)
  const [mapOpened, setMapOpened] = useState(false)
  const [locating, setLocating] = useState(false)
  const [deviceLocating, setDeviceLocating] = useState(false)
  const [deviceAccuracy, setDeviceAccuracy] = useState<number | null>(null)
  const coordinates = locationCoordinates(map)
  const mapLocation: PublicReportMapLocation | undefined = map.googlePlaceId
    ? { type: 'google-place', placeId: map.googlePlaceId }
    : coordinates ? { type: 'pin', longitude: coordinates[0], latitude: coordinates[1] } : undefined
  const incompleteMap = !locationIsEmpty(map) && !mapLocation

  useLayoutEffect(() => {
    if (busy && formRef.current) setFormHeight(formRef.current.offsetHeight)
  }, [busy])

  useEffect(() => {
    if (submitted) {
      successHeading.current?.focus({ preventScroll: true })
      successHeading.current?.scrollIntoView({ block: 'nearest' })
    }
  }, [submitted])

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (incompleteMap || locating || deviceLocating || busy) return
    setFormHeight(formRef.current?.offsetHeight ?? 0)
    const locationText = location.trim() || (!map.googlePlaceId ? map.address.slice(0, 200) : '')
    onSubmit({ location: locationText, details, urgent, ...(mapLocation ? { mapLocation } : {}) })
  }

  const form = <form ref={formRef} onSubmit={submit} aria-busy={busy || undefined} className="space-y-6">
      <fieldset className="min-w-0 space-y-6">
        <div className="grid gap-2">
          <Label htmlFor="public-report-location">Where did you see the cat?</Label>
          <Input id="public-report-location" name="location" readOnly={busy || deviceLocating} required={!mapLocation} maxLength={200} value={location} onChange={(event) => {
            setLocation(event.target.value)
            if (deviceAccuracy !== null) { setMap(locationDraft()); setDeviceAccuracy(null); setPickerVersion((value) => value + 1) }
          }} placeholder="Street, intersection, or nearby landmark" />
          <Text size="caption" tone="muted">Enter a location or choose one on the map.</Text>
          <CurrentLocationButton disabled={busy || locating} onLocatingChange={setDeviceLocating} onSelect={(point) => {
            setMap(locationDraft([point.longitude, point.latitude]))
            setLocation('Current location')
            setDeviceAccuracy(point.accuracy ?? 0)
            setPickerVersion((value) => value + 1)
          }} />
          <Text size="caption" tone="muted" role={deviceAccuracy !== null ? 'status' : undefined}>{deviceAccuracy !== null
            ? `Current location added. Approximate accuracy: ${Math.max(1, Math.round(deviceAccuracy))} m. Check that this is where you saw the cat.`
            : 'Use your current location only if you are where you saw the cat.'}</Text>
        </div>
        <Disclosure title="Add a map location (optional)" onToggle={(event) => { if (event.currentTarget.open) setMapOpened(true) }}>
          {mapOpened ? <div className="space-y-3"><LocationPicker key={pickerVersion} value={map} onChange={(value) => { setMap(value); setDeviceAccuracy(null); if (location === 'Current location') setLocation('') }} initialCenter={[-80.1918, 25.7617]} googleMaps={googleMapsEnabled} disabled={busy || deviceLocating} onLocatingChange={setLocating} showCurrentLocation={false} />
            {!locationIsEmpty(map) || locating ? <Button type="button" variant="outline" size="sm" disabled={busy || deviceLocating} onClick={() => { setMap(locationDraft()); setDeviceAccuracy(null); if (location === 'Current location') setLocation(''); setLocating(false); setPickerVersion((value) => value + 1) }}>Clear map location</Button> : null}
          </div> : null}
        </Disclosure>
        <div className="grid gap-2">
          <Label htmlFor="public-report-details">What did you notice?</Label>
          <Textarea id="public-report-details" name="details" readOnly={busy} required maxLength={3700} value={details} onChange={(event) => setDetails(event.target.value)} placeholder="Describe the cat and what you saw." />
        </div>
        <div className="flex items-center gap-3"><Checkbox id="public-report-urgent" disabled={busy} checked={urgent} onCheckedChange={(checked) => setUrgent(checked === true)} /><Label htmlFor="public-report-urgent">Needs urgent attention</Label></div>
        {attachments && onAttachmentsChange ? <div className="space-y-3"><Heading level={2} size="compact">Photos and attachments (optional)</Heading><AttachmentUpload files={attachments} onChange={onAttachmentsChange} disabled={busy} /><Text size="caption" tone="muted">Photos, recordings, PDF, text, Word, or CSV files help the team understand what you saw.</Text></div> : null}
        {contactFields}
      </fieldset>
      <Text size="small" tone="muted">Reports are not an emergency service. If a cat needs immediate help, contact a local animal emergency service.</Text>
      <Button data-target="public-report-send" type="submit" size="lg" loading={busy} disabled={incompleteMap || locating || deviceLocating}>Send report <Cat aria-hidden="true" /></Button>
      {error ? <Alert>{error}</Alert> : null}
    </form>
  return <Card><CardContent><ContentSwap active={submitted ? 'success' : 'form'} panels={{ form, success: <div className="flex flex-col justify-center gap-5" style={{ minHeight: formHeight || 320 }}>
    <Heading ref={successHeading} focusTarget level={2} size="card">Thank you for helping cats.</Heading>
    <Text tone="muted">Your report has been sent to the team for review.</Text>
    <div className="flex flex-wrap gap-3"><Button render={<Link to="/" />}>Back to home</Button>{onStartAgain ? <Button variant="outline" onClick={onStartAgain}>Send another report</Button> : null}</div>
  </div> }} /></CardContent></Card>
}
