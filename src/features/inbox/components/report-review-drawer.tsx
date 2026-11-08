import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Check, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Disclosure } from '@/components/ui/disclosure'
import { Drawer, DrawerBody, DrawerContent, DrawerFooter, DrawerHeader } from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SelectField } from '@/components/ui/select-field'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { Heading, Text } from '@/components/ui/typography'
import { reportStatusLabels, type InboxData, type InboxReport, type ReportAttachment } from '../types'
import { ReportAttachments } from './report-attachments'
import { useReportComposer } from './report-composer'

type ReviewDraft = Pick<InboxReport, 'colonyId' | 'catId' | 'careNote' | 'urgent'>
type Action = 'question' | 'task' | 'duplicate'
type ActionDraft = { question: string; taskTitle: string; taskOwner: string; taskDue: string; duplicateId: string }
const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' })
const dueFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })

export function ReportReviewDrawer({ report, reports, data, currentUser, open, onClose, onUpdate, onNotice, finalFocus }: {
  report: InboxReport | null
  reports: InboxReport[]
  data: InboxData
  currentUser: string
  open: boolean
  onClose: () => void
  onUpdate: (id: string, update: (report: InboxReport) => InboxReport) => void
  onNotice: (notice: string) => void
  finalFocus: () => HTMLElement | null
}) {
  // Keep drafts by report, including unfinished follow-up dialogs.
  const [drafts, setDrafts] = useState<Record<string, ReviewDraft>>({})
  const [actionDrafts, setActionDrafts] = useState<Record<string, ActionDraft>>({})
  const [action, setAction] = useState<Action | null>(null)
  const [photo, setPhoto] = useState<ReportAttachment | null>(null)
  const [taskNotice, setTaskNotice] = useState<{ reportId: string; text: string } | null>(null)
  const { submittedReportId, clearSubmittedReport } = useReportComposer()
  const drawerRef = useRef<HTMLDivElement>(null)
  const draft = report ? drafts[report.id] ?? report : null
  const actionDraft = report ? actionDrafts[report.id] ?? {
    question: '', taskTitle: report.category === 'Care concern' ? 'Arrange a care check' : '', taskOwner: '', taskDue: '', duplicateId: report.possibleDuplicateOf ?? '',
  } : null
  const isProcessed = report?.status === 'processed'
  const matchingCats = data.cats.filter((cat) => cat.colonyId === draft?.colonyId)
  const duplicateTargets = reports.filter((candidate) => candidate.id !== report?.id && !candidate.duplicateOf && Boolean(draft?.colonyId) && candidate.colonyId === draft?.colonyId && !reports.some((item) => item.duplicateOf === report?.id))
  const duplicateChoice = duplicateTargets.find((candidate) => candidate.id === actionDraft?.duplicateId)
  const duplicateTarget = reports.find((candidate) => candidate.id === report?.duplicateOf)
  const suggestedDuplicate = duplicateTargets.find((candidate) => candidate.id === report?.possibleDuplicateOf)
  const changed = report && draft ? (['colonyId', 'catId', 'careNote', 'urgent'] as const).some((key) => report[key] !== draft[key]) : false
  const finishHint = !draft?.colonyId ? 'Choose a colony to finish.' : !draft.careNote.trim() ? 'Add a care note to finish.' : changed ? 'Unsaved review changes' : ''
  const justSubmitted = report?.id === submittedReportId && submittedReportId !== null

  useEffect(() => {
    setTaskNotice(null)
  }, [open, report?.id])

  useEffect(() => {
    if (!open && report && report.id === submittedReportId) clearSubmittedReport(report.id)
  }, [open, report, submittedReportId, clearSubmittedReport])

  function editDraft(update: Partial<ReviewDraft>) {
    if (!report || !draft) return
    setDrafts((items) => ({ ...items, [report.id]: { colonyId: draft.colonyId, catId: draft.catId, careNote: draft.careNote, urgent: draft.urgent, ...update } }))
  }

  function editActionDraft(update: Partial<ActionDraft>) {
    if (!report || !actionDraft) return
    setActionDrafts((items) => ({ ...items, [report.id]: { ...actionDraft, ...update } }))
  }

  function finishReview() {
    if (!report || !draft || !draft.colonyId || !draft.careNote.trim()) return
    onUpdate(report.id, (item) => ({ ...item, ...draft, careNote: draft.careNote.trim(), status: 'processed', history: [...item.history, `${currentUser} saved the confirmed report details and finished the review.`] }))
    setDrafts((items) => { const next = { ...items }; delete next[report.id]; return next })
    onNotice(`Review finished: ${report.title}. Find it under Processed.${report.tasks.some((task) => task.status === 'open') ? ' Linked care tasks remain open.' : ''}`)
    closeReview()
  }

  function reopen() {
    if (!report) return
    onUpdate(report.id, (item) => ({ ...item, status: 'pending', duplicateOf: undefined, history: [...item.history, `${currentUser} reopened the report for review.`] }))
    onNotice('Report returned to Pending.')
    closeReview()
  }

  function closeReview() {
    if (justSubmitted && report) clearSubmittedReport(report.id)
    onClose()
  }

  function restoreFocus() {
    // Resolve after row removal. Focus the table itself, rather than its first control.
    queueMicrotask(() => finalFocus()?.focus({ preventScroll: true }))
    return false
  }

  function submitAction(event: FormEvent) {
    event.preventDefault()
    if (!report || !actionDraft) return
    if (action === 'question' && actionDraft.question.trim()) {
      onUpdate(report.id, (item) => ({ ...item, status: 'waiting', thread: [...item.thread, { id: crypto.randomUUID(), author: currentUser, text: actionDraft.question.trim() }], history: [...item.history, `${currentUser} requested more details.`] }))
      editActionDraft({ question: '' })
      onNotice('Question added. Report moved to Waiting for details.')
      closeReview()
    } else if (action === 'task' && actionDraft.taskTitle.trim() && actionDraft.taskOwner) {
      onUpdate(report.id, (item) => ({ ...item, tasks: [...item.tasks, { id: crypto.randomUUID(), title: actionDraft.taskTitle.trim(), owner: actionDraft.taskOwner, due: actionDraft.taskDue, status: 'open' }], history: [...item.history, `${currentUser} created a care task assigned to ${actionDraft.taskOwner}.`] }))
      editActionDraft({ taskTitle: '', taskOwner: '', taskDue: '' })
      const count = report.tasks.length + 1
      setTaskNotice({ reportId: report.id, text: `Care task created. ${count} ${count === 1 ? 'task' : 'tasks'} linked to this report.` })
    } else if (action === 'duplicate' && duplicateChoice) {
      onUpdate(report.id, (item) => ({ ...item, status: 'processed', duplicateOf: duplicateChoice.id, history: [...item.history, `${currentUser} linked this duplicate to an existing report.`] }))
      onNotice('Duplicate linked. Both original submissions have been kept.')
      closeReview()
    } else return
    setAction(null)
  }

  return <Drawer open={open && report !== null} onOpenChange={(next) => { if (!next) closeReview() }}>
    <DrawerContent ref={drawerRef} closeLabel="Close report" motion={justSubmitted ? 'none' : 'default'} finalFocus={restoreFocus} initialFocus={drawerRef}>
      {report && draft ? <>
        <DrawerHeader density="compact">
          <DialogTitle size="card" className="flex min-h-11 items-center">{report.title}</DialogTitle>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Text size="caption" tone="muted">{report.category}</Text>
            {draft.urgent ? <Text size="caption" tone="danger" weight="medium">Urgent</Text> : null}
            <Text size="caption" tone="muted">{reportStatusLabels[report.status]}</Text>
          </div>
          <DialogDescription className="flex flex-wrap gap-x-3">{justSubmitted ? <span>Report added.</span> : null}<span>Reported by {report.reporter}</span><time dateTime={report.submittedAt}>{dateFormat.format(new Date(report.submittedAt))}</time></DialogDescription>
        </DrawerHeader>
        <DrawerBody key={report.id}>
          <section aria-labelledby="original-report-title" className="space-y-3">
            <Heading id="original-report-title" level={3} size="compact">Original report</Heading>
            <Text size="small" className="whitespace-pre-wrap wrap-anywhere">{report.message}</Text>
            {report.attachments.length ? <ReportAttachments attachments={report.attachments} onOpenPhoto={setPhoto} /> : null}
          </section>
          <Separator />
          <section aria-labelledby="review-details-title" className="space-y-4">
            <Heading id="review-details-title" level={3} size="card">{isProcessed ? 'Reviewed details' : 'Review details'}</Heading>
            {report.duplicateOf ? <Card size="sm"><CardContent className="space-y-1"><Text size="label">Linked as a duplicate</Text><Text size="small">{duplicateTarget?.title ?? 'Existing report'}</Text></CardContent></Card> : null}
            {isProcessed ? <>
              <dl className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><Text render={<dt />} size="caption" tone="muted">Colony</Text><Text render={<dd />} size="small">{data.colonies.find((colony) => colony.id === report.colonyId)?.name ?? 'Unknown'}</Text></div>
                <div className="space-y-1"><Text render={<dt />} size="caption" tone="muted">Cat</Text><Text render={<dd />} size="small">{data.cats.find((cat) => cat.id === report.catId)?.name ?? 'Unconfirmed'}</Text></div>
                <div className="col-span-2 space-y-1"><Text render={<dt />} size="caption" tone="muted">Care note</Text><Text render={<dd />} size="small" className="whitespace-pre-wrap wrap-anywhere">{report.careNote}</Text></div>
              </dl>
              {report.urgent ? <Text size="small" tone="danger">Needs urgent attention</Text> : null}
            </> : <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2"><Label htmlFor="report-colony">Colony</Label><SelectField id="report-colony" required value={draft.colonyId} onChange={(event) => editDraft({ colonyId: event.target.value, catId: '' })}><option value="">Colony unknown</option>{data.colonies.map((colony) => <option key={colony.id} value={colony.id}>{colony.name}</option>)}</SelectField></div>
                <div className="grid gap-2"><Label htmlFor="report-cat">Cat (optional)</Label><SelectField id="report-cat" value={draft.catId} disabled={!draft.colonyId} onChange={(event) => editDraft({ catId: event.target.value })}><option value="">Unconfirmed</option>{matchingCats.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}</SelectField></div>
              </div>
              <div className="grid gap-2"><Label htmlFor="report-care-note">Care note</Label><Textarea id="report-care-note" required value={draft.careNote} onChange={(event) => editDraft({ careNote: event.target.value })} /></div>
              <div className="flex items-center gap-3"><Checkbox id="report-urgent" checked={draft.urgent} onCheckedChange={(checked) => editDraft({ urgent: checked === true })} /><Label htmlFor="report-urgent">Needs urgent attention</Label></div>
            </>}
          </section>
          {report.tasks.length || !isProcessed ? <>
            <Separator />
            <section aria-labelledby="care-tasks-title" className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2"><Heading id="care-tasks-title" level={3} size="compact">Care tasks{report.tasks.length ? ` (${report.tasks.length})` : ''}</Heading>{!isProcessed ? <Button variant="outline" size="sm" onClick={() => setAction('task')}>Create task</Button> : null}</div>
              {report.tasks.length ? <ul className="space-y-4">{report.tasks.map((task) => <li key={task.id} className="space-y-1"><Text size="small" weight="medium" className="wrap-anywhere">{task.title}</Text><Text size="caption" tone="muted">{task.status === 'completed' ? 'Completed task' : 'Open task'} assigned to {task.owner}</Text>{task.due ? <Text size="caption" tone="muted">Due {dueFormat.format(new Date(`${task.due}T00:00:00Z`))}</Text> : null}</li>)}</ul> : null}
              <Text role="status" size="small" className={taskNotice?.reportId === report.id ? undefined : 'sr-only'}>{taskNotice?.reportId === report.id ? taskNotice.text : ''}</Text>
            </section>
          </> : null}
          {report.thread.length ? <><Separator /><section aria-labelledby="conversation-title" className="space-y-4"><Heading id="conversation-title" level={3} size="compact">Conversation</Heading><ol className="space-y-4">{report.thread.map((entry) => <li key={entry.id} className="space-y-1"><Text size="small" weight="medium">{entry.author}</Text><Text size="small" className="whitespace-pre-wrap wrap-anywhere">{entry.text}</Text></li>)}</ol></section></> : null}
          {!isProcessed && duplicateTargets.length ? <><Separator /><div className="space-y-2">{suggestedDuplicate ? <><Text size="label">Possible duplicate</Text><Text size="small">{suggestedDuplicate.title}</Text></> : null}<Button variant="link" size="sm" onClick={() => setAction('duplicate')}>{suggestedDuplicate ? 'Compare and link reports' : 'Link as a duplicate'}</Button></div></> : null}
          {report.history.length ? <><Separator /><Disclosure title="Review history"><ol className="space-y-3">{report.history.map((entry, index) => <li key={`${index}-${entry}`}><Text size="small" tone="muted">{entry}</Text></li>)}</ol></Disclosure></> : null}
        </DrawerBody>
        <DrawerFooter>
          {isProcessed ? <Button variant="outline" onClick={reopen}><RotateCcw aria-hidden="true" />Reopen report</Button> : <>
            {finishHint ? <Text id="review-finish-hint" size="caption" tone="muted" role="status">{finishHint}</Text> : null}
            <div className="grid gap-2 min-[360px]:grid-cols-2">
              <Button variant="outline" onClick={() => setAction('question')}>Ask for details</Button>
              <Button onClick={finishReview} disabled={!draft.colonyId || !draft.careNote.trim()} aria-describedby={finishHint ? 'review-finish-hint' : undefined}><Check aria-hidden="true" />Save and finish</Button>
            </div>
          </>}
        </DrawerFooter>
      </> : null}
    </DrawerContent>
    <Dialog open={action !== null} onOpenChange={(next) => { if (!next) setAction(null) }}>
      <DialogContent>
        <form onSubmit={submitAction} className="grid gap-5">
          <DialogHeader><DialogTitle>{action === 'question' ? 'Ask for details' : action === 'task' ? 'Create a care task' : 'Link duplicate report'}</DialogTitle><DialogDescription>{action === 'question' ? `Add a question for ${report?.reporter}. This moves the report to Waiting for details.` : action === 'task' ? 'Assign the next care action. The task stays open after the review is finished.' : 'Compare the reports before linking. Both original submissions will be kept.'}</DialogDescription></DialogHeader>
          {action === 'question' ? <div className="grid gap-2"><Label htmlFor="report-question">Question</Label><Textarea id="report-question" required maxLength={2000} value={actionDraft?.question ?? ''} onChange={(event) => editActionDraft({ question: event.target.value })} placeholder="What do you need to know?" /></div> : null}
          {action === 'task' ? <>
            <div className="grid gap-2"><Label htmlFor="task-title">What needs to happen?</Label><Input id="task-title" required maxLength={160} value={actionDraft?.taskTitle ?? ''} onChange={(event) => editActionDraft({ taskTitle: event.target.value })} /></div>
            <div className="grid gap-2"><Label htmlFor="task-owner">Assign to</Label><SelectField id="task-owner" required value={actionDraft?.taskOwner ?? ''} onChange={(event) => editActionDraft({ taskOwner: event.target.value })}><option value="">Choose a team member</option>{data.members.map((member) => <option key={member} value={member}>{member}</option>)}</SelectField></div>
            <div className="grid gap-2"><Label htmlFor="task-due">Due date (optional)</Label><Input id="task-due" type="date" value={actionDraft?.taskDue ?? ''} onChange={(event) => editActionDraft({ taskDue: event.target.value })} /></div>
          </> : null}
          {action === 'duplicate' ? <>
            <div className="grid gap-2"><Label htmlFor="duplicate-report">Existing report</Label><SelectField id="duplicate-report" required value={duplicateChoice?.id ?? ''} onChange={(event) => editActionDraft({ duplicateId: event.target.value })}><option value="">Choose a report</option>{duplicateTargets.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.title}</option>)}</SelectField></div>
            {duplicateChoice ? <Card size="sm"><CardContent className="space-y-3"><div className="space-y-1"><Text size="label">{duplicateChoice.title}</Text><Text size="caption" tone="muted">{duplicateChoice.reporter} — {dateFormat.format(new Date(duplicateChoice.submittedAt))}</Text></div><Text size="small" className="whitespace-pre-wrap wrap-anywhere">{duplicateChoice.message}</Text></CardContent></Card> : null}
            <Text size="small" tone="muted">Linking finishes this review. Cat records stay separate.</Text>
            {changed ? <Text size="small" tone="muted">Your review draft will be kept if you reopen this report.</Text> : null}
          </> : null}
          <DialogFooter><Button type="button" variant="outline" onClick={() => setAction(null)}>Cancel</Button><Button type="submit" disabled={action === 'question' ? !actionDraft?.question.trim() : action === 'task' ? !actionDraft?.taskTitle.trim() || !actionDraft.taskOwner : !duplicateChoice}>{action === 'question' ? 'Add question and wait' : action === 'task' ? 'Create task' : 'Link and finish'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    <Dialog open={photo !== null} onOpenChange={(next) => { if (!next) setPhoto(null) }}><DialogContent size="wide"><DialogHeader><DialogTitle>Report photo</DialogTitle><DialogDescription>{photo?.name}</DialogDescription></DialogHeader>{photo ? <img src={photo.url} alt={photo.name} className="max-h-[65dvh] w-full object-contain" /> : null}</DialogContent></Dialog>
  </Drawer>
}
