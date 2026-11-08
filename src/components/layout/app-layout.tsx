import { useMemo, useRef } from 'react'
import { useLoaderData, useLocation, useMatches, useOutlet } from 'react-router'
import { AppSidebar } from './app-sidebar'
import { Brand } from '@/components/brand'
import { MobileWorkspaceMenu } from './mobile-workspace-menu'
import type { SessionUser } from '../../../shared/types/auth'
import type { WorkspaceData } from '../../../shared/types/directory'
import { InboxProvider, useInbox } from '@/features/inbox/inbox-context'
import { WorkspaceHeader } from '@/components/ui/workspace-header'
import { ReportComposerProvider } from '@/features/inbox/components/report-composer'
import { ReportDetailProvider } from '@/features/inbox/components/report-detail-context'
import { ReportDetailHost } from '@/features/inbox/components/report-detail-host'
import { detailBackgroundKey } from './detail-route'
import { TaskDetailProvider } from '@/features/tasks/components/task-detail-context'
import { TaskDetailHost } from '@/features/tasks/components/task-detail-host'
import type { InboxData } from '@/features/inbox/types'
import type { Params } from 'react-router'
import { googleMapsEnabled } from '@/lib/google-maps'
import { databaseDirectory, type DirectoryStore } from '@/features/colonies/directory-api'
import { databaseWorkspace, type WorkspaceStore } from '@/features/inbox/workspace-api'

type WorkspaceHandle = { breadcrumb?: string | ((params: Params, data: InboxData) => string) }

export function AppLayout({ directoryStore = databaseDirectory, workspaceStore = databaseWorkspace }: { directoryStore?: DirectoryStore; workspaceStore?: WorkspaceStore }) {
  const { user, directory, workspace } = useLoaderData() as WorkspaceData
  const location = useLocation()
  const lastPageKey = useRef(location.key)
  const backgroundKey = detailBackgroundKey(location.state)
  if (!backgroundKey) lastPageKey.current = location.key
  const hasBackground = backgroundKey !== null && backgroundKey === lastPageKey.current
  const data = useMemo(() => ({ ...directory, reports: workspace.reports, tasks: workspace.tasks, members: workspace.members.map((member) => member.name) }), [directory, workspace])
  return (
    <InboxProvider data={data} workspace={workspace} directoryStore={directoryStore} workspaceStore={workspaceStore} googleMapsEnabled={directoryStore === databaseDirectory && googleMapsEnabled}>
      <ReportDetailProvider>
        <TaskDetailProvider hasBackground={hasBackground}>
          <ReportComposerProvider>
            <WorkspaceFrame user={user} />
            <ReportDetailHost />
            <TaskDetailHost />
          </ReportComposerProvider>
        </TaskDetailProvider>
      </ReportDetailProvider>
    </InboxProvider>
  )
}

function WorkspaceFrame({ user }: { user: SessionUser }) {
  const { data } = useInbox()
  const location = useLocation()
  const outlet = useOutlet()
  const breadcrumbs = useMatches().flatMap((match) => {
    const handle = match.handle as WorkspaceHandle | undefined
    const label = typeof handle?.breadcrumb === 'function'
      ? handle.breadcrumb(match.params, data)
      : handle?.breadcrumb
    return label ? [{ label, to: match.pathname }] : []
  })
  const background = useRef({ key: location.key, outlet, breadcrumbs })
  const backgroundKey = detailBackgroundKey(location.state)
  if (!backgroundKey) background.current = { key: location.key, outlet, breadcrumbs }
  const frame = backgroundKey === background.current.key ? background.current : { outlet, breadcrumbs }
  const title = frame.breadcrumbs.at(-1)?.label ?? 'Page not found'
  return (
    <div className="min-h-svh bg-background text-foreground md:grid md:grid-cols-[248px_minmax(0,1fr)]">
      <AppSidebar user={user} />
      <div className="min-w-0">
        <WorkspaceHeader title={title} breadcrumbs={frame.breadcrumbs.slice(0, -1)} mobileStart={<Brand to="/app" variant="mark" />} mobileEnd={<MobileWorkspaceMenu user={user} />} />
        <main id="main-content" aria-labelledby="workspace-page-title" tabIndex={-1} className="mx-auto max-w-[1240px] px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] outline-none sm:px-10 sm:py-6 lg:px-12">
          {frame.outlet}
        </main>
      </div>
    </div>
  )
}
