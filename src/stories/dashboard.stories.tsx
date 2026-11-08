import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { OverviewPage } from '@/features/overview/pages/overview-page'
import { LandingPage } from '@/features/landing/pages/landing-page'
import { SiteLayout } from '@/components/layout/site-layout'
import { AppLayout } from '@/components/layout/app-layout'
import { InboxPage } from '@/features/inbox/pages/inbox-page'
import { MyTasksPage } from '@/features/tasks/pages/my-tasks-page'
import { NotFoundPage } from '@/pages/not-found-page'
import type { SessionUser } from '../../shared/types/auth'
import { localInboxData } from '@/features/inbox/data/local-inbox'
import { storyDirectoryStore, storyWorkspace } from './fixtures/directory-store'
import { storyWorkspaceStore } from './fixtures/workspace-store'
import { storyPublicContent } from './fixtures/public-content'

const user: SessionUser = { id: 'storybook-member', name: 'Maya Rivera', email: 'maya@mews.test', phone: null, role: 'member', status: 'active' }
function DashboardStory() {
  const [router] = useState(() => createMemoryRouter([
    { path: '/app', id: 'workspace', loader: () => storyWorkspace(user, localInboxData), element: <AppLayout directoryStore={storyDirectoryStore} workspaceStore={storyWorkspaceStore(user, storyWorkspace(user, localInboxData).workspace)} />, children: [
      { index: true, Component: OverviewPage, handle: { breadcrumb: 'Overview' } },
      { path: 'tasks', Component: MyTasksPage, handle: { breadcrumb: 'My Tasks' } },
      { path: 'reports', Component: InboxPage, handle: { breadcrumb: 'Reports' } },
      { path: '*', element: <NotFoundPage homePath="/app" /> },
    ] },
    { path: '/', Component: SiteLayout, children: [{ index: true, element: <LandingPage initialContent={storyPublicContent} /> }] },
  ], { initialEntries: ['/app'] }))
  return <RouterProvider router={router} />
}
const meta = {
  title: 'Pages/Dashboard',
  component: DashboardStory,
  parameters: { layout: 'fullscreen', docs: { description: { component: 'The workspace overview shows personal, team, and report completion progress. It links to My Tasks and Reports and keeps full lists on those pages. Storybook uses isolated fictional records.' } } },
} satisfies Meta<typeof DashboardStory>
export default meta
type Story = StoryObj<typeof meta>
export const Overview: Story = {}
