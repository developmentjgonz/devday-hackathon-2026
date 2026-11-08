import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { LoadingIndicator } from '@/components/ui/loading-indicator'
import { Heading, Text } from '@/components/ui/typography'
import { NewRecordButton } from '@/features/colonies/components/new-record-button'
import type { ReportAnalysis } from '../../../../shared/schemas/report-analysis'
import type { Cat, Colony } from '../../../../shared/types/directory'
import type { DuplicateReport } from '../../../../shared/types/workspace'

type Suggestion = ReportAnalysis['tasks'][number] | ReportAnalysis['cats'][number]

export function ReportSuggestions({ colonyId, assignee, relatedItems, existingTaskTitles, result, error, loading, reanalyzing, onFocusHeading, onRetry, onReanalyze, onRemove, onDismissDuplicate, onCompareDuplicate, onApproveTask, onTask, onCreateTask, onCreateRecord, onCat, onColony }: {
  colonyId: string
  assignee: string | null
  relatedItems: string[]
  existingTaskTitles: string[]
  result?: ReportAnalysis
  error: string
  loading: boolean
  reanalyzing: boolean
  onFocusHeading: () => void
  onRetry: () => void
  onReanalyze: () => void
  onRemove: (kind: 'tasks' | 'cats' | 'colonies', item: Suggestion) => void
  onDismissDuplicate: (reportId: string) => void
  onCompareDuplicate: (report: DuplicateReport) => void
  onApproveTask: (title: string) => Promise<void>
  onTask: (title: string, onCreated: () => void) => void
  onCreateTask: () => void
  onCreateRecord: (record: Cat | Colony) => void
  onCat: (cat: Cat) => void
  onColony: (colony: Colony) => void
}) {
  const [approving, setApproving] = useState<string | null>(null)
  const [approvalError, setApprovalError] = useState('')
  const [recordNotice, setRecordNotice] = useState('')
  const tasks = result?.tasks.filter((item) => !existingTaskTitles.some((title) => title.trim().toLocaleLowerCase() === item.title.trim().toLocaleLowerCase())) ?? []
  const hasSuggestions = result && (tasks.length || result.cats.length || result.colonies.length || result.duplicates.length)

  function dismiss(kind: 'tasks' | 'cats' | 'colonies', item: Suggestion) {
    onFocusHeading()
    onRemove(kind, item)
  }

  async function approveTask(item: ReportAnalysis['tasks'][number]) {
    if (approving) return
    setApproving(item.title)
    setApprovalError('')
    try {
      await onApproveTask(item.title)
      dismiss('tasks', item)
    } catch (cause) {
      setApprovalError(cause instanceof Error ? cause.message : 'Could not create the task. Try again.')
    } finally { setApproving(null) }
  }

  return <section aria-labelledby="report-suggestions-title" className="space-y-4">
    <Text size="caption" tone="muted">Report details, supported attachments, and related reports are sent to OpenAI for analysis.</Text>
    {result || reanalyzing ? <Button variant="outline" size="sm" loading={reanalyzing && loading} disabled={approving !== null} onClick={onReanalyze}>Analyze again</Button> : null}
    {!result && loading && !reanalyzing ? <div role="status" className="flex items-center gap-3"><LoadingIndicator decorative /><Text size="small" tone="muted">Preparing suggestions…</Text></div> : null}
    {error ? <div className="space-y-3"><Alert>{error}</Alert><Button variant="outline" size="sm" onClick={onRetry}>Try again</Button></div> : null}
    {approvalError ? <Alert>{approvalError}</Alert> : null}
    <Text role="status" size="small" className={recordNotice ? undefined : 'sr-only'}>{recordNotice}</Text>
    {result ? <div className="space-y-4" aria-live="polite">
      {result.skippedAttachments.length ? <Alert>Some attachments could not be fully analyzed: {result.skippedAttachments.map((item) => `${item.name} — ${item.reason}`).join(' ')}</Alert> : null}
      {!hasSuggestions ? <EmptyState icon={<CheckCircle2 />} title="No suggestions" description="There are no suggestions to review." /> : null}
      {result.duplicates.length ? <div className="space-y-3"><Heading level={3} size="compact">Possible duplicate reports</Heading><ul className="space-y-3">{result.duplicates.map(({ report, reason }) => <li key={report.id}><Card size="sm"><CardContent className="space-y-2"><Text size="small" weight="medium" className="wrap-anywhere">{report.title}</Text><Text size="small" tone="muted" className="wrap-anywhere">{reason}</Text><div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" disabled={approving !== null} aria-label={`Compare duplicate: ${report.title}`} onClick={() => onCompareDuplicate(report)}>Compare reports</Button><Button variant="ghost" size="sm" disabled={approving !== null} aria-label={`Dismiss duplicate: ${report.title}`} onClick={() => { onFocusHeading(); onDismissDuplicate(report.id) }}>Dismiss</Button></div></CardContent></Card></li>)}</ul></div> : null}
      {tasks.length ? <div className="space-y-3"><Heading level={3} size="compact">Possible tasks</Heading><ul className="space-y-3">{tasks.map((item, index) => <li key={`${index}-${item.title}`}><Card size="sm"><CardContent className="space-y-2"><Text size="small" weight="medium" className="wrap-anywhere">{item.title}</Text><Text size="small" tone="muted" className="wrap-anywhere">{item.reason}</Text><Text size="caption" tone="muted" className="wrap-anywhere">{assignee ? `Assigned to ${assignee}` : 'Choose an assignee'} · No due date{relatedItems.length ? ` · ${relatedItems.join(' · ')}` : ''}</Text><div className="flex flex-wrap gap-2">{assignee ? <Button size="sm" loading={approving === item.title} disabled={approving !== null} aria-label={`Approve task: ${item.title}`} onClick={() => void approveTask(item)}>Approve task</Button> : null}<Button variant="outline" size="sm" disabled={approving !== null} aria-label={`Edit task: ${item.title}`} onClick={() => onTask(item.title, () => onRemove('tasks', item))}>{assignee ? 'Edit' : 'Choose assignee'}</Button><Button variant="ghost" size="sm" disabled={approving !== null} aria-label={`Dismiss task: ${item.title}`} onClick={() => dismiss('tasks', item)}>Dismiss</Button></div></CardContent></Card></li>)}</ul></div> : null}
      {result.cats.length ? <div className="space-y-3"><Heading level={3} size="compact">Possible cats</Heading><ul className="space-y-3">{result.cats.map((item, index) => <li key={`${index}-${item.details}`}><Card size="sm"><CardContent className="space-y-2">{item.name ? <Text size="small" weight="medium" className="wrap-anywhere">{item.name}</Text> : null}<Text size="small" className="wrap-anywhere">{item.details}</Text><Text size="small" tone="muted" className="wrap-anywhere">{item.reason}</Text><div className="flex flex-wrap gap-2"><NewRecordButton kind="cat" variant="outline" notifyOnCreate={false} disabled={approving !== null} colonyId={colonyId} suggestedName={item.name} suggestedDescription={item.details} triggerLabel={`Add cat: ${item.name || item.details}`} onCreated={(record) => { if ('colonyId' in record) { onCat(record); setRecordNotice(`Cat added: ${record.name}.`); dismiss('cats', item) } }} /><Button variant="ghost" size="sm" disabled={approving !== null} aria-label={`Dismiss cat: ${item.name || item.details}`} onClick={() => dismiss('cats', item)}>Dismiss</Button></div></CardContent></Card></li>)}</ul></div> : null}
      {result.colonies.length ? <div className="space-y-3"><Heading level={3} size="compact">Possible colonies</Heading><ul className="space-y-3">{result.colonies.map((item, index) => <li key={`${index}-${item.details}`}><Card size="sm"><CardContent className="space-y-2">{item.name ? <Text size="small" weight="medium" className="wrap-anywhere">{item.name}</Text> : null}<Text size="small" className="wrap-anywhere">{item.details}</Text><Text size="small" tone="muted" className="wrap-anywhere">{item.reason}</Text><div className="flex flex-wrap gap-2"><NewRecordButton kind="colony" variant="outline" notifyOnCreate={false} disabled={approving !== null} suggestedName={item.name} triggerLabel={`Add colony: ${item.name || item.details}`} onCreated={(record) => { if (!('colonyId' in record)) { onColony(record); setRecordNotice(`Colony added: ${record.name}.`); dismiss('colonies', item) } }} /><Button variant="ghost" size="sm" disabled={approving !== null} aria-label={`Dismiss colony: ${item.name || item.details}`} onClick={() => dismiss('colonies', item)}>Dismiss</Button></div></CardContent></Card></li>)}</ul></div> : null}
    </div> : null}
    {!tasks.length || !result?.cats.length || !result?.colonies.length ? <section aria-labelledby="report-other-actions-title" className="space-y-3">
      <Heading id="report-other-actions-title" level={3} size="compact">Other actions</Heading>
      <div className="flex flex-wrap gap-2">
        {!result?.cats.length ? <NewRecordButton kind="cat" variant="outline" disabled={approving !== null} colonyId={colonyId} onCreated={onCreateRecord} /> : null}
        {!tasks.length ? <Button variant="outline" size="sm" disabled={approving !== null} onClick={onCreateTask}>Create task</Button> : null}
        {!result?.colonies.length ? <NewRecordButton kind="colony" variant="outline" disabled={approving !== null} onCreated={onCreateRecord} /> : null}
      </div>
      {!result?.cats.length || !result?.colonies.length ? <Text size="caption" tone="muted">New records are linked when you save the review.</Text> : null}
    </section> : null}
  </section>
}
