import { Outlet, useLoaderData } from 'react-router'
import { AppSidebar } from './app-sidebar'
import type { SessionUser } from '../../../shared/types/auth'
import { InboxProvider } from '@/features/inbox/inbox-context'
import { localInboxData } from '@/features/inbox/data/local-inbox'
import { WorkspaceToolbar } from '@/features/inbox/components/workspace-toolbar'
import type { InboxData } from '@/features/inbox/types'

export function AppLayout({ inboxData = localInboxData }: { inboxData?: InboxData }) {
  const user = useLoaderData() as SessionUser
  return (
    <InboxProvider data={inboxData}>
    <div className="min-h-svh bg-background text-foreground md:grid md:grid-cols-[248px_minmax(0,1fr)]">
      <AppSidebar user={user} />
      <div className="min-w-0">
        <WorkspaceToolbar currentUser={user.name} />
        <main id="main-content" tabIndex={-1} className="mx-auto max-w-[1240px] px-6 py-6 outline-none sm:px-10 lg:px-12">
          <Outlet />
        </main>
      </div>
    </div>
    </InboxProvider>
  )
}
