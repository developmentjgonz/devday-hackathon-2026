import { Cat, FileText, House } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import type { AssignedTask } from '../task-data'

export function TaskRecordActions({ task }: { task: AssignedTask }) {
  if (!task.reportTitle && !task.related.some((item) => item.id)) return null
  return <div role="group" aria-label={`Linked records for ${task.title}`} className="flex flex-wrap items-center gap-1">
    {task.reportId && task.reportTitle ? <Button variant="ghost" size="sm" render={<Link to={`/app/reports?report=${encodeURIComponent(task.reportId)}`} />} aria-label={`Open report: ${task.reportTitle}`} title={task.reportTitle}><FileText aria-hidden="true" />Report</Button> : null}
    {task.related.filter((item) => item.id && (item.type === 'cat' || item.type === 'colony')).map((item) => <Button key={`${item.type}-${item.id}`} variant="ghost" size="sm" render={<Link to={`/app/${item.type === 'cat' ? 'cats' : 'colonies'}/${encodeURIComponent(item.id!)}`} />} aria-label={`Open ${item.type}: ${item.label}`} title={item.label}>{item.type === 'cat' ? <Cat aria-hidden="true" /> : <House aria-hidden="true" />}{item.type === 'cat' ? 'Cat' : 'Colony'}</Button>)}
  </div>
}
