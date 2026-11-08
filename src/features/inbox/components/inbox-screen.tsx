import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Check, CheckCheck, ClipboardList, Copy, MessageCircle, RotateCcw, Search, X } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Button, ButtonLabel } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Drawer, DrawerBody, DrawerContent, DrawerFooter, DrawerHeader } from '@/components/ui/drawer'
import { Table, TableCell, TableHead, TableOpenButton, TableRow } from '@/components/ui/table'
import { useSearchParams } from 'react-router'
import { useInbox } from '../inbox-context'
import { ReportAttachments } from './report-attachments'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { Disclosure } from '@/components/ui/disclosure'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SelectField } from '@/components/ui/select-field'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { Heading, Text } from '@/components/ui/typography'
import { ViewTabs } from '@/components/ui/view-tabs'
import { cn } from '@/lib/utils'
import type { InboxReport, ReviewStatus } from '../types'

type Draft = Pick<InboxReport, 'colonyId' | 'catId' | 'careNote' | 'urgent'>
type ActionDialog = 'question' | 'task' | 'duplicate' | null
const views: { value: ReviewStatus; label: string }[] = [
  { value: 'review', label: 'To review' },
  { value: 'waiting', label: 'Waiting for details' },
  { value: 'processed', label: 'Processed' },
]
const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' })
const dueFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })

function sortedReports(reports: InboxReport[]) {
  return [...reports].sort((a, b) => Number(b.urgent) - Number(a.urgent) || Date.parse(a.submittedAt) - Date.parse(b.submittedAt))
}

function ReportBadge({ report }: { report: InboxReport }) {
  if (report.urgent) return <Badge variant="destructive">Urgent</Badge>
  if (report.possibleDuplicateOf && !report.duplicateOf && report.status !== 'processed') return <Badge variant="warning">Possible duplicate</Badge>
  return <Badge variant="outline">{report.category}</Badge>
}

function ReviewSignal({ report }: { report: InboxReport }) {
  if (report.status === 'processed') return <Badge variant={report.duplicateOf ? 'outline' : 'success'}>{report.duplicateOf ? 'Duplicate linked' : 'Processed'}</Badge>
  if (report.urgent) return <Badge variant="destructive">Urgent</Badge>
  if (report.status === 'waiting') return <Badge variant="outline">Waiting for details</Badge>
  if (report.possibleDuplicateOf) return <Badge variant="warning">Check duplicate</Badge>
  if (!report.colonyId) return <Badge variant="warning">Needs location</Badge>
  return <Badge variant="outline">Ready to review</Badge>
}

