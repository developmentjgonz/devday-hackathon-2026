import { isReportClosed } from '../../../../shared/types/workspace'
import { useEffect, useId, useLayoutEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowLeft, Check, RotateCcw } from 'lucide-react'
import { Link, useRouteLoaderData } from 'react-router'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Disclosure } from '@/components/ui/disclosure'
import { Drawer, DrawerBody, DrawerContent, DrawerContext, DrawerContextField, DrawerContextValue, DrawerFooter, DrawerHeader } from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LoadingIndicator } from '@/components/ui/loading-indicator'
import { SelectField } from '@/components/ui/select-field'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { TextLink } from '@/components/ui/text-link'
import { Heading, Text } from '@/components/ui/typography'
import { reportStatusLabels, type InboxData, type InboxReport, type ReportAttachment, type Task, type TaskAssociation } from '../types'
import { useInbox } from '../inbox-context'
import { associationLabel, emptyAssociationDraft, pendingAssociation, TaskAssociations, type AssociationDraft } from '@/features/tasks/components/task-associations'
import { TaskStatusButton } from '@/features/tasks/components/task-status-button'
import { useTaskDetailLink } from '@/features/tasks/components/task-detail-context'
import { NewRecordButton } from '@/features/colonies/components/new-record-button'
import { TaskRecordContextDetails, TaskRecordContextSummary } from '@/features/tasks/components/task-record-context'
import { resolveTaskRecordContext, resolveTasks } from '@/features/tasks/task-data'
import { useTaskActions } from '@/features/tasks/use-task-actions'
import { ReportAttachments } from './report-attachments'
import { ReportSuggestions } from './report-suggestions'
import { DuplicateReportSearch } from './duplicate-report-search'
import { useReportComposer } from './report-composer'
import type { Cat, Colony, WorkspaceData } from '../../../../shared/types/directory'
import type { ReportAnalysis } from '../../../../shared/schemas/report-analysis'
import type { DuplicateReport } from '../../../../shared/types/workspace'

type ReviewDraft = Pick<InboxReport, 'colonyId' | 'catId' | 'careNote' | 'urgent'>
type Action = 'question' | 'task' | 'edit-task' | 'duplicate' | 'suggestions'
type ActionDraft = { question: string; taskTitle: string; taskOwner: string; taskDue: string; taskAssociations: TaskAssociation[]; taskAssociationDraft: AssociationDraft; duplicateId: string }
type TaskActionDraft = Pick<ActionDraft, 'taskTitle' | 'taskOwner' | 'taskDue' | 'taskAssociations' | 'taskAssociationDraft'>
function taskActionDraft(task: Task): TaskActionDraft {
  return { taskTitle: task.title, taskOwner: task.ownerId, taskDue: task.due, taskAssociations: task.associations, taskAssociationDraft: emptyAssociationDraft() }
}
const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' })
const dueFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })

