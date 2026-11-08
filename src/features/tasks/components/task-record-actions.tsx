import { Cat, FileText, House, ListTodo } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { useReportDetailLink } from '@/features/inbox/components/report-detail-context'
import { useTaskDetailLink } from './task-detail-context'
import type { AssignedTask } from '../task-data'

export function TaskRecordActions({ task, showTask = true }: { task: AssignedTask; showTask?: boolean }) {
  const reportLink = useReportDetailLink()
  const taskLink = useTaskDetailLink()
  if (!showTask && !task.reportTitle && !task.related.some((item) => item.id)) return null
  return <div role="group" aria-label={`Linked records for ${task.title}`} className="flex flex-wrap items-center gap-1">
    {showTask ? <Button variant="ghost" size="sm" render={<Link {...taskLink(task.id, `my-task:${task.id}`)} />} aria-label={`View task: ${task.title}`}><ListTodo aria-hidden="true" />Task</Button> : null}
    {task.reportId && task.reportTitle ? <Button variant="ghost" size="sm" render={<Link {...reportLink(task.reportId, `my-task:${task.id}`)} />} aria-label={`Open report: ${task.reportTitle}`} title={task.reportTitle}><FileText aria-hidden="true" />Report</Button> : null}
    {task.related.filter((item) => item.id && (item.type === 'cat' || item.type === 'colony')).map((item) => <Button key={`${item.type}-${item.id}`} variant="ghost" size="sm" render={<Link to={`/app/${item.type === 'cat' ? 'cats' : 'colonies'}/${encodeURIComponent(item.id!)}`} />} aria-label={`Open ${item.type}: ${item.label}`} title={item.label}>{item.type === 'cat' ? <Cat aria-hidden="true" /> : <House aria-hidden="true" />}{item.type === 'cat' ? 'Cat' : 'Colony'}</Button>)}
  </div>
}
