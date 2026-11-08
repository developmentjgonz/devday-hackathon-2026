import { ListTodo } from 'lucide-react'
import { Link } from 'react-router'
import { RecordList, RecordListItem } from '@/components/ui/record-list'
import { Disclosure } from '@/components/ui/disclosure'
import { EmptyState } from '@/components/ui/empty-state'
import { Heading, Text } from '@/components/ui/typography'
import { useTaskDetailLink } from '@/features/tasks/components/task-detail-context'
import { formatTaskDue, type AssignedTask } from '@/features/tasks/task-data'

export function RecordTasks({ tasks, type, alignHeadingWithAction = false }: { tasks: AssignedTask[]; type: 'cat' | 'colony'; alignHeadingWithAction?: boolean }) {
  const taskLink = useTaskDetailLink()
  const openTasks = tasks.filter((task) => task.status === 'open')
  const completedTasks = tasks.filter((task) => task.status === 'completed')
  const list = (items: AssignedTask[]) => <RecordList items={items} getKey={(task) => task.id} label="Tasks" itemName="task"
    renderItem={(task) => <RecordListItem title={task.title}
      render={<Link {...taskLink(task.id, `record-task:${task.id}`)} />} aria-label={`View task: ${task.title}`}
      meta={`Assigned to ${task.owner} · ${task.due ? `Due ${formatTaskDue(task.due)}` : 'No due date'}`}
      description={task.careRuleId ? 'Care schedule' : undefined} />} />
  return <div tabIndex={-1} className="space-y-6 outline-none focus-visible:ring-2 focus-visible:ring-ring">
    <section aria-labelledby={`${type}-open-tasks`} className="space-y-3">
      <div className={alignHeadingWithAction ? 'lg:flex lg:min-h-(--control-height-sm) lg:items-center' : undefined}><Heading id={`${type}-open-tasks`} level={2} size="card">Open tasks</Heading></div>
      {openTasks.length ? list(openTasks) : <EmptyState icon={<ListTodo />} title="No open tasks" />}
    </section>
    {completedTasks.length ? <section aria-labelledby={`${type}-completed-tasks`}>
      <Disclosure titleHeadingLevel={2} title={<><span id={`${type}-completed-tasks`}>Completed tasks</span> <Text render={<span />} size="caption" tone="muted">({completedTasks.length})</Text></>}>
        {list(completedTasks)}
      </Disclosure>
    </section> : null}
  </div>
}
