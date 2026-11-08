import { authRequest } from '@/features/auth/auth'
import type { CreateReportInput, FinishReportInput, TaskInput } from '../../../shared/schemas/workspace'
import type { Report, ReportAttachment, Task, TaskStatus } from '../../../shared/types/workspace'

export type DraftFile = { attachment: ReportAttachment; file: File }
export type TaskResult = { task: Task; report: Report | null }
export type WorkspaceStore = {
  createReport: (input: CreateReportInput, files: DraftFile[]) => Promise<Report>
  finishReport: (id: string, input: FinishReportInput) => Promise<Report>
  reopenReport: (id: string) => Promise<Report>
  askQuestion: (id: string, text: string) => Promise<Report>
  linkDuplicate: (id: string, targetId: string) => Promise<Report>
  markReports: (ids: string[], unread: boolean) => Promise<void>
  createTask: (input: TaskInput) => Promise<TaskResult>
  editTask: (id: string, input: TaskInput) => Promise<TaskResult>
  changeTaskStatus: (id: string, status: TaskStatus) => Promise<TaskResult>
}

async function post<T>(path: string, data?: unknown): Promise<T> {
  return authRequest<T>(path, { method: 'POST', ...(data === undefined ? {} : { body: JSON.stringify(data) }) })
}
const pathId = (id: string) => encodeURIComponent(id)

export const databaseWorkspace: WorkspaceStore = {
  async createReport(input, files) {
    const form = new FormData()
    form.set('data', JSON.stringify(input))
    for (const { file } of files) form.append('files', file)
    const response = await fetch('/api/reports', { method: 'POST', credentials: 'same-origin', cache: 'no-store', body: form })
    const result = await response.json().catch(() => null) as { report?: Report; error?: string } | null
    if (!response.ok || !result?.report) throw new Error(result?.error ?? 'Could not save the report. Try again.')
    return result.report
  },
  async finishReport(id, input) { return (await post<{ report: Report }>(`/api/reports/${pathId(id)}/finish`, input)).report },
  async reopenReport(id) { return (await post<{ report: Report }>(`/api/reports/${pathId(id)}/reopen`)).report },
  async askQuestion(id, text) { return (await post<{ report: Report }>(`/api/reports/${pathId(id)}/questions`, { text })).report },
  async linkDuplicate(id, targetId) { return (await post<{ report: Report }>(`/api/reports/${pathId(id)}/duplicate`, { targetId })).report },
  async markReports(ids, unread) { await post('/api/reports/read', { ids, unread }) },
  createTask(input) { return post<TaskResult>('/api/tasks', input) },
  editTask(id, input) { return post<TaskResult>(`/api/tasks/${pathId(id)}/edit`, input) },
  changeTaskStatus(id, status) { return post<TaskResult>(`/api/tasks/${pathId(id)}/status`, { status }) },
}
