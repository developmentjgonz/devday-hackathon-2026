import type { InboxReport, Task } from '@/features/inbox/types'

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

function taskSummary(tasks: Task[], recentlyCompleted: Task[], today: string) {
  const open = tasks.filter((task) => task.status === 'open')
  return {
    open: open.length,
    completed: recentlyCompleted.length,
    undatedCompleted: tasks.filter((task) => task.status === 'completed' && (!task.completedAt || !Number.isFinite(Date.parse(task.completedAt)))).length,
    dueToday: open.filter((task) => task.due === today).length,
    overdue: open.filter((task) => task.due && task.due < today).length,
    nextDue: open.map((task) => task.due).filter((due) => due && due >= today).sort()[0],
  }
}

export function overviewSummary(reports: InboxReport[], tasks: Task[], currentUser: string, now = new Date()) {
  const today = workspaceDate(now)
  const cutoff = now.getTime() - THIRTY_DAYS_MS
  const recentlyCompleted = tasks.filter((task) => {
    if (task.status !== 'completed' || !task.completedAt) return false
    const completedAt = Date.parse(task.completedAt)
    return completedAt >= cutoff && completedAt <= now.getTime()
  })
  return {
    mine: taskSummary(tasks.filter((task) => task.ownerId === currentUser), recentlyCompleted.filter((task) => task.ownerId === currentUser), today),
    team: taskSummary(tasks, recentlyCompleted, today),
    recentlyCompleted,
    assignees: new Set(tasks.filter((task) => task.status === 'open').map((task) => task.ownerId).filter(Boolean)).size,
    reports: {
      pending: reports.filter((report) => report.status === 'pending').length,
      waiting: reports.filter((report) => report.status === 'waiting').length,
    },
  }
}

export function workspaceDate(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}
