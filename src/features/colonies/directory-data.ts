import type { InboxCat, InboxColony, InboxReport } from '@/features/inbox/types'

import { openTasksForRecord, type AssignedTask } from '@/features/tasks/task-data'

export function reportsForColony(reports: InboxReport[], colonyId: string) {
  return reports.filter((report) => report.colonyId === colonyId)
}

export function recentReports(reports: InboxReport[]) {
  return [...reports].sort((a, b) => Date.parse(b.submittedAt) - Date.parse(a.submittedAt))
}

export function colonySummary(colony: InboxColony, cats: InboxCat[], reports: InboxReport[], tasks: AssignedTask[]) {
  const related = reportsForColony(reports, colony.id)
  return {
    colony,
    catCount: cats.filter((cat) => cat.colonyId === colony.id).length,
    urgentCount: related.filter((report) => report.urgent && report.status !== 'processed').length,
    taskCount: openTasksForRecord(tasks, 'colony', colony.id).length,
    feedingReport: recentReports(related.filter((report) => report.category === 'Feeding visit'))[0],
  }
}

const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
export function formatReportTime(date: string) {
  const timestamp = Date.parse(date)
  return Number.isNaN(timestamp) ? 'Date unavailable' : dateFormat.format(timestamp)
}
