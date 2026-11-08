import { useRef } from 'react'
import { CheckCheck } from 'lucide-react'
import { useRouteLoaderData } from 'react-router'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Heading } from '@/components/ui/typography'
import { ColonyOverview } from '@/features/colonies/components/colony-overview'
import { colonySummary } from '@/features/colonies/directory-data'
import { useInbox } from '@/features/inbox/inbox-context'
import { TaskCards } from '@/features/tasks/components/task-cards'
import { getAssignedTasks, resolveTasks } from '@/features/tasks/task-data'
import { useTaskActions } from '@/features/tasks/use-task-actions'
import type { WorkspaceData } from '../../../../shared/types/directory'
import { CareProgress } from '../components/care-progress'
import { overviewProgress, workspaceDate } from '../progress-data'

export function OverviewPage() {
  const { user } = useRouteLoaderData('workspace') as WorkspaceData
  const { data, reports, tasks } = useInbox()
  const taskRegion = useRef<HTMLElement>(null)
  const resolved = resolveTasks(tasks, reports, data)
  const summaries = data.colonies.map((colony) => colonySummary(colony, data.cats, reports, resolved))
  const myTasks = getAssignedTasks(tasks, reports, data, user.id).filter((task) => task.status === 'open')
  const { changeTaskStatus, completionDialog } = useTaskActions(user.id, taskRegion)
  return <>
    <title>Overview · Mews</title>
    <div className="space-y-8">
      <section aria-labelledby="team-summary" className="space-y-3">
        <Heading id="team-summary" level={2} size="card">Team summary</Heading>
        <ColonyOverview summaries={summaries} openTaskCount={tasks.filter((task) => task.status === 'open').length} urgentReportCount={reports.filter((report) => report.urgent && report.status !== 'processed').length} />
      </section>
      <CareProgress progress={overviewProgress(reports, tasks, user.id, workspaceDate())} />
      <section ref={taskRegion} tabIndex={-1} aria-labelledby="overview-open-tasks" className="space-y-3 outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <Heading id="overview-open-tasks" level={2} size="card">My open tasks</Heading>
        {myTasks.length ? <TaskCards tasks={myTasks.slice(0, 3)} onStatusChange={changeTaskStatus} headingLevel={3} currentUser={user.id} /> : <Card><EmptyState icon={<CheckCheck />} title="No open tasks" /></Card>}
      </section>
    </div>
    {completionDialog}
  </>
}
