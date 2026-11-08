import type { InboxReport, Task } from '@/features/inbox/types'

function taskProgress(tasks: Task[], today: string) {
  const open = tasks.filter((task) => task.status === 'open')
  return {
    total: tasks.length,
    completed: tasks.length - open.length,
    dueToday: open.filter((task) => task.due === today).length,
    overdue: open.filter((task) => task.due && task.due < today).length,
    nextDue: open.map((task) => task.due).filter((due) => due && due >= today).sort()[0],
  }
}

export function overviewProgress(reports: InboxReport[], tasks: Task[], currentUser: string, today: string) {
  return {
    mine: taskProgress(tasks.filter((task) => task.ownerId === currentUser), today),
    team: taskProgress(tasks, today),
    assignees: new Set(tasks.filter((task) => task.status === 'open').map((task) => task.ownerId).filter(Boolean)).size,
    reports: {
      total: reports.length,
      processed: reports.filter((report) => report.status === 'processed').length,
      pending: reports.filter((report) => report.status === 'pending').length,
      waiting: reports.filter((report) => report.status === 'waiting').length,
    },
  }
}

export function workspaceDate(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}
