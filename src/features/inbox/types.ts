import type { Cat, Colony } from '../../../shared/types/directory'
import type { Report, ReportAttachment as Attachment, ReportEntry as Entry, ReportStatus as Status, Task as WorkspaceTask, TaskAssociation as Association, TaskStatus as TaskState } from '../../../shared/types/workspace'

// UI names for the shared workspace contracts.
export type ReportStatus = Status
export const reportStatusLabels: Record<ReportStatus, string> = {
  pending: 'Needs review',
  waiting: 'Waiting for details',
  in_progress: 'In progress',
  processed: 'Resolved',
  dismissed: 'Dismissed',
}
export type InboxColony = Colony
export type InboxCat = Cat
export type TaskStatus = TaskState
export type TaskAssociation = Association
export type Task = WorkspaceTask
export type ReportEntry = Entry
export type ReportAttachment = Attachment
export type InboxReport = Report
export type InboxData = { reports: InboxReport[]; tasks: Task[]; colonies: InboxColony[]; cats: InboxCat[]; members: string[] }
