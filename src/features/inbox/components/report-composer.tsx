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

const ReportComposerContext = createContext<{
  openComposer: (trigger?: HTMLElement) => void
  submittedReportId: string | null
  clearSubmittedReport: (id: string) => void
} | null>(null)

export function useReportComposer() {
  const context = useContext(ReportComposerContext)
  if (!context) throw new Error('Report creation needs a ReportComposerProvider.')
  return context
}

export function NewReportButton() {
  const { openComposer } = useReportComposer()
  return <Button size="sm" onClick={(event) => openComposer(event.currentTarget)}><Plus aria-hidden="true" />New report</Button>
}

/** A single composer serves page-level triggers throughout the workspace. */
export function ReportComposerProvider({ currentUser, children }: { currentUser: string; children: ReactNode }) {
  const { data, setReports, createAttachment, discardAttachment } = useInbox()
  const navigate = useNavigate()
  const [reportOpen, setReportOpen] = useState(false)
  const [submittedReportId, setSubmittedReportId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [colonyId, setColonyId] = useState('')
  const [urgent, setUrgent] = useState(false)
  const [attachments, setAttachments] = useState<ReportAttachment[]>([])
  const [fileError, setFileError] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)
  const triggerRef = useRef<HTMLElement | null>(null)
  const submitted = useRef(false)
  const clearSubmittedReport = useCallback((id: string) => {
    setSubmittedReportId((current) => current === id ? null : current)
  }, [])

  function openComposer(trigger?: HTMLElement) {
    triggerRef.current = trigger ?? null
    submitted.current = false
    setSubmittedReportId(null)
    setTitle(''); setMessage(''); setColonyId(''); setUrgent(false); setFileError(''); setReportOpen(true)
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
    if (files.some((file) => !file.type.startsWith('image/') && !file.type.startsWith('audio/') && !/\.(pdf|txt|docx|csv)$/i.test(file.name))) { setFileError('Choose photos, audio recordings, PDF, text, Word, or CSV files.'); return }
    setFileError('')
    const added = files.map(createAttachment)
    setAttachments((items) => [...items, ...added])
  }
  function submitReport(event: FormEvent) {
    event.preventDefault()
    if (!title.trim() || !message.trim()) return
    const id = crypto.randomUUID()
    setReports((items) => [{ id, title: title.trim(), message: message.trim(), reporter: currentUser, submittedAt: new Date().toISOString(), category: 'Field report', colonyId, catId: '', careNote: '', urgent, unread: true, status: 'pending', attachments, tasks: [], thread: [], history: [] }, ...items])
    submitted.current = true
    setSubmittedReportId(id)
    setAttachments([])
    setReportOpen(false)
    navigate(`/app/reports?report=${encodeURIComponent(id)}`)
  }

  return <ReportComposerContext value={{ openComposer, submittedReportId, clearSubmittedReport }}>
    {children}
    <Drawer open={reportOpen} onOpenChange={(open) => { if (!open) closeComposer() }}>
      <DrawerContent render={<form onSubmit={submitReport} />} closeLabel="Close new report" motion={submitted.current ? 'none' : 'default'} finalFocus={() => submitted.current ? false : triggerRef.current}>
        <DrawerHeader><DialogTitle>New report</DialogTitle><DialogDescription>Share a sighting, care concern, or feeding update with your team.</DialogDescription></DrawerHeader>
        <DrawerBody>
          <div className="grid gap-2"><Label htmlFor="field-report-title">What happened?</Label><Input id="field-report-title" required maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="For example, feeding visit complete" /></div>
          <div className="grid gap-2"><Label htmlFor="field-report-colony">Colony</Label><SelectField id="field-report-colony" value={colonyId} onChange={(event) => setColonyId(event.target.value)}><option value="">I'm not sure</option>{data.colonies.map((colony) => <option key={colony.id} value={colony.id}>{colony.name}</option>)}</SelectField></div>
          <div className="grid gap-2"><Label htmlFor="field-report-message">Details</Label><Textarea id="field-report-message" required maxLength={4000} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Include what you saw and where." /></div>
          <div className="grid gap-3">
            <Label htmlFor="field-report-attachments">Attachments (optional)</Label>
            <Input ref={fileInput} id="field-report-attachments" type="file" multiple accept="image/*,audio/*,.pdf,.txt,.docx,.csv" tabIndex={-1} className="sr-only" onChange={(event) => { addFiles(Array.from(event.target.files ?? [])); event.target.value = '' }} />
            <div><Button type="button" variant="outline" onClick={() => fileInput.current?.click()}><Paperclip aria-hidden="true" />Add attachments</Button></div>
            <Text size="caption" tone="muted">Photos, recordings, or documents. Up to 5 files, 10 MB each.</Text>
            {fileError ? <Alert>{fileError}</Alert> : null}
            {attachments.length ? <ReportAttachments attachments={attachments} onRemove={(attachment) => { discardAttachment(attachment); setAttachments((items) => items.filter((item) => item.id !== attachment.id)); setFileError('') }} /> : null}
          </div>
          <div className="flex items-center gap-3"><Checkbox id="field-report-urgent" checked={urgent} onCheckedChange={(checked) => setUrgent(checked === true)} /><Label htmlFor="field-report-urgent">Needs urgent attention</Label></div>
        </DrawerBody>
        <DrawerFooter className="flex-row justify-end"><Button type="button" variant="outline" onClick={closeComposer}>Cancel</Button><Button type="submit" disabled={!title.trim() || !message.trim()}>Submit report</Button></DrawerFooter>
      </DrawerContent>
    </Drawer>
  </ReportComposerContext>
}
