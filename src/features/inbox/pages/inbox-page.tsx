import { useRouteLoaderData } from 'react-router'
import type { SessionUser } from '../../../../shared/types/auth'
import { InboxScreen } from '../components/inbox-screen'

export function InboxPage() {
  const user = useRouteLoaderData('workspace') as SessionUser
  return <><title>Inbox · Mews</title><InboxScreen currentUser={user.name} /></>
}
