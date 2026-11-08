import type { InboxColony, InboxReport, ReportTask, TaskStatus } from '@/features/inbox/types'

export type AssignedTask = ReportTask & { reportId: string; reportTitle: string; colony: string }

export function getAssignedTasks(reports: InboxReport[], colonies: InboxColony[], currentUser: string): AssignedTask[] {
  const colonyNames = new Map(colonies.map((colony) => [colony.id, colony.name]))
  return reports.flatMap((report) => report.tasks
    .filter((task) => task.owner === currentUser)
    .map((task) => ({ ...task, reportId: report.id, reportTitle: report.title, colony: colonyNames.get(report.colonyId) ?? 'Colony unknown' })))
    .sort((a, b) => (a.due || '9999-12-31').localeCompare(b.due || '9999-12-31') || a.title.localeCompare(b.title) || a.id.localeCompare(b.id))
}

/** Update only the current assignee's task. Report review status stays unchanged. */
export function setAssignedTaskStatus(reports: InboxReport[], reportId: string, taskId: string, currentUser: string, status: TaskStatus): InboxReport[] {
  return reports.map((report) => {
    if (report.id !== reportId) return report
    const task = report.tasks.find((item) => item.id === taskId && item.owner === currentUser)
    if (!task || task.status === status) return report
    return {
      ...report,
      tasks: report.tasks.map((item) => item === task ? { ...item, status } : item),
      history: [...report.history, `${currentUser} ${status === 'completed' ? 'completed' : 'reopened'} care task: ${task.title}.`],
    }
  })
}

const dueFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })

export function formatTaskDue(due: string) {
  if (!due) return 'No due date'
  const date = new Date(`${due}T00:00:00Z`)
  return Number.isNaN(date.getTime()) ? 'No due date' : dueFormat.format(date)
}
