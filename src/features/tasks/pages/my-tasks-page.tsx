import { useRouteLoaderData } from 'react-router'
import type { SessionUser } from '../../../../shared/types/auth'
import { MyTasksScreen } from '../components/my-tasks-screen'

export function MyTasksPage() {
  const user = useRouteLoaderData('workspace') as SessionUser
  return <><title>My Tasks · Mews</title><MyTasksScreen currentUser={user.name} /></>
}
