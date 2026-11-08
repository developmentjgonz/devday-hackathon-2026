import { ShieldCheck } from 'lucide-react'
import { useRouteLoaderData } from 'react-router'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import type { WorkspaceData } from '../../../../shared/types/directory'
import { MyTasksScreen } from '../components/my-tasks-screen'

export function TeamTasksPage() {
  const { user } = useRouteLoaderData('workspace') as WorkspaceData
  return <>
    <title>Team Tasks · Mews</title>
    {user.role === 'administrator'
      ? <MyTasksScreen currentUser={user.id} scope="team" />
      : <Card><EmptyState icon={<ShieldCheck />} title="Administrator access required" description="Ask an administrator if you need help with team assignments." /></Card>}
  </>
}
