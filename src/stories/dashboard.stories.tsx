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

const user: SessionUser = { id: 'storybook-member', name: 'Maya Rivera', email: 'maya@mews.test', phone: null, role: 'member', status: 'active' }
function DashboardStory() {
  const [router] = useState(() => createMemoryRouter([
    { path: '/app', id: 'workspace', loader: () => user, Component: AppLayout, children: [
      { index: true, Component: OverviewPage, handle: { breadcrumb: 'Overview' } },
      { path: 'tasks', Component: MyTasksPage, handle: { breadcrumb: 'My Tasks' } },
      { path: 'reports', Component: InboxPage, handle: { breadcrumb: 'Reports' } },
      { path: '*', element: <NotFoundPage homePath="/app" /> },
    ] },
    { path: '/', Component: SiteLayout, children: [{ index: true, Component: LandingPage }] },
  ], { initialEntries: ['/app'] }))
  return <RouterProvider router={router} />
}
const meta = {
  title: 'Pages/Dashboard',
  component: DashboardStory,
  parameters: { layout: 'fullscreen', docs: { description: { component: 'The production overview inside the shared workspace layout. The sticky header contains the single page heading on the left, with New report and notifications on the right. Sidebar navigation opens the real Inbox screen. This story supplies a fictional signed-in user and local reports. It does not make account requests or persist records.' } } },
} satisfies Meta<typeof DashboardStory>
export default meta
type Story = StoryObj<typeof meta>
export const Overview: Story = {}
