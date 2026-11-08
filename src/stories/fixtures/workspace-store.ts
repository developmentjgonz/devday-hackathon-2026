import type { SessionUser } from '../../../shared/types/auth'
import type { Report, Task, WorkspaceSnapshot } from '../../../shared/types/workspace'
import type { WorkspaceStore } from '@/features/inbox/workspace-api'
import type { StoryActivityStore } from './record-activity-store'

/** An isolated store for Storybook; the application uses the database store. */
export function storyWorkspaceStore(user: SessionUser, initial: WorkspaceSnapshot, activity?: StoryActivityStore): WorkspaceStore {
  const data = structuredClone(initial)
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
    return { task: structuredClone(item), report: linked ? structuredClone(linked) : null }
  }
  function owner(id: string) {
    const member = data.members.find((item) => item.id === id)
    if (!member) throw new Error('Choose an active team member.')
    return member.name
  }
  return {
    async getSnapshot() { return structuredClone(data) },
    async createReport(input, files) {
      const item: Report = { ...input, id: crypto.randomUUID(), reporter: user.name, submittedAt: new Date().toISOString(), category: 'Field report', careNote: '', unread: true, status: 'pending', attachments: files.map(({ attachment }) => attachment), thread: [], history: [] }
      data.reports.unshift(item)
      activity?.report(`Report submitted: ${item.title}`, item)
      return structuredClone(item)
    },
    async finishReport(id, input) { const item = report(id); const before = structuredClone(item); Object.assign(item, input, { status: 'processed' }); item.history.push(`${user.name} saved the confirmed report details and finished the review.`); activity?.report(`Report reviewed: ${item.title}`, item, before); return structuredClone(item) },
    async reopenReport(id) { const item = report(id); item.status = 'pending'; delete item.duplicateOf; item.history.push(`${user.name} reopened the report for review.`); activity?.report(`Report reopened: ${item.title}`, item); return structuredClone(item) },
    async askQuestion(id, text) { const item = report(id); item.status = 'waiting'; item.thread.push({ id: crypto.randomUUID(), author: user.name, text }); item.history.push(`${user.name} requested more details.`); activity?.report(`More details requested: ${item.title}`, item); return structuredClone(item) },
    async linkDuplicate(id, targetId) { const item = report(id); item.status = 'processed'; item.duplicateOf = targetId; item.history.push(`${user.name} linked this duplicate to an existing report.`); activity?.report(`Duplicate report linked: ${item.title}`, item); return structuredClone(item) },
    async markReports(ids, unread) {
      if (!ids.length || ids.length > 100) throw new Error('Select up to 100 reports.')
      for (const id of ids) report(id).unread = unread
    },
    async createTask(input) { const item: Task = { ...input, id: crypto.randomUUID(), owner: owner(input.ownerId), status: 'open' }; data.tasks.push(item); activity?.task(`Task created: ${item.title}`, item, item.reportId ? report(item.reportId) : null); return taskResult(item, `created a task: ${item.title}.`) },
    async editTask(id, input) { const item = task(id); const before = structuredClone(item); Object.assign(item, input, { owner: owner(input.ownerId) }); activity?.task(`Task updated: ${item.title}`, item, item.reportId ? report(item.reportId) : null, before); return taskResult(item, `updated a task: ${item.title}.`) },
    async changeTaskStatus(id, status) { const item = task(id); const before = structuredClone(item); item.status = status; activity?.task(`Task ${status === 'completed' ? 'completed' : 'reopened'}: ${item.title}`, item, item.reportId ? report(item.reportId) : null, before); return taskResult(item, `${status === 'completed' ? 'completed' : 'reopened'} task: ${item.title}.`) },
  }
}
