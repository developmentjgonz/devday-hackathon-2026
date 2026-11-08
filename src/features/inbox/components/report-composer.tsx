import { createContext, useCallback, useContext, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Paperclip, Plus } from 'lucide-react'
import { useNavigate } from 'react-router'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Drawer, DrawerBody, DrawerContent, DrawerFooter, DrawerHeader } from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SelectField } from '@/components/ui/select-field'
import { Textarea } from '@/components/ui/textarea'
import { Text } from '@/components/ui/typography'
import { useInbox } from '../inbox-context'
import type { ReportAttachment } from '../types'
import { ReportAttachments } from './report-attachments'

type ReportDefaults = { colonyId?: string; catId?: string }
const ReportComposerContext = createContext<{
  openComposer: (trigger?: HTMLElement, defaults?: ReportDefaults) => void
  submittedReportId: string | null
  clearSubmittedReport: (id: string) => void
} | null>(null)

export function useReportComposer() {
  const context = useContext(ReportComposerContext)
  if (!context) throw new Error('Report creation needs a ReportComposerProvider.')
  return context
}

export function NewReportButton({ colonyId, catId }: ReportDefaults = {}) {
  const { openComposer } = useReportComposer()
  return <Button size="sm" onClick={(event) => openComposer(event.currentTarget, { colonyId, catId })}><Plus aria-hidden="true" />New report</Button>
}

