import { useRevalidator, useRouteLoaderData } from 'react-router'
import type { SessionUser } from '../../../../shared/types/auth'
import type { WorkspaceData } from '../../../../shared/types/directory'
import { authRequest } from '../auth'
import { ProfileScreen } from '../components/profile-screen'
import { useInbox } from '@/features/inbox/inbox-context'

export function ProfilePage() {
  const { user } = useRouteLoaderData('workspace') as WorkspaceData
  const { revalidate } = useRevalidator()
  const { refreshWorkspace } = useInbox()
  return <ProfileScreen key={user.id} user={user} onSave={async (profile) => {
    const result = await authRequest<{ user: SessionUser }>('/api/auth/profile', { method: 'PATCH', body: JSON.stringify(profile) })
    void revalidate()
    void refreshWorkspace()
    return result.user
  }} />
}
