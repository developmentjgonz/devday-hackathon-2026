import { useRouteLoaderData } from 'react-router'
import { useInbox } from '@/features/inbox/inbox-context'
import type { WorkspaceData } from '../../../../shared/types/directory'
import { CareProgress } from '../components/care-progress'
import { TeamWins } from '../components/team-wins'
import { overviewProgress, workspaceDate } from '../progress-data'

export function OverviewPage() {
  const { user } = useRouteLoaderData('workspace') as WorkspaceData
  const { reports, tasks } = useInbox()
  return <>
    <title>Overview · Mews</title>
    <div className="space-y-6">
      <CareProgress progress={overviewProgress(reports, tasks, user.id, workspaceDate())} />
      <TeamWins tasks={tasks} />
    </div>
  </>
}
