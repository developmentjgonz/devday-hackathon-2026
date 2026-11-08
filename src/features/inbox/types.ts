// UI contracts only. The rescue schema and network API are designed separately.
export type ReportStatus = 'pending' | 'waiting' | 'processed'
export const reportStatusLabels: Record<ReportStatus, string> = {
  pending: 'Pending',
  waiting: 'Waiting for details',
  processed: 'Processed',
}
export type InboxColony = { id: string; name: string; photoUrl?: string; coordinates?: [longitude: number, latitude: number] }
export type InboxCat = { id: string; colonyId: string; name: string; photoUrl?: string }
export type TaskStatus = 'open' | 'completed'
export type ReportTask = { id: string; title: string; owner: string; due: string; status: TaskStatus }
export type ReportEntry = { id: string; author: string; text: string }
export type ReportAttachment = { id: string; name: string; url: string; mimeType: string; size: number }
export type InboxReport = {
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
  unread: boolean
  status: ReportStatus
  possibleDuplicateOf?: string
  duplicateOf?: string
  attachments: ReportAttachment[]
  tasks: ReportTask[]
  thread: ReportEntry[]
  history: string[]
}
export type InboxData = { reports: InboxReport[]; colonies: InboxColony[]; cats: InboxCat[]; members: string[] }
