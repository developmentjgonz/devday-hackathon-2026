import { isReportReviewComplete, reviewedReportStatus } from '../../../shared/types/workspace'
import type { SessionUser } from '../../../shared/types/auth'
import type { CareRule, Report, Task, WorkspaceSnapshot } from '../../../shared/types/workspace'
import type { WorkspaceStore } from '@/features/inbox/workspace-api'
import type { StoryActivityStore } from './record-activity-store'

/** An isolated store for Storybook; the application uses the database store. */
export function storyWorkspaceStore(user: SessionUser, initial: WorkspaceSnapshot, activity?: StoryActivityStore): WorkspaceStore {
  const data = structuredClone(initial)
  const occurrences = new Set<string>()
  const addDays = (date: string, days: number) => new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10)
  const nextOccurrence = (rule: CareRule) => {
    const today = new Date().toISOString().slice(0, 10)
    const days = (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${rule.startDate}T00:00:00Z`)) / 86_400_000
    return addDays(rule.startDate, Math.max(0, Math.ceil(days / rule.repeatDays)) * rule.repeatDays)
  }
  function report(id: string) {
    const item = data.reports.find((entry) => entry.id === id)
    if (!item) throw new Error('Report not found.')
    return item
  }
  function task(id: string) {
    const item = data.tasks.find((entry) => entry.id === id)
    if (!item) throw new Error('Task not found.')
    return item
  }
  function taskResult(item: Task, event: string) {
    const linked = item.reportId ? report(item.reportId) : null
    if (linked) linked.history.push(`${user.name} ${event}`)
    if (linked && linked.status !== 'dismissed' && isReportReviewComplete(linked.status)) {
      const status = reviewedReportStatus(data.tasks.some((task) => task.reportId === linked.id && task.status === 'open'))
      if (status !== linked.status) {
        const before = structuredClone(linked)
        linked.status = status
        linked.history.push(status === 'in_progress' ? 'The report returned to In progress because a linked task is open.' : 'The report was resolved after all linked tasks were completed.')
        activity?.report(`Report ${status === 'in_progress' ? 'in progress' : 'resolved'}: ${linked.title}`, linked, before)
      }
    }
    return { task: structuredClone(item), report: linked ? structuredClone(linked) : null }
  }
  function owner(id: string) {
    const member = data.members.find((item) => item.id === id)
    if (!member) throw new Error('Choose an active team member.')
    return member.name
  }
  function rule(id: string) {
    const item = data.careRules.find((entry) => entry.id === id)
    if (!item) throw new Error('Care rule not found.')
    return item
  }
  function ruleResult(item: CareRule) {
    const generated: Task[] = []
    const horizon = addDays(new Date().toISOString().slice(0, 10), 1)
    for (let count = 0; item.active && item.nextDue <= horizon && count < 90; count++) {
      const key = `${item.id}:${item.nextDue}`
      if (!occurrences.has(key)) {
        const task: Task = { id: crypto.randomUUID(), title: item.title, ownerId: item.ownerId, owner: item.owner, due: item.nextDue, status: 'open', careRuleId: item.id, associations: [{ type: item.recordType, id: item.recordId }] }
        occurrences.add(key)
        data.tasks.push(task)
        generated.push(task)
        activity?.task('Task created from a care rule', task, null)
      }
      item.nextDue = addDays(item.nextDue, item.repeatDays)
    }
    return { rule: structuredClone(item), tasks: structuredClone(generated) }
  }
  return {
    async getSnapshot() { return structuredClone(data) },
    async analyzeReport(id) {
      const source = report(id)
      const duplicate = source.id === 'report-sighting' ? data.reports.find((item) => item.id === 'report-earlier-sighting') : undefined
      return {
        tasks: [{ title: 'Arrange a care check', reason: 'The report describes a possible injury.' }],
        cats: [{ name: '', details: 'Cat with a possible injury.', reason: 'Check whether this cat is already in the directory.' }],
        colonies: [{ name: '', details: 'Feeding area near the reported location.', reason: 'Confirm whether this location belongs to an existing colony.' }],
        duplicates: duplicate ? [{ report: { id: duplicate.id, title: duplicate.title, message: duplicate.message, reporter: duplicate.reporter, submittedAt: duplicate.submittedAt, cat: 'Miso' }, reason: 'Both reports describe the same cat at the Canal entrance at a similar time.' }] : [],
        skippedAttachments: [],
      }
    },
    async searchDuplicateReports(id, query, offset) {
      const source = report(id)
      if (!source.colonyId || isReportReviewComplete(source.status) || data.reports.some((item) => item.duplicateOf === id)) return { reports: [], hasMore: false }
      const words = query.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []
      const matches = data.reports.filter((item) => item.id !== id && !item.duplicateOf && item.status !== 'dismissed' && item.colonyId === source.colonyId && words.every((word) => `${item.title} ${item.message}`.toLocaleLowerCase().includes(word)))
        .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt) || a.id.localeCompare(b.id))
      return { reports: matches.slice(offset, offset + 15).map((item) => ({ id: item.id, title: item.title, message: item.message, reporter: item.reporter, submittedAt: item.submittedAt, cat: '' })), hasMore: offset + 15 < matches.length }
    },
    async createReport(input, files) {
      const item: Report = { ...input, id: crypto.randomUUID(), reporter: user.name, submittedAt: new Date().toISOString(), category: 'Field report', careNote: '', status: 'pending', attachments: files.map(({ attachment }) => attachment), thread: [], history: [] }
      data.reports.unshift(item)
      activity?.report(`Report submitted: ${item.title}`, item)
      return structuredClone(item)
    },
    async finishReport(id, input) { const item = report(id); const before = structuredClone(item); Object.assign(item, input, { status: reviewedReportStatus(data.tasks.some((task) => task.reportId === id && task.status === 'open')) }); item.history.push(`${user.name} saved the confirmed report details and finished the review.`); activity?.report(`Report reviewed: ${item.title}`, item, before); return structuredClone(item) },
    async dismissReport(id) { const item = report(id); const before = structuredClone(item); item.status = 'dismissed'; item.history.push(`${user.name} dismissed the report. No further action is needed.`); activity?.report(`Report dismissed: ${item.title}`, item, before); return structuredClone(item) },
    async reopenReport(id) { const item = report(id); item.status = 'pending'; delete item.duplicateOf; item.history.push(`${user.name} reopened the report for review.`); activity?.report(`Report reopened: ${item.title}`, item); return structuredClone(item) },
    async askQuestion(id, text) { const item = report(id); item.status = 'waiting'; item.thread.push({ id: crypto.randomUUID(), author: user.name, text }); item.history.push(`${user.name} requested more details.`); activity?.report(`More details requested: ${item.title}`, item); return structuredClone(item) },
    async linkDuplicate(id, targetId) { const item = report(id); item.status = reviewedReportStatus(data.tasks.some((task) => task.reportId === id && task.status === 'open')); item.duplicateOf = targetId; item.history.push(`${user.name} linked this duplicate to an existing report.`); activity?.report(`Duplicate report linked: ${item.title}`, item); return structuredClone(item) },
    async createTask(input) { const item: Task = { ...input, id: crypto.randomUUID(), owner: owner(input.ownerId), status: 'open' }; data.tasks.push(item); activity?.task(`Task created: ${item.title}`, item, item.reportId ? report(item.reportId) : null); return taskResult(item, `created a task: ${item.title}.`) },
    async editTask(id, input) { const item = task(id); const before = structuredClone(item); Object.assign(item, input, { owner: input.ownerId === item.ownerId ? item.owner : owner(input.ownerId) }); activity?.task(`Task updated: ${item.title}`, item, item.reportId ? report(item.reportId) : null, before); return taskResult(item, `updated a task: ${item.title}.`) },
    async changeTaskStatus(id, status, completionNote) { const item = task(id); if (item.status === status) return { task: structuredClone(item), report: item.reportId ? structuredClone(report(item.reportId)) : null }; const before = structuredClone(item); item.status = status; if (status === 'completed') { item.completedAt = new Date().toISOString(); if (completionNote?.trim()) item.completionNote = completionNote.trim(); else delete item.completionNote } else delete item.completedAt; activity?.task(`Task ${status === 'completed' ? 'completed' : 'reopened'}: ${item.title}`, item, item.reportId ? report(item.reportId) : null, before); return taskResult(item, `${status === 'completed' ? 'completed' : 'reopened'} task: ${item.title}.`) },
    async createCareRule(input) {
      const item: CareRule = { ...input, id: crypto.randomUUID(), owner: owner(input.ownerId), nextDue: input.startDate, active: true, createdBy: user.id }
      data.careRules.push(item)
      return ruleResult(item)
    },
    async editCareRule(id, input) {
      const item = rule(id)
      const changed = item.startDate !== input.startDate || item.repeatDays !== input.repeatDays
      Object.assign(item, input, { owner: owner(input.ownerId) })
      if (changed) item.nextDue = nextOccurrence(item)
      return ruleResult(item)
    },
    async setCareRuleActive(id, active) {
      const item = rule(id)
      if (active && !item.active) item.nextDue = nextOccurrence(item)
      item.active = active
      return ruleResult(item)
    },
  }
}
