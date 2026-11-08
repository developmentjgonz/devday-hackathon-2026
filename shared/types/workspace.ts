import type { PublicReportContact, PublicReportMapLocation } from '../schemas/public-report'

export type ReportStatus = 'pending' | 'waiting' | 'processed' | 'dismissed'
export function isReportClosed(status: ReportStatus) {
  return status === 'processed' || status === 'dismissed'
}

export type TaskStatus = 'open' | 'completed'
export type TaskAssociation =
  | { type: 'cat' | 'colony'; id: string }
  | { type: 'person' | 'paperwork' | 'other'; label: string }

export type WorkspaceMember = { id: string; name: string }
export type Task = {
  id: string
  title: string
  ownerId: string
  owner: string
  due: string
  status: TaskStatus
  completedAt?: string
  completionNote?: string
  reportId?: string
  careRuleId?: string
  associations: TaskAssociation[]
}
export type CareRule = {
  id: string
  title: string
  ownerId: string
  owner: string
  recordType: 'cat' | 'colony'
  recordId: string
  repeatDays: number
  startDate: string
  nextDue: string
  active: boolean
  createdBy: string | null
}
export type ReportEntry = { id: string; author: string; text: string }
export type ReportAttachment = { id: string; name: string; url: string; mimeType: string; size: number }
export type DuplicateReport = { id: string; title: string; message: string; reporter: string; submittedAt: string; cat: string }
export type DuplicateSearchResult = { reports: DuplicateReport[]; hasMore: boolean }
export type Report = {
  id: string
  title: string
  reporter: string
  anonymous?: boolean
  contact?: PublicReportContact & { consentedAt: string }
  submittedAt: string
  message: string
  mapLocation?: PublicReportMapLocation
  category: string
  colonyId: string
  catId: string
  careNote: string
  urgent: boolean
  status: ReportStatus
  possibleDuplicateOf?: string
  duplicateOf?: string
  attachments: ReportAttachment[]
  thread: ReportEntry[]
  history: string[]
}
export type WorkspaceSnapshot = { reports: Report[]; tasks: Task[]; members: WorkspaceMember[]; careRules: CareRule[]; aiAnalysisEnabled: boolean; careGenerationFailed?: boolean }
