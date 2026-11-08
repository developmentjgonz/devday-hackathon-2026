import { Link, useRouteLoaderData } from 'react-router'
import { TextLink } from '@/components/ui/text-link'
import { useInbox } from '@/features/inbox/inbox-context'
import type { WorkspaceData } from '../../../../shared/types/directory'
import { WorkspaceSummary } from '../components/workspace-summary'
import { TeamWins } from '../components/team-wins'
import { overviewSummary } from '../overview-data'

export function OverviewPage() {
  const { user } = useRouteLoaderData('workspace') as WorkspaceData
  const { reports, tasks } = useInbox()
  const summary = overviewSummary(reports, tasks, user.id)
  return <>
    <title>Overview · Mews</title>
    <div className="space-y-6">
      <WorkspaceSummary summary={summary} canViewTeamTasks={user.role === 'administrator'} />
      {user.role === 'administrator' ? <TextLink render={<Link to="/app/statistics" />}>View statistics</TextLink> : null}
      <TeamWins tasks={summary.recentlyCompleted} />
    </div>
  </>
}