export function InboxScreen({ currentUser = 'Alex Morgan', initialView = 'review' }: {
  currentUser?: string
  initialView?: ReviewStatus
}) {
  const { data: initialData, reports, setReports } = useInbox()
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedId = searchParams.get('report')
  const [view, setView] = useState<ReviewStatus>(initialView)
  const [selectedId, setSelectedId] = useState<string | null>(requestedId)
  const [drawerOpen, setDrawerOpen] = useState(Boolean(requestedId))
  const [search, setSearch] = useState('')
  const [colonyFilter, setColonyFilter] = useState('all')
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [notice, setNotice] = useState('')
  const [dialog, setDialog] = useState<ActionDialog>(null)
  const [question, setQuestion] = useState('')
  const [taskTitle, setTaskTitle] = useState('')
  const [taskOwner, setTaskOwner] = useState('')
  const [taskDue, setTaskDue] = useState('')
  const [duplicateId, setDuplicateId] = useState('')
  const [photo, setPhoto] = useState<{ url: string; alt: string } | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const returnFocus = useRef<HTMLButtonElement | null>(null)

  const query = search.trim().toLocaleLowerCase()
  const visibleReports = sortedReports(reports.filter((report) => {
    const colony = initialData.colonies.find((item) => item.id === report.colonyId)
    return report.status === view
      && (colonyFilter === 'all' || report.colonyId === colonyFilter)
      && (!query || [report.title, report.message, report.reporter, colony?.name ?? '', initialData.cats.find((cat) => cat.id === report.catId)?.name ?? ''].join(' ').toLocaleLowerCase().includes(query))
  }))
  const selected = reports.find((report) => report.id === selectedId) ?? null
  const draft = selected ? drafts[selected.id] ?? selected : null
  const isProcessed = selected?.status === 'processed'
  const matchingCats = initialData.cats.filter((cat) => cat.colonyId === draft?.colonyId)
  const duplicateTargets = reports.filter((report) => report.id !== selected?.id && !report.duplicateOf && !reports.some((item) => item.duplicateOf === selected?.id) && (!draft?.colonyId || report.colonyId === draft.colonyId))
  const duplicateTarget = reports.find((report) => report.id === selected?.duplicateOf)
  const changed = selected && draft ? ['colonyId', 'catId', 'careNote', 'urgent'].some((key) => selected[key as keyof Draft] !== draft[key as keyof Draft]) : false

  // The global bell and report composer can open a report from any route.
  useEffect(() => {
    if (!requestedId) return
    setSelectedId(requestedId)
    setDrawerOpen(true)
    setReports((items) => items.map((report) => report.id === requestedId ? { ...report, unread: false } : report))
  }, [requestedId, setReports])

  function updateReport(id: string, update: (report: InboxReport) => InboxReport) {
    setReports((items) => items.map((report) => report.id === id ? update(report) : report))
  }

  function editDraft(update: Partial<Draft>) {
    if (!selected || !draft) return
    setDrafts((items) => ({ ...items, [selected.id]: { colonyId: draft.colonyId, catId: draft.catId, careNote: draft.careNote, urgent: draft.urgent, ...update } }))
  }

  function openReport(report: InboxReport, trigger: HTMLButtonElement | null) {
    returnFocus.current = trigger
    setSelectedId(report.id)
    setDrawerOpen(true)
    updateReport(report.id, (item) => ({ ...item, unread: false }))
  }

  function closeDrawer() {
    setDrawerOpen(false)
    if (requestedId) {
      const next = new URLSearchParams(searchParams)
      next.delete('report')
      setSearchParams(next, { replace: true, preventScrollReset: true })
    }
  }

  function changeView(next: ReviewStatus) {
    setView(next)
    closeDrawer()
  }

  function leaveReport() {
    closeDrawer()
  }

  function finishReview() {
    if (!selected || !draft || !draft.colonyId || !draft.careNote.trim()) return
    updateReport(selected.id, (report) => ({ ...report, ...draft, careNote: draft.careNote.trim(), status: 'processed', history: [...report.history, `${currentUser} saved the confirmed report details and finished the review.`] }))
    setNotice(`Review finished: ${selected.title}. ${selected.tasks.length ? 'Linked care tasks remain open.' : ''}`)
    leaveReport()
  }

  function reopen() {
    if (!selected) return
    updateReport(selected.id, (report) => ({ ...report, status: 'review', duplicateOf: undefined, history: [...report.history, `${currentUser} reopened the report for review.`] }))
    setNotice('Report returned to To review.')
    leaveReport()
  }

  function openAction(action: ActionDialog) {
    setQuestion('')
    setTaskTitle(selected?.category === 'Care concern' ? 'Arrange a care check' : '')
    setTaskOwner('')
    setTaskDue('')
    setDuplicateId(selected?.possibleDuplicateOf ?? '')
    setDialog(action)
  }

  function submitAction(event: FormEvent) {
    event.preventDefault()
    if (!selected) return
    if (dialog === 'question' && question.trim()) {
      updateReport(selected.id, (report) => ({ ...report, status: 'waiting', thread: [...report.thread, { id: crypto.randomUUID(), author: currentUser, text: question.trim() }], history: [...report.history, `${currentUser} requested more details.`] }))
      setNotice('Question added. Report moved to Waiting for details.')
      leaveReport()
    } else if (dialog === 'task' && taskTitle.trim() && taskOwner) {
      updateReport(selected.id, (report) => ({ ...report, tasks: [...report.tasks, { id: crypto.randomUUID(), title: taskTitle.trim(), owner: taskOwner, due: taskDue, status: 'open' }], history: [...report.history, `${currentUser} created a care task assigned to ${taskOwner}.`] }))
      setNotice('Care task created and linked to this report.')
    } else if (dialog === 'duplicate' && duplicateTargets.some((report) => report.id === duplicateId)) {
      updateReport(selected.id, (report) => ({ ...report, status: 'processed', duplicateOf: duplicateId, history: [...report.history, `${currentUser} linked this duplicate to an existing report.`] }))
      setNotice('Duplicate linked. The original submission has been kept.')
      leaveReport()
    } else return
    setDialog(null)
  }

  return (
    <>
      <PageHeader title="Inbox" description="Review incoming reports and update care records." />
      <ViewTabs label="Inbox views" value={view} onValueChange={(next) => changeView(next as ReviewStatus)} items={views.map((item) => ({ ...item, count: reports.filter((report) => report.status === item.value).length }))}>

      <div className="my-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Label htmlFor="inbox-search" className="sr-only">Search reports</Label>
          <Input id="inbox-search" type="search" placeholder="Search reports…" value={search} onChange={(event) => { setSearch(event.target.value); closeDrawer() }} enterKeyHint="search" />
        </div>
        <div className="sm:w-48">
          <Label htmlFor="inbox-colony-filter" className="sr-only">Filter by colony</Label>
          <SelectField id="inbox-colony-filter" value={colonyFilter} onChange={(event) => { setColonyFilter(event.target.value); closeDrawer() }}>
            <option value="all">All colonies</option>
            <option value="">Colony unknown</option>
            {initialData.colonies.map((colony) => <option key={colony.id} value={colony.id}>{colony.name}</option>)}
          </SelectField>
        </div>
      </div>

      <div role="status" aria-live="polite" className={cn('mb-4 flex items-center justify-between gap-3', !notice && 'sr-only')}>
        <Text size="small">{notice}</Text>
        {notice ? <Button variant="ghost" size="icon" aria-label="Dismiss message" onClick={() => setNotice('')}><X aria-hidden="true" /></Button> : null}
      </div>

      <Card padding="none" ref={listRef} tabIndex={-1} aria-label="Reports">
        {visibleReports.length ? <Table>
          <caption className="sr-only">{views.find((item) => item.value === view)?.label} reports. Urgent reports appear first, then oldest submissions.</caption>
          <thead><tr>
            <TableHead>Report</TableHead>
            <TableHead className="hidden w-36 md:table-cell">Colony / cat</TableHead>
            <TableHead className="hidden w-40 sm:table-cell">Status</TableHead>
            <TableHead className="hidden w-32 xl:table-cell">From</TableHead>
            <TableHead className="hidden w-36 xl:table-cell">Received</TableHead>
          </tr></thead>
          <tbody>{visibleReports.map((report) => {
            const colony = initialData.colonies.find((item) => item.id === report.colonyId)
            const cat = initialData.cats.find((item) => item.id === report.catId)
            return <TableRow key={report.id} interactive selected={drawerOpen && selected?.id === report.id} onClick={(event) => openReport(report, event.currentTarget.querySelector('button'))}>
              <TableCell>
                <TableOpenButton unread={report.unread} aria-label={`Review ${report.title}`}>{report.title}</TableOpenButton>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 md:hidden"><Text size="caption" tone="muted" className="truncate">{colony?.name ?? 'Colony unknown'} · {report.category}</Text><span className="sm:hidden"><ReviewSignal report={report} /></span></div>
              </TableCell>
              <TableCell className="hidden md:table-cell"><Text size="small" className="truncate">{colony?.name ?? 'Unknown'}{cat ? ` · ${cat.name}` : ''}</Text></TableCell>
              <TableCell className="hidden sm:table-cell"><ReviewSignal report={report} /></TableCell>
              <TableCell className="hidden xl:table-cell"><Text size="small" className="truncate">{report.reporter}</Text></TableCell>
              <TableCell className="hidden xl:table-cell"><Text size="caption" tone="muted">{dateFormat.format(new Date(report.submittedAt))}</Text></TableCell>
            </TableRow>
          })}</tbody>
        </Table> : <EmptyState icon={query || colonyFilter !== 'all' ? <Search /> : <CheckCheck />} title={query || colonyFilter !== 'all' ? 'No matching reports' : view === 'review' ? 'All reports reviewed' : view === 'waiting' ? 'No reports waiting' : 'No processed reports'} description={query || colonyFilter !== 'all' ? 'Try another search or colony.' : view === 'review' ? 'Reports that need review will appear here.' : undefined} />}
        {(!visibleReports.length && (query || colonyFilter !== 'all')) ? <div className="flex justify-center px-5 pb-5"><Button variant="outline" onClick={() => { setSearch(''); setColonyFilter('all') }}>Clear filters</Button></div> : null}
      </Card>
      <div className="mt-3 flex items-center justify-between gap-3"><Text size="caption" tone="muted">{visibleReports.length} {visibleReports.length === 1 ? 'report' : 'reports'}</Text><Text size="caption" tone="muted">Urgent first, then oldest</Text></div>
      </ViewTabs>

      <Drawer open={drawerOpen && selected !== null} onOpenChange={(open) => { if (!open) closeDrawer() }}>
        <DrawerContent closeLabel="Close report" finalFocus={() => returnFocus.current?.isConnected ? returnFocus.current : listRef.current}>
          {selected && draft ? <>
            <DrawerHeader>
              <div className="flex flex-wrap items-center gap-2"><ReportBadge report={selected} />{isProcessed ? <Badge variant="success"><Check aria-hidden="true" />Processed</Badge> : null}</div>
              <DialogTitle>{selected.title}</DialogTitle>
              <DialogDescription>{selected.reporter} · {dateFormat.format(new Date(selected.submittedAt))}</DialogDescription>
            </DrawerHeader>
            <DrawerBody>
                <section aria-label="Original report" className="space-y-3">
                  <Text size="label">Original report</Text>
                  <Text size="small">{selected.message}</Text>
                  {selected.attachments.length ? <ReportAttachments attachments={selected.attachments} onOpenPhoto={(attachment) => setPhoto({ url: attachment.url, alt: attachment.name })} /> : null}
                </section>
                <Separator />
                {selected.duplicateOf ? <div className="space-y-2"><Text size="label">Linked as a duplicate</Text><Text size="small">{duplicateTarget?.title ?? 'Existing report'}</Text></div> : null}
                <section aria-label="Record details" className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2"><Heading level={3} size="card">{isProcessed ? 'Reviewed details' : 'Review details'}</Heading>{!isProcessed && selected.catId ? <Badge variant="outline">Confirm cat match</Badge> : null}</div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-2"><Label htmlFor="report-colony">Colony</Label><SelectField id="report-colony" value={draft.colonyId} disabled={isProcessed} onChange={(event) => editDraft({ colonyId: event.target.value, catId: '' })}><option value="">Colony unknown</option>{initialData.colonies.map((colony) => <option key={colony.id} value={colony.id}>{colony.name}</option>)}</SelectField></div>
                    <div className="grid gap-2"><Label htmlFor="report-cat">Cat</Label><SelectField id="report-cat" value={draft.catId} disabled={isProcessed || !draft.colonyId} onChange={(event) => editDraft({ catId: event.target.value })}><option value="">Unconfirmed / unknown</option>{matchingCats.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}</SelectField></div>
                  </div>
                  <div className="grid gap-2"><Label htmlFor="report-care-note">Care note</Label><Textarea id="report-care-note" value={draft.careNote} disabled={isProcessed} onChange={(event) => editDraft({ careNote: event.target.value })} /></div>
                  <div className="flex items-center gap-3"><Checkbox id="report-urgent" checked={draft.urgent} disabled={isProcessed} onCheckedChange={(checked) => editDraft({ urgent: checked === true })} /><Label htmlFor="report-urgent">Needs urgent attention</Label></div>
                  {!isProcessed && !draft.colonyId ? <Text size="small" tone="muted">Choose a colony before finishing the review, or ask the reporter for its location.</Text> : null}
                  {changed ? <Text size="small" tone="muted">Changes will be saved when you finish this review.</Text> : null}
                </section>

                {selected.thread.length ? <><Separator /><section aria-label="Report conversation" className="space-y-4"><Heading level={3} size="card">Conversation</Heading>{selected.thread.map((entry) => <div key={entry.id} className="space-y-1"><Text size="label">{entry.author}</Text><Text size="small">{entry.text}</Text></div>)}</section></> : null}
                {selected.tasks.length ? <><Separator /><section aria-label="Linked care tasks" className="space-y-4"><Heading level={3} size="card">Linked care tasks</Heading>{selected.tasks.map((task) => <div key={task.id} className="space-y-1"><div className="flex flex-wrap items-center justify-between gap-2"><Text size="small">{task.title}</Text><Badge variant="outline">Open</Badge></div><Text size="small" tone="muted">{task.owner}{task.due ? ` · Due ${dueFormat.format(new Date(`${task.due}T00:00:00Z`))}` : ' · No due date'}</Text></div>)}</section></> : null}
                {!isProcessed ? <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => openAction('question')}><MessageCircle aria-hidden="true" />Ask for details</Button><Button variant="outline" onClick={() => openAction('task')}><ClipboardList aria-hidden="true" />Create task</Button>{duplicateTargets.length ? <Button variant="ghost" onClick={() => openAction('duplicate')}><Copy aria-hidden="true" />Link duplicate</Button> : null}</div> : null}
                {selected.history.length ? <><Separator /><Disclosure title="Review history"><ul className="space-y-2">{selected.history.map((entry, index) => <li key={`${index}-${entry}`}><Text size="small" tone="muted">{entry}</Text></li>)}</ul></Disclosure></> : null}
            </DrawerBody>
            <DrawerFooter>
                {isProcessed ? <Button variant="outline" onClick={reopen}><RotateCcw aria-hidden="true" />Reopen report</Button> : <>
                  <Text size="small" tone="muted">{draft.catId ? `Save this report for ${initialData.cats.find((cat) => cat.id === draft.catId)?.name}.` : 'Keep the cat identity unconfirmed.'}{selected.tasks.length ? ` ${selected.tasks.length} linked care ${selected.tasks.length === 1 ? 'task stays' : 'tasks stay'} open.` : ''}</Text>
                  <Button onClick={finishReview} disabled={!draft.colonyId || !draft.careNote.trim()}><Check aria-hidden="true" />Save and finish review</Button>
                </>}
            </DrawerFooter>
          </> : null}
        </DrawerContent>

      <Dialog open={dialog !== null} onOpenChange={(open) => { if (!open) setDialog(null) }}>
        <DialogContent>
          <form onSubmit={submitAction} className="grid gap-5">
            <DialogHeader><DialogTitle>{dialog === 'question' ? 'Ask for details' : dialog === 'task' ? 'Create a care task' : 'Link duplicate report'}</DialogTitle><DialogDescription>{dialog === 'question' ? `Add a question for ${selected?.reporter}. This report will wait for more details.` : dialog === 'task' ? 'Assign the next care action. It stays open after this report is processed.' : 'Choose the existing report for this same update. Both original submissions will be kept.'}</DialogDescription></DialogHeader>
            {dialog === 'question' ? <div className="grid gap-2"><Label htmlFor="report-question">Question</Label><Textarea id="report-question" required maxLength={2000} value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="What do you need to know?" /></div> : null}
            {dialog === 'task' ? <>
              <div className="grid gap-2"><Label htmlFor="task-title">What needs to happen?</Label><Input id="task-title" required maxLength={160} value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} /></div>
              <div className="grid gap-2"><Label htmlFor="task-owner">Assign to</Label><SelectField id="task-owner" required value={taskOwner} onChange={(event) => setTaskOwner(event.target.value)}><option value="">Choose a team member</option>{initialData.members.map((member) => <option key={member} value={member}>{member}</option>)}</SelectField></div>
              <div className="grid gap-2"><Label htmlFor="task-due">Due date (optional)</Label><Input id="task-due" type="date" value={taskDue} onChange={(event) => setTaskDue(event.target.value)} /></div>
            </> : null}
            {dialog === 'duplicate' ? <><div className="grid gap-2"><Label htmlFor="duplicate-report">Existing report</Label><SelectField id="duplicate-report" required value={duplicateId} onChange={(event) => setDuplicateId(event.target.value)}><option value="">Choose a report</option>{duplicateTargets.map((report) => <option key={report.id} value={report.id}>{report.title} · {report.reporter}</option>)}</SelectField></div><Text size="small" tone="muted">This finishes the duplicate review. Cat records remain separate.</Text>{changed ? <Text size="small" tone="muted">Your draft changes will stay available if you reopen this report.</Text> : null}</> : null}
            <DialogFooter><Button type="button" variant="outline" onClick={() => setDialog(null)}>Cancel</Button><Button type="submit" disabled={dialog === 'question' ? !question.trim() : dialog === 'task' ? !taskTitle.trim() || !taskOwner : !duplicateId}><ButtonLabel labels={['Add question and wait', 'Create task', 'Link and finish review']}>{dialog === 'question' ? 'Add question and wait' : dialog === 'task' ? 'Create task' : 'Link and finish review'}</ButtonLabel></Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={photo !== null} onOpenChange={(open) => { if (!open) setPhoto(null) }}><DialogContent><DialogHeader><DialogTitle>Report photo</DialogTitle><DialogDescription>{selected?.reporter} · {selected ? dateFormat.format(new Date(selected.submittedAt)) : ''}</DialogDescription></DialogHeader>{photo ? <img src={photo.url} alt={photo.alt} className="max-h-[65dvh] w-full object-contain" /> : null}</DialogContent></Dialog>
      </Drawer>
    </>
  )
}
