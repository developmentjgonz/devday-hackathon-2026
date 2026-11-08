import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { AppLayout } from '@/components/layout/app-layout'
import { InboxScreen } from '@/features/inbox/components/inbox-screen'
import { inboxScenarioData } from '@/features/inbox/data/local-inbox'
import type { InboxData } from '@/features/inbox/types'
import { MyTasksPage } from '@/features/tasks/pages/my-tasks-page'
import type { SessionUser } from '../../shared/types/auth'
import { storyDirectoryStore, storyWorkspace } from './fixtures/directory-store'
import { storyWorkspaceStore } from './fixtures/workspace-store'

const user: SessionUser = { id: 'storybook-member', name: 'Alex Morgan', email: 'alex@mews.test', phone: null, role: 'administrator', status: 'active' }
const data: InboxData = {
  ...inboxScenarioData,
  reports: inboxScenarioData.reports.map((report) => report.id === 'report-kittens' ? { ...report, unread: false } : report),
  tasks: [
    { id: 'task-today', title: 'Call the clinic', owner: 'Alex Morgan', ownerId: user.id, due: '2026-11-07', status: 'open', associations: [] },
    { id: 'task-overdue', title: 'Check the shelter', owner: 'Alex Morgan', ownerId: user.id, due: '2026-11-06', status: 'open', associations: [] },
    { id: 'task-future', title: 'Bring food tomorrow', owner: 'Alex Morgan', ownerId: user.id, due: '2026-11-08', status: 'open', associations: [] },
    { id: 'task-other', title: 'Another member’s task', owner: 'Maya Rivera', ownerId: 'story:Maya Rivera', due: '2026-11-06', status: 'open', associations: [] },
    { id: 'task-complete', title: 'Finished task', owner: 'Alex Morgan', ownerId: user.id, due: '2026-11-06', status: 'completed', associations: [] },
  ],
}
type Scenario = 'default' | 'empty' | 'refresh-error' | 'read-error' | 'stale-refresh' | 'incoming' | 'many' | 'bulk-read-error'
function NotificationsStory({ scenario = 'default' }: { scenario?: Scenario }) {
  const [router] = useState(() => {
    const fixture = scenario === 'empty' || scenario === 'refresh-error' || scenario === 'incoming' ? { ...data, reports: [], tasks: [] } : scenario === 'many' || scenario === 'bulk-read-error' ? {
      ...data, tasks: [], reports: Array.from({ length: 105 }, (_, index) => ({ ...data.reports[0]!, id: `many-${index}`, title: `Report ${index + 1}`, urgent: false, unread: true })),
    } : data
    const workspace = storyWorkspace(user, fixture)
    const store = storyWorkspaceStore(user, workspace.workspace)
    let failedRefresh = false
    let failedRead = false
    let readCalls = 0
    let receivedReport = false
    const getSnapshot = store.getSnapshot
    const markReports = store.markReports
    store.getSnapshot = async (signal) => {
      if (scenario === 'refresh-error' && !failedRefresh) { failedRefresh = true; throw new Error('Refresh failed') }
      if (scenario === 'incoming' && !receivedReport) {
        receivedReport = true
        await store.createReport({ title: 'New feeding update', message: 'Fresh water is available.', colonyId: 'canal', catId: '', urgent: false }, [])
      }
      const snapshot = await getSnapshot(signal)
      if (scenario === 'stale-refresh') await new Promise((resolve) => setTimeout(resolve, 800))
      return snapshot
    }
    store.markReports = async (ids, unread) => {
      if (scenario === 'read-error' && !failedRead) { failedRead = true; throw new Error('Read update failed') }
      if (scenario === 'bulk-read-error' && ++readCalls === 2) throw new Error('Read update failed')
      await markReports(ids, unread)
    }
    return createMemoryRouter([{ id: 'workspace', path: '/app', loader: () => workspace, element: <AppLayout directoryStore={storyDirectoryStore} workspaceStore={store} />, children: [
      { path: 'reports', element: <InboxScreen />, handle: { breadcrumb: 'Reports' } },
      { path: 'tasks', Component: MyTasksPage, handle: { breadcrumb: 'My Tasks' } },
    ] }], { initialEntries: ['/app/reports'] })
  })
  return <RouterProvider router={router} />
}

const meta = {
  title: 'Pages/Notifications', component: NotificationsStory,
  parameters: { layout: 'fullscreen', docs: { description: { component: 'The workspace notification drawer groups urgent reports, unread reports, and the signed-in member’s tasks due today or overdue. A report can be marked read here or opened for review. Urgent reports remain visible until review is complete. Task links open the selected task. The bell counts each item once. The app refreshes workspace records while visible and when the drawer opens; failed updates can be retried. These stories use an isolated in-memory workspace.' } } },
} satisfies Meta<typeof NotificationsStory>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Empty: Story = { args: { scenario: 'empty' } }
export const RefreshError: Story = { args: { scenario: 'refresh-error' } }
export const ReadError: Story = { args: { scenario: 'read-error' } }
export const StaleRefresh: Story = { args: { scenario: 'stale-refresh' } }
export const IncomingReport: Story = { args: { scenario: 'incoming' } }
export const ManyReports: Story = { args: { scenario: 'many' } }
export const BulkReadError: Story = { args: { scenario: 'bulk-read-error' } }
