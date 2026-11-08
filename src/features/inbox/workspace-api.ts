import { authRequest } from '@/features/auth/auth'
import type { CareRuleInput, CreateReportInput, FinishReportInput, TaskInput } from '../../../shared/schemas/workspace'
import type { CareRule, DuplicateSearchResult, Report, ReportAttachment, Task, TaskStatus, WorkspaceSnapshot } from '../../../shared/types/workspace'
import type { ReportAnalysis } from '../../../shared/schemas/report-analysis'

export type DraftFile = { attachment: ReportAttachment; file: File }
export type TaskResult = { task: Task; report: Report | null }
export type CareRuleResult = { rule: CareRule; tasks: Task[]; generationFailed?: boolean }
export type WorkspaceStore = {
  getSnapshot: (signal?: AbortSignal) => Promise<WorkspaceSnapshot>
  analyzeReport: (id: string, signal?: AbortSignal) => Promise<ReportAnalysis>
  searchDuplicateReports: (id: string, query: string, offset: number, signal?: AbortSignal) => Promise<DuplicateSearchResult>
  createReport: (input: CreateReportInput, files: DraftFile[]) => Promise<Report>
  finishReport: (id: string, input: FinishReportInput) => Promise<Report>
  reopenReport: (id: string) => Promise<Report>
  askQuestion: (id: string, text: string) => Promise<Report>
  linkDuplicate: (id: string, targetId: string) => Promise<Report>
  createTask: (input: TaskInput) => Promise<TaskResult>
  editTask: (id: string, input: TaskInput) => Promise<TaskResult>
  changeTaskStatus: (id: string, status: TaskStatus, completionNote?: string) => Promise<TaskResult>
  createCareRule: (input: CareRuleInput) => Promise<CareRuleResult>
  editCareRule: (id: string, input: CareRuleInput) => Promise<CareRuleResult>
  setCareRuleActive: (id: string, active: boolean) => Promise<CareRuleResult>
}

async function post<T>(path: string, data?: unknown): Promise<T> {
  return authRequest<T>(path, { method: 'POST', ...(data === undefined ? {} : { body: JSON.stringify(data) }) })
}
const pathId = (id: string) => encodeURIComponent(id)

export const databaseWorkspace: WorkspaceStore = {
  getSnapshot(signal) { return authRequest<WorkspaceSnapshot>('/api/workspace-data', { signal }) },
  async analyzeReport(id, signal) {
    return (await authRequest<{ suggestions: ReportAnalysis }>(`/api/reports/${pathId(id)}/analyze`, { method: 'POST', signal })).suggestions
  },
  searchDuplicateReports(id, query, offset, signal) {
    const params = new URLSearchParams({ q: query, offset: String(offset) })
    return authRequest<DuplicateSearchResult>(`/api/reports/${pathId(id)}/duplicate-candidates?${params}`, { signal })
  },
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
  createTask(input) { return post<TaskResult>('/api/tasks', input) },
  editTask(id, input) { return post<TaskResult>(`/api/tasks/${pathId(id)}/edit`, input) },
  changeTaskStatus(id, status, completionNote) { return post<TaskResult>(`/api/tasks/${pathId(id)}/status`, { status, completionNote }) },
  createCareRule(input) { return post<CareRuleResult>('/api/care-rules', input) },
  editCareRule(id, input) { return post<CareRuleResult>(`/api/care-rules/${pathId(id)}/edit`, input) },
  setCareRuleActive(id, active) { return post<CareRuleResult>(`/api/care-rules/${pathId(id)}/status`, { active }) },
}
