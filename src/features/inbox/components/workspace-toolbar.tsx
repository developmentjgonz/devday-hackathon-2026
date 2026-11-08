import { useRef, useState, type FormEvent } from 'react'
import { Bell, Paperclip, Plus } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Drawer, DrawerBody, DrawerContent, DrawerFooter, DrawerHeader } from '@/components/ui/drawer'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NotificationButton } from '@/components/ui/notification-button'
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from '@/components/ui/popover'
import { RecordButton } from '@/components/ui/record-button'
import { SelectField } from '@/components/ui/select-field'
import { Textarea } from '@/components/ui/textarea'
import { Text } from '@/components/ui/typography'
import { WorkspaceHeader, type WorkspaceBreadcrumb } from '@/components/ui/workspace-header'
import { useInbox } from '../inbox-context'
import type { ReportAttachment } from '../types'
import { ReportAttachments } from './report-attachments'

export function WorkspaceToolbar({ currentUser, title: pageTitle, breadcrumbs }: { currentUser: string; title: string; breadcrumbs: WorkspaceBreadcrumb[] }) {
  const { data, reports, setReports, createAttachment, discardAttachment } = useInbox()
  const navigate = useNavigate()
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [colonyId, setColonyId] = useState('')
  const [urgent, setUrgent] = useState(false)
  const [attachments, setAttachments] = useState<ReportAttachment[]>([])
  const [fileError, setFileError] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)
  const urgentReports = reports.filter((report) => report.urgent && report.status !== 'processed')

  function openComposer() {
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
    setReports((items) => [{ id, title: title.trim(), message: message.trim(), reporter: currentUser, submittedAt: new Date().toISOString(), category: 'Field report', colonyId, catId: '', careNote: '', urgent, unread: true, status: 'review', attachments, tasks: [], thread: [], history: [] }, ...items])
    setAttachments([])
    setReportOpen(false)
    navigate(`/app/inbox?report=${encodeURIComponent(id)}`)
  }
  return <>
    <WorkspaceHeader title={pageTitle} breadcrumbs={breadcrumbs} actions={<>
      <Button onClick={openComposer}><Plus aria-hidden="true" />New report</Button>
      <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
        <PopoverTrigger render={<NotificationButton count={urgentReports.length} label="Urgent reports" />} />
        <PopoverContent side="bottom" align="end">
          <div className="px-3 pt-3 pb-2"><PopoverTitle>Urgent reports</PopoverTitle><Text size="caption" tone="muted" className="mt-1">Reports that need prompt review.</Text></div>
          {urgentReports.length ? <div className="grid max-h-80 gap-1 overflow-y-auto">{urgentReports.map((report) => <RecordButton key={report.id} title={report.title} description={data.colonies.find((colony) => colony.id === report.colonyId)?.name ?? 'Colony unknown'} render={<Link to={`/app/inbox?report=${encodeURIComponent(report.id)}`} />} onClick={() => setNotificationsOpen(false)} />)}</div> : <EmptyState icon={<Bell />} title="No urgent reports" />}
        </PopoverContent>
      </Popover>
    </>} />
    <Drawer open={reportOpen} onOpenChange={(open) => { if (!open) closeComposer() }}>
      <DrawerContent render={<form onSubmit={submitReport} />} closeLabel="Close new report">
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
  </>
}