/** A single composer serves page-level triggers throughout the workspace. */
export function ReportComposerProvider({ children }: { children: ReactNode }) {
  const { data, createReport, createAttachment, discardAttachment } = useInbox()
  const navigate = useNavigate()
  const [reportOpen, setReportOpen] = useState(false)
  const [submittedReportId, setSubmittedReportId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [colonyId, setColonyId] = useState('')
  const [catId, setCatId] = useState('')
  const [urgent, setUrgent] = useState(false)
  const [attachments, setAttachments] = useState<ReportAttachment[]>([])
  const [fileError, setFileError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const triggerRef = useRef<HTMLElement | null>(null)
  const submitted = useRef(false)
  const clearSubmittedReport = useCallback((id: string) => {
    setSubmittedReportId((current) => current === id ? null : current)
  }, [])

  function openComposer(trigger?: HTMLElement, defaults: ReportDefaults = {}) {
    triggerRef.current = trigger ?? null
    submitted.current = false
    setSubmittedReportId(null)
    const cat = data.cats.find((item) => item.id === defaults.catId)
    const requestedColony = defaults.colonyId ?? cat?.colonyId ?? ''
    const selectedColony = data.colonies.some((colony) => colony.id === requestedColony) ? requestedColony : ''
    setTitle(''); setMessage(''); setColonyId(selectedColony); setCatId(cat?.colonyId === selectedColony ? cat.id : ''); setUrgent(false); setFileError(''); setSaveError(''); setReportOpen(true)
  }
  function closeComposer() {
    attachments.forEach(discardAttachment)
    setAttachments([])
    setFileError('')
    setReportOpen(false)
  }
  function addFiles(files: File[]) {
    if (attachments.length + files.length > 5) { setFileError('Add up to 5 attachments.'); return }
    if (files.some((file) => file.size > 10 * 1024 * 1024)) { setFileError('Each attachment must be 10 MB or smaller.'); return }
    const images = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif'])
    if (files.some((file) => !images.has(file.type) && !file.type.startsWith('audio/') && !/\.(pdf|txt|docx|csv)$/i.test(file.name))) { setFileError('Choose supported photos, audio recordings, PDF, text, Word, or CSV files.'); return }
    setFileError('')
    const added = files.map(createAttachment)
    setAttachments((items) => [...items, ...added])
  }
  async function submitReport(event: FormEvent) {
    event.preventDefault()
    if (!title.trim() || !message.trim() || saving) return
    setSaving(true)
    setSaveError('')
    try {
      const report = await createReport({ title: title.trim(), message: message.trim(), colonyId, catId, urgent }, attachments)
      submitted.current = true
      setSubmittedReportId(report.id)
      setAttachments([])
      setReportOpen(false)
      navigate(`/app/reports?report=${encodeURIComponent(report.id)}`)
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : 'Could not save the report. Try again.')
    } finally { setSaving(false) }
  }

  return <ReportComposerContext value={{ openComposer, submittedReportId, clearSubmittedReport }}>
    {children}
    <Drawer open={reportOpen} onOpenChange={(open) => { if (!open && !saving) closeComposer() }}>
      <DrawerContent render={<form onSubmit={submitReport} />} closeLabel="Close new report" closeDisabled={saving} motion={submitted.current ? 'none' : 'default'} finalFocus={() => submitted.current ? false : triggerRef.current}>
        <DrawerHeader><DialogTitle>New report</DialogTitle><DialogDescription>Share a sighting, care concern, or feeding update with your team.</DialogDescription></DrawerHeader>
        <DrawerBody>
          {saveError ? <Alert>{saveError}</Alert> : null}
          <fieldset disabled={saving} className="min-w-0 space-y-6">
          <div className="grid gap-2"><Label htmlFor="field-report-title">What happened?</Label><Input id="field-report-title" required maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="For example, feeding visit complete" /></div>
          <div className="grid gap-2"><Label htmlFor="field-report-colony">Colony</Label><SelectField id="field-report-colony" value={colonyId} onChange={(event) => { setColonyId(event.target.value); setCatId('') }}><option value="">I'm not sure</option>{data.colonies.map((colony) => <option key={colony.id} value={colony.id}>{colony.name}</option>)}</SelectField></div>
          <div className="grid gap-2"><Label htmlFor="field-report-cat">Cat (optional)</Label><SelectField id="field-report-cat" value={catId} disabled={!colonyId} onChange={(event) => setCatId(event.target.value)}><option value="">I'm not sure</option>{data.cats.filter((cat) => cat.colonyId === colonyId).map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}</SelectField></div>
          <div className="grid gap-2"><Label htmlFor="field-report-message">Details</Label><Textarea id="field-report-message" required maxLength={4000} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Include what you saw and where." /></div>
          <div className="grid gap-3">
            <Label htmlFor="field-report-attachments">Attachments (optional)</Label>
            <Input ref={fileInput} id="field-report-attachments" type="file" multiple accept="image/jpeg,image/png,image/gif,image/webp,image/avif,audio/*,.pdf,.txt,.docx,.csv" disabled={saving} tabIndex={-1} className="sr-only" onChange={(event) => { addFiles(Array.from(event.target.files ?? [])); event.target.value = '' }} />
            <div><Button type="button" variant="outline" disabled={saving} onClick={() => fileInput.current?.click()}><Paperclip aria-hidden="true" />Add attachments</Button></div>
            <Text size="caption" tone="muted">Photos, recordings, or documents. Up to 5 files, 10 MB each.</Text>
            {fileError ? <Alert>{fileError}</Alert> : null}
            {attachments.length ? <ReportAttachments attachments={attachments} onRemove={(attachment) => { discardAttachment(attachment); setAttachments((items) => items.filter((item) => item.id !== attachment.id)); setFileError('') }} /> : null}
          </div>
          <div className="flex items-center gap-3"><Checkbox id="field-report-urgent" checked={urgent} onCheckedChange={(checked) => setUrgent(checked === true)} /><Label htmlFor="field-report-urgent">Needs urgent attention</Label></div>
          </fieldset>
        </DrawerBody>
        <DrawerFooter className="flex-row justify-end"><Button type="button" variant="outline" disabled={saving} onClick={closeComposer}>Cancel</Button><Button type="submit" loading={saving} disabled={!title.trim() || !message.trim()}>Submit report</Button></DrawerFooter>
      </DrawerContent>
    </Drawer>
  </ReportComposerContext>
}
