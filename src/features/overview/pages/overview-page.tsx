import { useState } from 'react'
import { useRouteLoaderData } from 'react-router'
import { Heading } from '@/components/ui/typography'
import { useInbox } from '@/features/inbox/inbox-context'
import { MyTasksScreen } from '@/features/tasks/components/my-tasks-screen'
import type { WorkspaceData } from '../../../../shared/types/directory'
import { WorkspaceSummary } from '../components/workspace-summary'
import { TeamWins } from '../components/team-wins'
import { overviewProgress, workspaceDate } from '../progress-data'

export function OverviewPage() {
  const { user } = useRouteLoaderData('workspace') as WorkspaceData
  const { reports, tasks } = useInbox()
  const [tasksOpen, setTasksOpen] = useState(false)
  const summary = overviewProgress(reports, tasks, user.id, workspaceDate())
  function toggleTasks() {
    setTasksOpen((open) => !open)
  }
  return <>
    <title>Overview · Mews</title>
    <div className="space-y-6">
      <WorkspaceSummary summary={summary} tasksOpen={tasksOpen} onToggleTasks={toggleTasks} />
      {tasksOpen ? <div id="overview-tasks" tabIndex={-1} className="space-y-3 outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <Heading level={2} size="section">My tasks</Heading>
        <MyTasksScreen currentUser={user.id} cardHeadingLevel={3} />
      </div> : <div id="overview-tasks" hidden />}
      <TeamWins tasks={tasks} />
    </div>
  </>
}