export function ReportReviewDrawer({ report, reports, data, open, onClose, onNotice, finalFocus }: {
  report: InboxReport | null
  reports: InboxReport[]
  data: InboxData
  open: boolean
  onClose: () => void
  onNotice: (notice: string) => void
  finalFocus: () => HTMLElement | null
}) {
  const { user } = useRouteLoaderData('workspace') as WorkspaceData
  const taskLink = useTaskDetailLink()
  const { tasks, members, aiAnalysisEnabled, analyzeReport, finishReport, dismissReport, reopenReport, askQuestion, linkDuplicate, createTask, editTask } = useInbox()
  const [saving, setSaving] = useState(false)
  const [dismissing, setDismissing] = useState(false)
  const [error, setError] = useState('')
  const reportTasks = tasks.filter((task) => task.reportId === report?.id)
  // Keep drafts by report, including unfinished follow-up actions.
  const [drafts, setDrafts] = useState<Record<string, ReviewDraft>>({})
  const [openCareNotes, setOpenCareNotes] = useState<Record<string, boolean>>({})
  const [actionDrafts, setActionDrafts] = useState<Record<string, ActionDraft>>({})
  const [taskEdits, setTaskEdits] = useState<Record<string, TaskActionDraft>>({})
  const [analyses, setAnalyses] = useState<Record<string, ReportAnalysis>>({})
  const [analysisState, setAnalysisState] = useState<{ reportId: string; loading: boolean; error: string } | null>(null)
  const [analysisRetry, setAnalysisRetry] = useState(0)
  const [reanalyzing, setReanalyzing] = useState<string | null>(null)
  const [chosenDuplicate, setChosenDuplicate] = useState<{ sourceId: string; report: DuplicateReport } | null>(null)
  const [suggestedTask, setSuggestedTask] = useState<{ reportId: string; draft: TaskActionDraft } | null>(null)
  const [action, setAction] = useState<Action | null>(null)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [photo, setPhoto] = useState<ReportAttachment | null>(null)
  const [taskNotice, setTaskNotice] = useState<{ reportId: string; text: string } | null>(null)
  const { submittedReportId, clearSubmittedReport } = useReportComposer()
  const drawerRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const actionTitleRef = useRef<HTMLHeadingElement>(null)
  const questionTrigger = useRef<HTMLButtonElement>(null)
  const taskTrigger = useRef<HTMLButtonElement>(null)
  const duplicateTrigger = useRef<HTMLButtonElement>(null)
  const suggestionsTrigger = useRef<HTMLButtonElement>(null)
  const suggestedTaskCreated = useRef<(() => void) | null>(null)
  const editTriggers = useRef(new Map<string, HTMLButtonElement>())
  const reviewScroll = useRef(0)
  const suggestionsScroll = useRef(0)
  const actionOrigin = useRef<'report' | 'suggestions'>('report')
  const pendingViewFocus = useRef<Action | 'action' | 'suggestions-return' | null>(null)
  const actionFormId = useId()
  const { changeTaskStatus, pendingTaskIds } = useTaskActions(user.id, drawerRef, user.role === 'administrator')
  const draft = report ? drafts[report.id] ?? report : null
  const actionDraft = report ? actionDrafts[report.id] ?? {
    question: '', taskTitle: report.category === 'Care concern' ? 'Arrange a care check' : '', taskOwner: '', taskDue: '', taskAssociations: [], taskAssociationDraft: emptyAssociationDraft(), duplicateId: report.possibleDuplicateOf ?? '',
  } : null
  const editingTask = reportTasks.find((task) => task.id === editingTaskId)
  const editingDraft = editingTask ? taskEdits[editingTask.id] ?? taskActionDraft(editingTask) : null
  const activeTaskDraft = action === 'edit-task' ? editingDraft : suggestedTask && suggestedTask.reportId === report?.id ? suggestedTask.draft : actionDraft
  const canAssignToCurrentUser = members.some((member) => member.id === user.id)
  const validTaskOwner = Boolean(activeTaskDraft && (members.some((member) => member.id === activeTaskDraft.taskOwner) || (action === 'edit-task' && editingTask?.ownerId === activeTaskDraft.taskOwner)))
  const actionTaskContext = (() => {
    if (!report || !activeTaskDraft || (action !== 'task' && action !== 'edit-task')) return null
    const pending = pendingAssociation(activeTaskDraft.taskAssociationDraft, activeTaskDraft.taskAssociations, data)
    const preview: Task = { id: editingTask?.id ?? '', title: activeTaskDraft.taskTitle, ownerId: activeTaskDraft.taskOwner, owner: '', due: activeTaskDraft.taskDue, status: editingTask?.status ?? 'open', reportId: report.id, associations: pending ? [...activeTaskDraft.taskAssociations, pending] : activeTaskDraft.taskAssociations }
    return resolveTaskRecordContext(preview, reports, data)
  })()
  const resolvedTasks = resolveTasks(reportTasks, reports, data)
  const isClosed = Boolean(report && isReportClosed(report.status))
  const matchingCats = data.cats.filter((cat) => cat.colonyId === draft?.colonyId || cat.id === report?.catId)
  const colonyName = data.colonies.find((colony) => colony.id === (isClosed ? report?.colonyId : draft?.colonyId))?.name ?? 'Unknown'
  const catName = data.cats.find((cat) => cat.id === (isClosed ? report?.catId : draft?.catId))?.name ?? 'Unconfirmed'
  const savedColonyName = data.colonies.find((colony) => colony.id === report?.colonyId)?.name ?? 'Unknown'
  const savedCatName = data.cats.find((cat) => cat.id === report?.catId)?.name ?? 'Unconfirmed'
  const suggestedAssociations: TaskAssociation[] = [
    ...(draft?.colonyId && data.colonies.some((colony) => colony.id === draft.colonyId) ? [{ type: 'colony' as const, id: draft.colonyId }] : []),
    ...(draft?.catId && data.cats.some((cat) => cat.id === draft.catId) ? [{ type: 'cat' as const, id: draft.catId }] : []),
  ]
  const canLinkDuplicate = Boolean(report?.colonyId && !isClosed && !reports.some((item) => item.duplicateOf === report.id))
  const existingChoice = reports.find((candidate) => candidate.id === actionDraft?.duplicateId && candidate.id !== report?.id && !candidate.duplicateOf && candidate.status !== 'dismissed' && candidate.colonyId === report?.colonyId)
  const duplicateChoice: DuplicateReport | null = chosenDuplicate && chosenDuplicate.sourceId === report?.id && chosenDuplicate.report.id === actionDraft?.duplicateId ? chosenDuplicate.report : existingChoice ? { id: existingChoice.id, title: existingChoice.title, message: existingChoice.message, reporter: existingChoice.reporter, submittedAt: existingChoice.submittedAt, cat: data.cats.find((cat) => cat.id === existingChoice.catId)?.name ?? '' } : null
  const duplicateTarget = reports.find((candidate) => candidate.id === report?.duplicateOf)
  const suggestedDuplicate = canLinkDuplicate ? reports.find((candidate) => candidate.id === report?.possibleDuplicateOf && !candidate.duplicateOf && candidate.status !== 'dismissed' && candidate.colonyId === report?.colonyId) : undefined
  const changed = report && draft ? (['colonyId', 'catId', 'careNote', 'urgent'] as const).some((key) => report[key] !== draft[key]) : false
  const reportLinksChanged = Boolean(report && draft && (report.colonyId !== draft.colonyId || report.catId !== draft.catId))
  const finishHint = !isClosed && changed ? 'Unsaved review changes' : ''
  const justSubmitted = report?.id === submittedReportId && submittedReportId !== null
  const reportId = report?.id
  const hasAnalysis = Boolean(reportId && analyses[reportId])
  const analysis = reportId ? analyses[reportId] : undefined
  const currentAnalysisState = analysisState?.reportId === reportId ? analysisState : null
  const analysisError = currentAnalysisState?.error ?? ''
  const analysisLoading = !analysis && (currentAnalysisState?.loading ?? true)
  const suggestionCount = analysis ? analysis.tasks.filter((item) => !reportTasks.some((task) => task.title.trim().toLocaleLowerCase() === item.title.trim().toLocaleLowerCase())).length + analysis.cats.length + analysis.colonies.length + analysis.duplicates.length : 0

  useEffect(() => {
    if (!open || !reportId || isClosed || !aiAnalysisEnabled || hasAnalysis) return
    const controller = new AbortController()
    setAnalysisState({ reportId, loading: true, error: '' })
    // Strict Mode can mount and immediately clean up effects in development.
    queueMicrotask(() => {
      if (controller.signal.aborted) return
      void analyzeReport(reportId, controller.signal).then((result) => {
        if (!controller.signal.aborted) {
          setAnalyses((items) => ({ ...items, [reportId]: result }))
          setReanalyzing((current) => current === reportId ? null : current)
        }
      }).catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setAnalysisState({ reportId, loading: false, error: cause instanceof Error ? cause.message : 'Could not analyze the report. Try again.' })
          setReanalyzing((current) => current === reportId ? null : current)
        }
      })
    })
    return () => controller.abort()
  }, [open, reportId, isClosed, aiAnalysisEnabled, hasAnalysis, analyzeReport, analysisRetry])

  useEffect(() => {
    setTaskNotice(null)
    setError('')
  }, [open, report?.id])

  useEffect(() => {
    if (!open && report && report.id === submittedReportId) clearSubmittedReport(report.id)
  }, [open, report, submittedReportId, clearSubmittedReport])

  useLayoutEffect(() => {
    const pending = pendingViewFocus.current
    if (!pending) return
    pendingViewFocus.current = null
    if (pending === 'action') {
      if (bodyRef.current) bodyRef.current.scrollTop = 0
      actionTitleRef.current?.focus({ preventScroll: true })
    } else if (pending === 'suggestions-return') {
      if (bodyRef.current) bodyRef.current.scrollTop = suggestionsScroll.current
      actionTitleRef.current?.focus({ preventScroll: true })
    } else {
      if (bodyRef.current) bodyRef.current.scrollTop = reviewScroll.current
      const trigger = pending === 'question' ? questionTrigger.current : pending === 'task' ? taskTrigger.current : pending === 'edit-task' ? editTriggers.current.get(editingTaskId ?? '') : pending === 'suggestions' ? suggestionsTrigger.current : duplicateTrigger.current
      const focusTarget = trigger ?? drawerRef.current
      focusTarget?.focus({ preventScroll: true })
    }
  }, [action, editingTaskId])

  function editDraft(update: Partial<ReviewDraft>) {
    if (!report || !draft) return
    setDrafts((items) => ({ ...items, [report.id]: { colonyId: draft.colonyId, catId: draft.catId, careNote: draft.careNote, urgent: draft.urgent, ...update } }))
  }

  function linkCreatedRecord(record: Cat | Colony) {
    if (isClosed) return
    editDraft('colonyId' in record ? { colonyId: record.colonyId, catId: record.id } : { colonyId: record.id, catId: '' })
  }

  function editActionDraft(update: Partial<ActionDraft>) {
    if (!report || !actionDraft) return
    setActionDrafts((items) => ({ ...items, [report.id]: { ...(items[report.id] ?? actionDraft), ...update } }))
  }

  function editTaskDraft(update: Partial<TaskActionDraft>) {
    if (action === 'edit-task' && editingTask) {
      setTaskEdits((items) => ({ ...items, [editingTask.id]: { ...(items[editingTask.id] ?? taskActionDraft(editingTask)), ...update } }))
    } else if (action === 'task' && suggestedTask?.reportId === report?.id) {
      setSuggestedTask((current) => current ? { ...current, draft: { ...current.draft, ...update } } : current)
    } else editActionDraft(update)
  }

  async function finishReview() {
    if (!report || !draft || saving) return
    setSaving(true); setError('')
    try {
      await finishReport(report.id, { ...draft, careNote: draft.careNote.trim() })
      setDrafts((items) => { const next = { ...items }; delete next[report.id]; return next })
      onNotice(`Review finished: ${report.title}. Find it under Reviewed.${reportTasks.some((task) => task.status === 'open') ? ' Linked care tasks remain open.' : ''}`)
      closeReview()
    } catch (error) { setError(error instanceof Error ? error.message : 'Could not save the review. Try again.') }
    finally { setSaving(false) }
  }

  async function dismiss() {
    if (!report || saving) return
    setSaving(true); setDismissing(true); setError('')
    try {
      await dismissReport(report.id)
      setDrafts((items) => { const next = { ...items }; delete next[report.id]; return next })
      onNotice(`Report dismissed: ${report.title}. Find it under Dismissed.${reportTasks.some((task) => task.status === 'open') ? ' Linked care tasks remain open.' : ''}`)
      closeReview()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not dismiss the report. Try again.') }
    finally { setSaving(false); setDismissing(false) }
  }

  async function reopen() {
    if (!report || saving) return
    setSaving(true); setError('')
    try { await reopenReport(report.id); setAnalyses((items) => { const next = { ...items }; delete next[report.id]; return next }); onNotice('Report returned to Needs review.'); closeReview() }
    catch (error) { setError(error instanceof Error ? error.message : 'Could not reopen the report. Try again.') }
    finally { setSaving(false) }
  }

  function closeReview() {
    if (justSubmitted && report) clearSubmittedReport(report.id)
    setAction(null)
    actionOrigin.current = 'report'
    setReanalyzing(null)
    onClose()
  }

  function openAction(next: Action, taskId?: string, suggestedTitle?: string, onCreated?: () => void) {
    if (action === 'suggestions') {
      suggestionsScroll.current = bodyRef.current?.scrollTop ?? 0
      actionOrigin.current = 'suggestions'
    } else {
      reviewScroll.current = bodyRef.current?.scrollTop ?? 0
      actionOrigin.current = 'report'
    }
    setError('')
    if (next === 'edit-task') setEditingTaskId(taskId ?? null)
    if (next === 'task') {
      suggestedTaskCreated.current = onCreated ?? null
      setSuggestedTask(suggestedTitle && report ? { reportId: report.id, draft: { taskTitle: suggestedTitle, taskOwner: canAssignToCurrentUser ? user.id : '', taskDue: '', taskAssociations: suggestedAssociations, taskAssociationDraft: emptyAssociationDraft() } } : null)
    }
    pendingViewFocus.current = 'action'
    setAction(next)
  }

  function returnToReview() {
    if (action !== 'suggestions' && actionOrigin.current === 'suggestions') {
      pendingViewFocus.current = 'suggestions-return'
      actionOrigin.current = 'report'
      setAction('suggestions')
    } else {
      pendingViewFocus.current = action
      actionOrigin.current = 'report'
      setAction(null)
    }
    setError('')
  }

  function compareDuplicate(target: DuplicateReport) {
    if (!report) return
    setChosenDuplicate({ sourceId: report.id, report: target })
    editActionDraft({ duplicateId: target.id })
    openAction('duplicate')
  }

  function restoreFocus() {
    // Resolve after row removal. Focus the table itself, rather than its first control.
    queueMicrotask(() => finalFocus()?.focus({ preventScroll: true }))
    return false
  }

  async function submitAction(event: FormEvent) {
    event.preventDefault()
    if (!report || !actionDraft || saving) return
    setSaving(true); setError('')
    try {
    if (action === 'question' && actionDraft.question.trim()) {
      await askQuestion(report.id, actionDraft.question.trim())
      editActionDraft({ question: '' })
      onNotice('Question added. Report moved to Waiting for details.')
      closeReview()
    } else if (action === 'task' && activeTaskDraft?.taskTitle.trim() && validTaskOwner) {
      const pending = pendingAssociation(activeTaskDraft.taskAssociationDraft, activeTaskDraft.taskAssociations, data)
      await createTask({ reportId: report.id, title: activeTaskDraft.taskTitle.trim(), ownerId: activeTaskDraft.taskOwner, due: activeTaskDraft.taskDue, associations: pending ? [...activeTaskDraft.taskAssociations, pending] : activeTaskDraft.taskAssociations })
      if (suggestedTask?.reportId === report.id) { suggestedTaskCreated.current?.(); suggestedTaskCreated.current = null; setSuggestedTask(null) }
      else editActionDraft({ taskTitle: '', taskOwner: '', taskDue: '', taskAssociations: [], taskAssociationDraft: emptyAssociationDraft() })
      const count = reportTasks.length + 1
      setTaskNotice({ reportId: report.id, text: `Care task created. ${count} ${count === 1 ? 'task' : 'tasks'} linked to this report.` })
    } else if (action === 'edit-task' && editingTask && editingDraft?.taskTitle.trim() && validTaskOwner) {
      const pending = pendingAssociation(editingDraft.taskAssociationDraft, editingDraft.taskAssociations, data)
      await editTask(editingTask.id, { reportId: report.id, title: editingDraft.taskTitle.trim(), ownerId: editingDraft.taskOwner, due: editingDraft.taskDue, associations: pending ? [...editingDraft.taskAssociations, pending] : editingDraft.taskAssociations })
      setTaskEdits((items) => { const next = { ...items }; delete next[editingTask.id]; return next })
      setTaskNotice({ reportId: report.id, text: 'Task updated.' })
    } else if (action === 'duplicate' && duplicateChoice) {
      await linkDuplicate(report.id, duplicateChoice.id)
      onNotice('Duplicate linked. Both original submissions have been kept.')
      closeReview()
    } else return
    if (action === 'task' || action === 'edit-task') returnToReview()
    } catch (error) { setError(error instanceof Error ? error.message : 'Could not save the change. Try again.') }
    finally { setSaving(false) }
  }

  async function approveSuggestedTask(title: string) {
    if (!report || saving) throw new Error('The task could not be created. Try again.')
    setSaving(true)
    try {
      await createTask({ reportId: report.id, title, ownerId: user.id, due: '', associations: suggestedAssociations })
      const count = reportTasks.length + 1
      setTaskNotice({ reportId: report.id, text: `Care task created. ${count} ${count === 1 ? 'task' : 'tasks'} linked to this report.` })
    } finally { setSaving(false) }
  }

  const backLabel = `Back to ${action !== 'suggestions' && actionOrigin.current === 'suggestions' ? 'suggestions' : 'report'}`
  const actionDescription = !report ? '' : action === 'suggestions' ? report.title : action === 'question' ? `Add a question for ${report.reporter}. This moves the report to Waiting for details.` : action === 'task' ? 'Assign the next care action. The task stays open after the review is finished.' : action === 'edit-task' ? 'Update the task and its related items. The report remains linked.' : 'Compare the reports before linking. Both original submissions will be kept.'

  return <Drawer open={open && report !== null} onOpenChange={(next, event) => { if (!next) { if (saving) event.cancel(); else if (action && event.reason === 'escape-key') { event.cancel(); returnToReview() } else closeReview() } }}>
    <DrawerContent ref={drawerRef} closeDisabled={saving} closeLabel="Close report" motion={justSubmitted ? 'none' : 'default'} finalFocus={restoreFocus} initialFocus={drawerRef}>
      {report && draft ? <>
        {action ? <DrawerHeader density="compact" className="pr-6">
          <div className="flex min-h-11 min-w-0 items-center gap-2 pr-10">
            <Button type="button" variant="ghost" size="icon" disabled={saving} aria-label={backLabel} onClick={returnToReview}><ArrowLeft aria-hidden="true" /></Button>
            <DialogTitle id={action === 'suggestions' ? 'report-suggestions-title' : undefined} ref={actionTitleRef} size="card" tabIndex={-1}>{action === 'suggestions' ? 'AI suggestions' : action === 'question' ? 'Ask for details' : action === 'task' ? 'Create a care task' : action === 'edit-task' ? 'Edit task' : 'Link duplicate report'}</DialogTitle>
          </div>
          <DialogDescription className="sr-only">{actionDescription}</DialogDescription>
        </DrawerHeader> : <DrawerHeader density="compact" className="pr-6">
          <DialogTitle size="card" className="flex min-h-11 items-center pr-10">Report</DialogTitle>
          <DialogDescription className="sr-only">{justSubmitted ? 'Report added. ' : ''}{report.title}. {report.anonymous && !report.contact ? 'Submitted anonymously' : `Reported by ${report.reporter}`}. {dateFormat.format(new Date(report.submittedAt))}.</DialogDescription>
        </DrawerHeader>}
        <DrawerBody ref={bodyRef} key={report.id}>
          {action ? <div className="space-y-4"><Text size="small" tone="muted">{actionDescription}</Text>{actionTaskContext ? <TaskRecordContextSummary context={actionTaskContext} /> : <DrawerContext><DrawerContextValue label="Colony" value={action === 'duplicate' ? savedColonyName : colonyName} /><DrawerContextValue label="Cat" value={action === 'duplicate' ? savedCatName : catName} /></DrawerContext>}</div> : null}
          {action === 'suggestions' ? <>
            {taskNotice?.reportId === report.id ? <Text role="status" size="small">{taskNotice.text}</Text> : null}
            <ReportSuggestions key={report.id} colonyId={draft.colonyId} assignee={canAssignToCurrentUser ? user.name : null} relatedItems={suggestedAssociations.map((item) => `${item.type === 'colony' ? 'Colony' : 'Cat'}: ${associationLabel(item, data)}`)} existingTaskTitles={reportTasks.map((task) => task.title)} result={analysis} error={analysisError} loading={analysisLoading} reanalyzing={reanalyzing === report.id} onFocusHeading={() => actionTitleRef.current?.focus({ preventScroll: true })} onRetry={() => setAnalysisRetry((value) => value + 1)} onReanalyze={() => { setReanalyzing(report.id); setAnalysisState({ reportId: report.id, loading: true, error: '' }); setAnalyses((items) => { const next = { ...items }; delete next[report.id]; return next }) }} onRemove={(kind, item) => setAnalyses((items) => { const current = items[report.id]; return current ? { ...items, [report.id]: { ...current, [kind]: current[kind].filter((suggestion) => suggestion !== item) } } : items })} onDismissDuplicate={(id) => setAnalyses((items) => { const current = items[report.id]; return current ? { ...items, [report.id]: { ...current, duplicates: current.duplicates.filter((item) => item.report.id !== id) } } : items })} onCompareDuplicate={compareDuplicate} onApproveTask={approveSuggestedTask} onCreateTask={() => openAction('task')} onCreateRecord={linkCreatedRecord} onTask={(title, onCreated) => openAction('task', undefined, title, onCreated)} onCat={(cat) => { if (!draft.catId && (!draft.colonyId || draft.colonyId === cat.colonyId)) editDraft({ colonyId: cat.colonyId, catId: cat.id }) }} onColony={(colony) => { if (!draft.colonyId) editDraft({ colonyId: colony.id }) }} />
          </> : action ? <form id={actionFormId} onSubmit={submitAction} className="space-y-6">
            {action === 'question' ? <div className="grid gap-2"><Label htmlFor="report-question">Question</Label><Textarea id="report-question" required maxLength={2000} value={actionDraft?.question ?? ''} onChange={(event) => editActionDraft({ question: event.target.value })} placeholder="What do you need to know?" /></div> : null}
            {action === 'task' || action === 'edit-task' ? <>
              {reportLinksChanged ? <Text size="small" tone="muted">Report links update when you save the review.</Text> : null}
              <div className="grid gap-2"><Label htmlFor="task-title">What needs to happen?</Label><Input id="task-title" disabled={saving} required maxLength={160} value={activeTaskDraft?.taskTitle ?? ''} onChange={(event) => editTaskDraft({ taskTitle: event.target.value })} /></div>
              <div className="grid gap-2"><Label htmlFor="task-owner">Assign to</Label><SelectField id="task-owner" disabled={saving} required value={activeTaskDraft?.taskOwner ?? ''} onChange={(event) => editTaskDraft({ taskOwner: event.target.value })}><option value="">Choose a team member</option>{action === 'edit-task' && editingTask && !members.some((member) => member.id === editingTask.ownerId) ? <option value={editingTask.ownerId}>{editingTask.owner} (current assignee)</option> : null}{members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</SelectField>{!members.length ? <Text size="caption" tone="muted">No team members are available for new tasks. Ask an administrator to enable task assignments.</Text> : null}</div>
              <div className="grid gap-2"><Label htmlFor="task-due">Due date (optional)</Label><Input id="task-due" disabled={saving} type="date" value={activeTaskDraft?.taskDue ?? ''} onChange={(event) => editTaskDraft({ taskDue: event.target.value })} /></div>
              {actionTaskContext ? <TaskRecordContextDetails context={actionTaskContext} /> : null}
              <TaskAssociations disabled={saving} value={activeTaskDraft?.taskAssociations ?? []} onChange={(taskAssociations) => editTaskDraft({ taskAssociations })} data={data} draft={activeTaskDraft?.taskAssociationDraft ?? emptyAssociationDraft()} onDraftChange={(taskAssociationDraft) => editTaskDraft({ taskAssociationDraft })} />
            </> : null}
            {action === 'duplicate' ? <>
              {report.colonyId !== draft.colonyId ? <Text size="small" tone="muted">Search uses the saved colony. Save the review and reopen it to search another colony.</Text> : null}
              <DuplicateReportSearch key={report.id} reportId={report.id} source={{ id: report.id, title: report.title, message: report.message, reporter: report.reporter, submittedAt: report.submittedAt, cat: savedCatName === 'Unconfirmed' ? '' : savedCatName }} selected={duplicateChoice} disabled={saving} onSelect={(target) => { setChosenDuplicate({ sourceId: report.id, report: target }); editActionDraft({ duplicateId: target.id }) }} />
              <Text size="small" tone="muted">Linking finishes this review. Cat records stay separate.</Text>
              {changed ? <Text size="small" tone="muted">Your review draft will be kept if you reopen this report.</Text> : null}
            </> : null}
            {error ? <Alert>{error}</Alert> : null}
          </form> : <>
          <fieldset disabled={saving} className="min-w-0 space-y-6">
          <section aria-labelledby="original-report-title" className="space-y-3">
            <Heading id="original-report-title" level={3} size="compact">Original report</Heading>
            {justSubmitted ? <Text size="caption" tone="muted">Report added.</Text> : null}
            <Text size="small" weight="medium" className="wrap-anywhere">{report.title}</Text>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <Text size="caption" tone="muted">{report.category}</Text>
              {isClosed && report.urgent ? <Text size="caption" tone="danger" weight="medium">Urgent</Text> : null}
              <Text size="caption" tone="muted">{reportStatusLabels[report.status]}</Text>
            </div>
            <Text size="caption" tone="muted" className="flex flex-wrap gap-x-3"><span>{report.anonymous && !report.contact ? 'Submitted anonymously' : `Reported by ${report.reporter}`}</span><time dateTime={report.submittedAt}>{dateFormat.format(new Date(report.submittedAt))}</time></Text>
            <Text size="small" className="whitespace-pre-wrap wrap-anywhere">{report.message}</Text>
            {report.mapLocation ? <TextLink href={report.mapLocation.type === 'pin'
              ? `https://www.openstreetmap.org/?mlat=${report.mapLocation.latitude}&mlon=${report.mapLocation.longitude}#map=17/${report.mapLocation.latitude}/${report.mapLocation.longitude}`
              : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(report.title)}&query_place_id=${encodeURIComponent(report.mapLocation.placeId)}`} target="_blank" rel="noreferrer">Open location on map</TextLink> : null}
            {report.attachments.length ? <Text size="caption" tone="muted">{report.attachments.length} {report.attachments.length === 1 ? 'attachment' : 'attachments'} below</Text> : null}
          </section>
          {report.contact ? <><Separator /><section aria-labelledby="report-contact-title" className="space-y-3">
            <Heading id="report-contact-title" level={3} size="compact">Follow-up contact</Heading>
            <Text size="small" tone="muted">The sender allowed the care team to contact them about this report. Calls and emails are handled outside Mews.</Text>
            {report.contact.phone ? <div><Text size="small" weight="medium">Phone</Text><TextLink href={`tel:${report.contact.phone.replace(/[^\d+]/g, '')}`}>{report.contact.phone}</TextLink></div> : null}
            {report.contact.email ? <div className="min-w-0"><Text size="small" weight="medium">Email</Text><TextLink className="wrap-anywhere" href={`mailto:${encodeURIComponent(report.contact.email)}`}>{report.contact.email}</TextLink></div> : null}
          </section></> : null}
          {report.attachments.length ? <><Separator /><section aria-labelledby="report-attachments-title" className="space-y-3"><Heading id="report-attachments-title" level={3} size="compact">Attachments</Heading><ReportAttachments attachments={report.attachments} onOpenPhoto={setPhoto} /></section></> : null}
          <Separator />
          {!isClosed && aiAnalysisEnabled ? <>
            <Card render={<section aria-labelledby="report-suggestions-summary" />} size="sm" tone="subtle">
              <CardContent className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <Heading id="report-suggestions-summary" level={3} size="compact">AI suggestions</Heading>
                  {analysisLoading ? <div role="status" className="flex items-center gap-3"><LoadingIndicator decorative /><Text size="small" tone="muted">Preparing suggestions…</Text></div> : <Text role="status" size="small" tone="muted">{analysisError ? 'Suggestions are unavailable.' : suggestionCount ? `${suggestionCount} ${suggestionCount === 1 ? 'suggestion' : 'suggestions'} to review` : 'No suggestions to review.'}</Text>}
                </div>
                <Button ref={suggestionsTrigger} variant="outline" size="sm" onClick={() => openAction('suggestions')}>{suggestionCount ? 'Review AI suggestions' : 'View AI analysis'}</Button>
              </CardContent>
            </Card>
            <Separator />
          </> : null}
          <section aria-labelledby="review-details-title" className="space-y-4">
            <Heading id="review-details-title" level={3} size="card">{report.status === 'dismissed' ? 'Report details' : isClosed ? 'Reviewed details' : 'Review details'}</Heading>
            <DrawerContext>{isClosed ? <>
            <DrawerContextValue label="Colony" value={colonyName} />
            <DrawerContextValue label="Cat" value={catName} />
          </> : <>
            <DrawerContextField><Label htmlFor="report-colony">Colony (optional)</Label><SelectField id="report-colony" disabled={saving} value={draft.colonyId} onChange={(event) => editDraft({ colonyId: event.target.value, catId: '' })}><option value="">Colony unknown</option>{data.colonies.map((colony) => <option key={colony.id} value={colony.id}>{colony.name}</option>)}</SelectField></DrawerContextField>
            <DrawerContextField><Label htmlFor="report-cat">Cat (optional)</Label><SelectField id="report-cat" value={draft.catId} disabled={saving} onChange={(event) => editDraft({ catId: event.target.value })}><option value="">Unconfirmed</option>{matchingCats.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}{cat.colonyId !== draft.colonyId ? ' (not currently in this colony)' : ''}</option>)}</SelectField></DrawerContextField>
          </>}</DrawerContext>
            {finishHint ? <Text id="review-finish-hint" size="caption" tone="muted" role="status">{finishHint}</Text> : null}
            {report.duplicateOf ? <Card size="sm"><CardContent className="space-y-1"><Text size="label">Linked as a duplicate</Text><Text size="small">{duplicateTarget?.title ?? 'Existing report'}</Text></CardContent></Card> : null}
            {isClosed ? report.careNote.trim() && report.careNote.trim() !== report.message.trim() ?
              <dl><div className="space-y-1"><Text render={<dt />} size="caption" tone="muted">Care note</Text><Text render={<dd />} size="small" className="whitespace-pre-wrap wrap-anywhere">{report.careNote}</Text></div></dl> : null : <>
              <div className="flex items-center gap-3"><Checkbox id="report-urgent" checked={draft.urgent} onCheckedChange={(checked) => editDraft({ urgent: checked === true })} /><Label htmlFor="report-urgent">Needs urgent attention</Label></div>
              <Disclosure title="Care note (optional)" open={openCareNotes[report.id] ?? Boolean(report.careNote.trim() && report.careNote.trim() !== report.message.trim())} onToggle={(event) => { const opened = event.currentTarget.open; setOpenCareNotes((items) => ({ ...items, [report.id]: opened })) }}>
                <div className="grid gap-2"><Label htmlFor="report-care-note">Care note</Label><Textarea id="report-care-note" maxLength={4000} value={draft.careNote} onChange={(event) => editDraft({ careNote: event.target.value })} placeholder="Add details for the team" /></div>
              </Disclosure>
            </>}
            <div className="space-y-2"><Text size="label">Add a related record</Text><div className="flex flex-wrap gap-2"><NewRecordButton kind="cat" variant="outline" colonyId={draft.colonyId} onCreated={linkCreatedRecord} /><NewRecordButton kind="colony" variant="outline" onCreated={linkCreatedRecord} /></div><Text size="caption" tone="muted">{isClosed ? 'Reopen this report to change its linked records.' : 'New records are linked when you save the review.'}</Text></div>
          </section>
          <Separator />
          <section aria-labelledby="care-tasks-title" className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2"><Heading id="care-tasks-title" level={3} size="compact">Care tasks{reportTasks.length ? ` (${reportTasks.length})` : ''}</Heading><Button ref={taskTrigger} variant="outline" size="sm" onClick={() => openAction('task')}>Create task</Button></div>
            {resolvedTasks.length ? <ul className="divide-y divide-border">{resolvedTasks.map((task) => {
              const completed = task.status === 'completed'
              const canManage = task.ownerId === user.id || user.role === 'administrator'
              return <li key={task.id} className="space-y-1 py-3 first:pt-0 last:pb-0">
                <Text size="small" weight="medium" className="wrap-anywhere">{task.title}</Text>
                <Text size="caption" tone="muted">{completed ? 'Completed task' : 'Open task'} assigned to {task.owner}</Text>
                {task.due ? <Text size="caption" tone="muted">Due {dueFormat.format(new Date(`${task.due}T00:00:00Z`))}</Text> : null}
                {task.associations.map((item, index) => <Text key={`${item.type}-${index}`} size="caption" tone="muted" className="wrap-anywhere">{item.type[0]!.toUpperCase() + item.type.slice(1)}: {associationLabel(item, data)}</Text>)}
                <div className="flex flex-wrap items-center gap-1">
                  <Button variant="ghost" size="sm" render={<Link {...taskLink(task.id, `report-task:${task.id}`)} />} aria-label={`View task: ${task.title}`}>View task</Button>
                  {canManage ? <><Button ref={(element) => { if (element) editTriggers.current.set(task.id, element); else editTriggers.current.delete(task.id) }} variant="ghost" size="sm" aria-label={`Edit task: ${task.title}`} onClick={() => openAction('edit-task', task.id)}>Edit</Button>
                  <TaskStatusButton task={task} loading={pendingTaskIds.has(task.id)} onStatusChange={changeTaskStatus} /></> : null}
                </div>
              </li>
            })}</ul> : null}
            <Text role="status" size="small" className={taskNotice?.reportId === report.id ? undefined : 'sr-only'}>{taskNotice?.reportId === report.id ? taskNotice.text : ''}</Text>
          </section>
          {report.thread.length ? <><Separator /><section aria-labelledby="conversation-title" className="space-y-4"><Heading id="conversation-title" level={3} size="compact">Conversation</Heading><ol className="space-y-4">{report.thread.map((entry) => <li key={entry.id} className="space-y-1"><Text size="small" weight="medium">{entry.author}</Text><Text size="small" className="whitespace-pre-wrap wrap-anywhere">{entry.text}</Text></li>)}</ol></section></> : null}
          {canLinkDuplicate ? <><Separator /><div className="space-y-2">{suggestedDuplicate ? <><Text size="label">Possible duplicate</Text><Text size="small">{suggestedDuplicate.title}</Text></> : null}<Button ref={duplicateTrigger} variant="link" size="sm" onClick={() => openAction('duplicate')}>{suggestedDuplicate ? 'Compare and link reports' : 'Link as a duplicate'}</Button></div></> : null}
          {report.history.length ? <><Separator /><Disclosure title="Review history"><ol className="space-y-3">{report.history.map((entry, index) => <li key={`${index}-${entry}`}><Text size="small" tone="muted">{entry}</Text></li>)}</ol></Disclosure></> : null}
          </fieldset>
          </>}
        </DrawerBody>
        {action !== 'suggestions' ? <DrawerFooter layout={action ? 'actions' : 'stack'}>
          {action ? <Button type="submit" form={actionFormId} loading={saving} disabled={action === 'question' ? !actionDraft?.question.trim() : action === 'task' || action === 'edit-task' ? !activeTaskDraft?.taskTitle.trim() || !validTaskOwner : !duplicateChoice}>{action === 'question' ? 'Add question and wait' : action === 'task' ? 'Create task' : action === 'edit-task' ? 'Save task' : 'Link and finish'}</Button> : <>
          {error && !action ? <Alert>{error}</Alert> : null}
          {isClosed ? <Button variant="outline" loading={saving} onClick={reopen}><RotateCcw aria-hidden="true" />Reopen report</Button> : <>

            <div className="grid gap-2 min-[360px]:grid-cols-2">
              {report.anonymous ? <Text size="caption" tone="muted">{report.contact ? 'Use the follow-up contact details to ask the sender a question.' : 'The sender cannot receive questions.'}</Text> : <Button ref={questionTrigger} variant="outline" disabled={saving} onClick={() => openAction('question')}>Ask for details</Button>}
              <Button onClick={finishReview} loading={saving && !dismissing} disabled={dismissing} aria-describedby={finishHint ? 'review-finish-hint' : undefined}><Check aria-hidden="true" />Save and finish</Button>
            </div>
            <Button variant="ghost" loading={dismissing} disabled={saving && !dismissing} onClick={dismiss}>Dismiss report</Button>
          </>}
          </>}
        </DrawerFooter> : null}
      </> : null}
    </DrawerContent>
    <Dialog open={photo !== null} onOpenChange={(next) => { if (!next) setPhoto(null) }}><DialogContent size="wide"><DialogHeader><DialogTitle>Report photo</DialogTitle><DialogDescription>{photo?.name}</DialogDescription></DialogHeader>{photo ? <img src={photo.url} alt={photo.name} className="max-h-[65dvh] w-full object-contain" /> : null}</DialogContent></Dialog>
  </Drawer>
}
