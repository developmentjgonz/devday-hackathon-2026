import type { InboxData, InboxReport, Task, TaskAssociation } from '@/features/inbox/types'

export type RelatedItem = { type: TaskAssociation['type']; label: string; id?: string }
export type AssignedTask = Task & { reportTitle: string; related: RelatedItem[]; colony: string; catName: string }

/** Resolve direct associations and the current details of a linked report. */
export function resolveTasks(tasks: Task[], reports: InboxReport[], data: Pick<InboxData, 'colonies' | 'cats'>): AssignedTask[] {
  const reportsById = new Map(reports.map((report) => [report.id, report]))
  const colonies = new Map(data.colonies.map((colony) => [colony.id, colony]))
  const cats = new Map(data.cats.map((cat) => [cat.id, cat]))
  return tasks.map((task) => {
    const report = task.reportId ? reportsById.get(task.reportId) : undefined
    const related: RelatedItem[] = []
    function add(item: RelatedItem) {
      if (!related.some((existing) => existing.type === item.type && (item.id ? existing.id === item.id : existing.label.toLocaleLowerCase() === item.label.toLocaleLowerCase()))) related.push(item)
    }
    function addColony(id: string) {
      const colony = colonies.get(id)
      if (colony) add({ type: 'colony', id: colony.id, label: colony.name })
    }
    function addCat(id: string) {
      const cat = cats.get(id)
      if (cat) { add({ type: 'cat', id: cat.id, label: cat.name }); addColony(cat.colonyId) }
    }
    if (report) { addColony(report.colonyId); addCat(report.catId) }
    for (const association of task.associations) {
      if (association.type === 'cat') addCat(association.id)
      else if (association.type === 'colony') addColony(association.id)
      else if ('label' in association) add({ type: association.type, label: association.label })
    }
    const colony = related.filter((item) => item.type === 'colony').map((item) => item.label).join(', ')
    const catName = related.filter((item) => item.type === 'cat').map((item) => item.label).join(', ')
    return { ...task, reportTitle: report?.title ?? '', related, colony: colony || (report ? 'Colony unknown' : ''), catName }
  })
}

export function getAssignedTasks(tasks: Task[], reports: InboxReport[], data: Pick<InboxData, 'colonies' | 'cats'>, currentUser: string): AssignedTask[] {
  return resolveTasks(tasks.filter((task) => task.ownerId === currentUser), reports, data)
    .sort((a, b) => (a.due || '9999-12-31').localeCompare(b.due || '9999-12-31') || a.title.localeCompare(b.title) || a.id.localeCompare(b.id))
}

export function tasksForRecord(tasks: AssignedTask[], type: 'cat' | 'colony', id: string) {
  return tasks.filter((task) => task.related.some((item) => item.type === type && item.id === id))
    .sort((a, b) => (a.status === b.status ? 0 : a.status === 'open' ? -1 : 1) || (a.due || '9999-12-31').localeCompare(b.due || '9999-12-31') || a.title.localeCompare(b.title))
}

export function openTasksForRecord(tasks: AssignedTask[], type: 'cat' | 'colony', id: string) {
  return tasksForRecord(tasks, type, id).filter((task) => task.status === 'open')
}

const dueFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
export function formatTaskDue(due: string) {
  if (!due) return 'No due date'
  const date = new Date(`${due}T00:00:00Z`)
  return Number.isNaN(date.getTime()) ? 'No due date' : dueFormat.format(date)
}
