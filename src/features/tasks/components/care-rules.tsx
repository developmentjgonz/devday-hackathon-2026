import { useId, useRef, useState, type FormEvent } from 'react'
import { CalendarClock, Pause, Play, Plus } from 'lucide-react'
import { useRouteLoaderData } from 'react-router'
import { DiscardOnNavigation } from '@/components/layout/discard-on-navigation'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { DiscardChangesDialog, useDiscardConfirmation } from '@/components/ui/discard-changes-dialog'
import { Drawer, DrawerBody, DrawerContent, DrawerContext, DrawerContextValue, DrawerFooter, DrawerHeader } from '@/components/ui/drawer'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SelectField } from '@/components/ui/select-field'
import { toast } from '@/components/ui/toaster'
import { Heading, Text } from '@/components/ui/typography'
import { useInbox } from '@/features/inbox/inbox-context'
import { formatTaskDue } from '@/features/tasks/task-data'
import type { WorkspaceData } from '../../../../shared/types/directory'
import type { CareRule } from '../../../../shared/types/workspace'

type Draft = { title: string; ownerId: string; amount: string; unit: 'days' | 'weeks'; startDate: string }
function today() {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
function draftFor(rule: CareRule | undefined, currentUser: string): Draft {
  const weeks = Boolean(rule && rule.repeatDays % 7 === 0)
  return { title: rule?.title ?? '', ownerId: rule?.ownerId ?? currentUser, amount: String(rule ? rule.repeatDays / (weeks ? 7 : 1) : 1), unit: weeks ? 'weeks' : 'days', startDate: rule?.startDate ?? today() }
}
function frequency(days: number) {
  if (days === 1) return 'Every day'
  if (days === 7) return 'Every week'
  if (days % 7 === 0) return `Every ${days / 7} weeks`
  return `Every ${days} days`
}

function CareRuleEditor({ recordType, recordId, recordName, currentUser, rule }: { recordType: 'cat' | 'colony'; recordId: string; recordName: string; currentUser: string; rule?: CareRule }) {
  const { data, members, createCareRule, editCareRule } = useInbox()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<Draft>(() => draftFor(rule, currentUser))
  const initial = useRef(draft)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const trigger = useRef<HTMLButtonElement>(null)
  const fieldId = useId()
  const defaultOwner = members.some((member) => member.id === currentUser) ? currentUser : ''
  const cat = recordType === 'cat' ? data.cats.find((item) => item.id === recordId) : undefined
  const colonyName = recordType === 'colony' ? recordName : data.colonies.find((item) => item.id === cat?.colonyId)?.name ?? 'No colony'
  const hasChanges = open && JSON.stringify(draft) !== JSON.stringify(initial.current)
  const discard = useDiscardConfirmation(hasChanges)
  const amount = Number(draft.amount)
  const repeatDays = amount * (draft.unit === 'weeks' ? 7 : 1)
  const valid = Boolean(draft.title.trim() && draft.startDate && members.some((member) => member.id === draft.ownerId) && Number.isInteger(amount) && amount > 0 && repeatDays <= 365)
  function update<K extends keyof Draft>(key: K, value: Draft[K]) { setDraft((current) => ({ ...current, [key]: value })) }
  function begin() {
    const next = draftFor(rule, defaultOwner)
    initial.current = next
    setDraft(next)
    setError('')
    setOpen(true)
  }
  function close() { discard.requestDiscard(() => setOpen(false)) }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!valid || saving) return
    setSaving(true); setError('')
    try {
      const input = { title: draft.title.trim(), ownerId: draft.ownerId, recordType, recordId, repeatDays, startDate: draft.startDate }
      if (rule) await editCareRule(rule.id, input)
      else await createCareRule(input)
      setOpen(false)
      toast.success(rule ? 'Care rule updated' : 'Care rule created', { description: input.title })
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save the care rule. Try again.') }
    finally { setSaving(false) }
  }
  return <>
    <Button ref={trigger} size="sm" variant={rule ? 'ghost' : 'outline'} onClick={begin} aria-label={rule ? `Edit care rule: ${rule.title}` : undefined}>{rule ? 'Edit' : <><Plus aria-hidden="true" />Add care rule</>}</Button>
    <Drawer open={open} onOpenChange={(next, event) => { if (!next) { if (saving || hasChanges) event.cancel(); if (!saving) close() } }}>
      <DrawerContent render={<form onSubmit={save} />} closeLabel="Close care rule" closeDisabled={saving} finalFocus={() => trigger.current}>
        <DrawerHeader density="compact" className="pr-6">
          <DialogTitle size="card" className="flex min-h-11 items-center pr-10">{rule ? 'Edit care rule' : 'Add care rule'}</DialogTitle>
          <DialogDescription className="sr-only">Create repeating tasks for {recordName}.</DialogDescription>
        </DrawerHeader>
        <DrawerBody>
          <DrawerContext><DrawerContextValue label="Colony" value={colonyName} />{recordType === 'cat' ? <DrawerContextValue label="Cat" value={recordName} /> : null}</DrawerContext>
          <Text size="small" tone="muted">Add separate rules for different visits, such as morning and evening feeding.</Text>
          <fieldset disabled={saving} className="grid min-w-0 gap-5">
            <div className="grid gap-2"><Label htmlFor={`${fieldId}-title`}>What needs to happen?</Label><Input id={`${fieldId}-title`} required maxLength={160} placeholder="For example, feed the cats" value={draft.title} onChange={(event) => update('title', event.target.value)} /></div>
            <div className="grid gap-2"><Label htmlFor={`${fieldId}-owner`}>Assign to</Label><SelectField id={`${fieldId}-owner`} required value={draft.ownerId} onChange={(event) => update('ownerId', event.target.value)}><option value="">Choose a team member</option>{rule && !members.some((member) => member.id === rule.ownerId) ? <option value={rule.ownerId}>{rule.owner} (unavailable for new tasks)</option> : null}{members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</SelectField>{!members.length ? <Text size="caption" tone="muted">No team members are available for new tasks. Ask an administrator to enable task assignments.</Text> : null}</div>
            <div className="grid gap-2"><Label htmlFor={`${fieldId}-amount`}>Repeat every</Label><div className="grid grid-cols-2 gap-3"><Input id={`${fieldId}-amount`} type="number" min={1} max={draft.unit === 'weeks' ? 52 : 365} required value={draft.amount} onChange={(event) => update('amount', event.target.value)} /><SelectField aria-label="Repeat unit" value={draft.unit} onChange={(event) => update('unit', event.target.value as Draft['unit'])}><option value="days">days</option><option value="weeks">weeks</option></SelectField></div></div>
            <div className="grid gap-2"><Label htmlFor={`${fieldId}-start`}>First due date</Label><Input id={`${fieldId}-start`} type="date" required min={rule ? undefined : today()} value={draft.startDate} onChange={(event) => update('startDate', event.target.value)} /></div>
            <Text size="caption" tone="muted">Tasks have a due date, but no due time. Changes apply to future tasks; tasks already created stay as they are.</Text>
          </fieldset>
          {error ? <Alert>{error}</Alert> : null}
        </DrawerBody>
        <DrawerFooter><Button type="button" variant="outline" disabled={saving} onClick={close}>Cancel</Button><Button type="submit" loading={saving} disabled={!valid}>{rule ? 'Save rule' : 'Create rule'}</Button></DrawerFooter>
        <DiscardChangesDialog {...discard.dialogProps} />
        {hasChanges && !saving ? <DiscardOnNavigation onDiscard={() => setOpen(false)} /> : null}
      </DrawerContent>
    </Drawer>
  </>
}

export function CareRules({ recordType, recordId, recordName }: { recordType: 'cat' | 'colony'; recordId: string; recordName: string }) {
  const { user } = useRouteLoaderData('workspace') as WorkspaceData
  const { careRules, careGenerationFailed, members, setCareRuleActive, refreshWorkspace, refreshingWorkspace } = useInbox()
  const [pending, setPending] = useState('')
  const rules = careRules.filter((rule) => rule.recordType === recordType && rule.recordId === recordId)
  async function changeStatus(rule: CareRule) {
    if (pending) return
    setPending(rule.id)
    try {
      await setCareRuleActive(rule.id, !rule.active)
      toast.success(rule.active ? 'Care rule paused' : 'Care rule resumed', { description: rule.title })
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : 'Could not update the care rule. Try again.') }
    finally { setPending('') }
  }
  return <section aria-labelledby={`${recordType}-care-rules`} className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-3"><Heading id={`${recordType}-care-rules`} level={2} size="card">Care schedule</Heading><CareRuleEditor recordType={recordType} recordId={recordId} recordName={recordName} currentUser={user.id} /></div>
    <Text size="small" tone="muted">Create repeating tasks for feeding and other care. Tasks already created stay in the list when a rule changes or pauses.</Text>
    {careGenerationFailed ? <div className="space-y-2"><Alert>Some scheduled tasks could not be created. Try again or ask an administrator for help.</Alert><Button size="sm" variant="outline" loading={refreshingWorkspace} onClick={() => void refreshWorkspace()}>Retry</Button></div> : null}
    {rules.length ? <Card size="sm"><CardContent className="@container"><ul className="divide-y divide-border">
      {rules.map((rule) => {
        const canManage = user.role === 'administrator' || user.id === rule.ownerId || user.id === rule.createdBy
        const unavailableOwner = !members.some((member) => member.id === rule.ownerId)
        return <li key={rule.id} className="grid items-start gap-2 py-3 first:pt-0 last:pb-0 @md:grid-cols-[minmax(0,1fr)_auto] @md:gap-3">
          <div className="min-w-0 space-y-1"><Text size="small" weight="medium" className="wrap-anywhere">{rule.title}</Text><Text size="caption" tone="muted" className="wrap-anywhere">{frequency(rule.repeatDays)} · Assigned to {rule.owner}{rule.active ? '' : ' · Paused'}</Text><Text size="caption" tone="muted">{rule.active ? `Next task to create: ${formatTaskDue(rule.nextDue)}` : 'No new tasks while paused'}</Text>{unavailableOwner ? <Text size="caption" tone="danger">This assignee is unavailable for new assignments. Edit the rule to choose an available team member.</Text> : null}</div>
          {canManage ? <div className="flex flex-wrap items-center gap-1"><CareRuleEditor recordType={recordType} recordId={recordId} recordName={recordName} currentUser={user.id} rule={rule} /><Button size="sm" variant="outline" loading={pending === rule.id} disabled={Boolean(pending)} aria-label={`${rule.active ? 'Pause' : 'Resume'} care rule: ${rule.title}`} onClick={() => void changeStatus(rule)}>{rule.active ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}{rule.active ? 'Pause' : 'Resume'}</Button></div> : null}
        </li>
      })}
    </ul></CardContent></Card> : <EmptyState icon={<CalendarClock />} title="No care rules yet" description="Add a rule to create tasks on a regular schedule." />}
  </section>
}
