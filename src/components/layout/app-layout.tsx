import { useMemo } from 'react'
import { Outlet, useLoaderData, useMatches } from 'react-router'
import { AppSidebar } from './app-sidebar'
import type { SessionUser } from '../../../shared/types/auth'
import type { WorkspaceData } from '../../../shared/types/directory'
import { InboxProvider, useInbox } from '@/features/inbox/inbox-context'
import { WorkspaceToolbar } from '@/features/inbox/components/workspace-toolbar'
import { ReportComposerProvider } from '@/features/inbox/components/report-composer'
import type { InboxData } from '@/features/inbox/types'
import type { Params } from 'react-router'
import { databaseDirectory, type DirectoryStore } from '@/features/colonies/directory-api'
import { databaseWorkspace, type WorkspaceStore } from '@/features/inbox/workspace-api'

type WorkspaceHandle = { breadcrumb?: string | ((params: Params, data: InboxData) => string) }

export function AppLayout({ directoryStore = databaseDirectory, workspaceStore = databaseWorkspace }: { directoryStore?: DirectoryStore; workspaceStore?: WorkspaceStore }) {
  const { user, directory, workspace } = useLoaderData() as WorkspaceData
  const data = useMemo(() => ({ ...directory, reports: workspace.reports, tasks: workspace.tasks, members: workspace.members.map((member) => member.name) }), [directory, workspace])
  return (
    <InboxProvider data={data} workspace={workspace} directoryStore={directoryStore} workspaceStore={workspaceStore}>
      <ReportComposerProvider>
        <WorkspaceFrame user={user} />
      </ReportComposerProvider>
    </InboxProvider>
  )
}

function WorkspaceFrame({ user }: { user: SessionUser }) {
  const { data } = useInbox()
  const breadcrumbs = useMatches().flatMap((match) => {
    const handle = match.handle as WorkspaceHandle | undefined
    const label = typeof handle?.breadcrumb === 'function'
      ? handle.breadcrumb(match.params, data)
      : handle?.breadcrumb
    return label ? [{ label, to: match.pathname }] : []
  })
  const title = breadcrumbs.at(-1)?.label ?? 'Page not found'
  return (
    <div className="min-h-svh bg-background text-foreground [--workspace-header-offset:calc(var(--control-height)+var(--spacing)*3+1px)] md:[--workspace-header-offset:0px] md:grid md:grid-cols-[248px_minmax(0,1fr)]">
      <AppSidebar user={user} />
      <div className="min-w-0">
        <WorkspaceToolbar title={title} breadcrumbs={breadcrumbs.slice(0, -1)} currentUser={user.id} />
        <main id="main-content" aria-labelledby="workspace-page-title" tabIndex={-1} className="mx-auto max-w-[1240px] px-6 py-6 outline-none sm:px-10 lg:px-12">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
