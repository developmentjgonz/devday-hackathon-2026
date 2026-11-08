import { useRouteLoaderData } from 'react-router'
import type { WorkspaceData } from '../../../../shared/types/directory'
import { MyTasksScreen } from '../components/my-tasks-screen'

export function MyTasksPage() {
  const { user } = useRouteLoaderData('workspace') as WorkspaceData
  return <><title>My Tasks · Mews</title><MyTasksScreen currentUser={user.id} /></>
}
