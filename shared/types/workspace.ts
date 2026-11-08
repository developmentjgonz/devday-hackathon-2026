export type ReportStatus = 'pending' | 'waiting' | 'processed'
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
  reportId?: string
  associations: TaskAssociation[]
}
export type ReportEntry = { id: string; author: string; text: string }
export type ReportAttachment = { id: string; name: string; url: string; mimeType: string; size: number }
export type Report = {
  id: string
  title: string
  reporter: string
  submittedAt: string
  message: string
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
export type WorkspaceSnapshot = { reports: Report[]; tasks: Task[]; members: WorkspaceMember[] }
