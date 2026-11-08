import { createContext, useCallback, useContext, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Paperclip, Plus } from 'lucide-react'
import { DiscardOnNavigation } from '@/components/layout/discard-on-navigation'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { DiscardChangesDialog, useDiscardConfirmation } from '@/components/ui/discard-changes-dialog'
import { Drawer, DrawerBody, DrawerContent, DrawerContext, DrawerContextField, DrawerFooter, DrawerHeader } from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SelectField } from '@/components/ui/select-field'
import { Textarea } from '@/components/ui/textarea'
import { Text } from '@/components/ui/typography'
import { useInbox } from '../inbox-context'
import type { ReportAttachment } from '../types'
import { ReportAttachments } from './report-attachments'
import { useReportDetail } from './report-detail-context'
import { attachmentAccept, attachmentError } from '../../../../shared/attachments'

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
  const { openReport } = useReportDetail()
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
  const defaultsRef = useRef({ colonyId: '', catId: '' })
  const hasChanges = reportOpen && Boolean(title || message || urgent || attachments.length || colonyId !== defaultsRef.current.colonyId || catId !== defaultsRef.current.catId)
  const discard = useDiscardConfirmation(hasChanges)
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
    const selectedCat = cat?.colonyId === selectedColony ? cat.id : ''
    defaultsRef.current = { colonyId: selectedColony, catId: selectedCat }
    setTitle(''); setMessage(''); setColonyId(selectedColony); setCatId(selectedCat); setUrgent(false); setFileError(''); setSaveError(''); setReportOpen(true)
  }
  function closeComposer() {
    attachments.forEach(discardAttachment)
    setAttachments([])
    setFileError('')
    setReportOpen(false)
  }
  function requestClose() { discard.requestDiscard(closeComposer) }
  function addFiles(files: File[]) {
    const error = attachmentError([...attachments.map((file) => ({ name: file.name, type: file.mimeType, size: file.size })), ...files])
    if (error) { setFileError(error); return }
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
      openReport(report.id, triggerRef.current)
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : 'Could not save the report. Try again.')
    } finally { setSaving(false) }
  }

  return <ReportComposerContext value={{ openComposer, submittedReportId, clearSubmittedReport }}>
    {children}
    <Drawer open={reportOpen} onOpenChange={(open, event) => { if (!open) { if (saving || hasChanges) event.cancel(); if (!saving) requestClose() } }}>
      <DrawerContent render={<form onSubmit={submitReport} />} closeLabel="Close new report" closeDisabled={saving} motion={submitted.current ? 'none' : 'default'} finalFocus={() => submitted.current ? false : triggerRef.current}>
        <DrawerHeader density="compact" className="pr-6">
          <DialogTitle size="card" className="flex min-h-11 items-center pr-10">New report</DialogTitle>
          <DialogDescription className="sr-only">Share a sighting, care concern, or feeding update with your team.</DialogDescription>

        </DrawerHeader>
        <DrawerBody>
          {saveError ? <Alert>{saveError}</Alert> : null}
          <fieldset disabled={saving} className="min-w-0 space-y-6">
          <div className="grid gap-2"><Label htmlFor="field-report-title">What happened?</Label><Input id="field-report-title" required maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="For example, feeding visit complete" /></div>
          <div className="grid gap-2"><Label htmlFor="field-report-message">Details</Label><Textarea id="field-report-message" required maxLength={4000} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Include what you saw and where." /></div>
          <DrawerContext>
            <DrawerContextField><Label htmlFor="field-report-colony">Colony</Label><SelectField id="field-report-colony" disabled={saving} value={colonyId} onChange={(event) => { setColonyId(event.target.value); setCatId('') }}><option value="">I'm not sure</option>{data.colonies.map((colony) => <option key={colony.id} value={colony.id}>{colony.name}</option>)}</SelectField></DrawerContextField>
            <DrawerContextField><Label htmlFor="field-report-cat">Cat (optional)</Label><SelectField id="field-report-cat" value={catId} disabled={saving || (!colonyId && !data.cats.some((cat) => !cat.colonyId))} onChange={(event) => setCatId(event.target.value)}><option value="">I'm not sure</option>{data.cats.filter((cat) => cat.colonyId === colonyId).map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}</SelectField></DrawerContextField>
          </DrawerContext>
          <div className="grid gap-3">
            <Label htmlFor="field-report-attachments">Attachments (optional)</Label>
            <Input ref={fileInput} id="field-report-attachments" type="file" multiple accept={attachmentAccept} disabled={saving} tabIndex={-1} className="sr-only" onChange={(event) => { addFiles(Array.from(event.target.files ?? [])); event.target.value = '' }} />
            <div><Button type="button" variant="outline" disabled={saving} onClick={() => fileInput.current?.click()}><Paperclip aria-hidden="true" />Add attachments</Button></div>
            <Text size="caption" tone="muted">Photos, recordings, or documents. Up to 5 files, 10 MB each.</Text>
            {fileError ? <Alert>{fileError}</Alert> : null}
            {attachments.length ? <ReportAttachments attachments={attachments} onRemove={(attachment) => { discardAttachment(attachment); setAttachments((items) => items.filter((item) => item.id !== attachment.id)); setFileError('') }} /> : null}
          </div>
          <div className="flex items-center gap-3"><Checkbox id="field-report-urgent" checked={urgent} onCheckedChange={(checked) => setUrgent(checked === true)} /><Label htmlFor="field-report-urgent">Needs urgent attention</Label></div>
          </fieldset>
        </DrawerBody>
        <DrawerFooter><Button type="button" variant="outline" disabled={saving} onClick={requestClose}>Cancel</Button><Button type="submit" loading={saving} disabled={!title.trim() || !message.trim()}>Submit report</Button></DrawerFooter>
        <DiscardChangesDialog {...discard.dialogProps} />
        {hasChanges && !saving ? <DiscardOnNavigation onDiscard={closeComposer} /> : null}
      </DrawerContent>
    </Drawer>
  </ReportComposerContext>
}
