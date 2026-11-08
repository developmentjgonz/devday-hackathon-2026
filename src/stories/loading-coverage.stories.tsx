import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { AppLayout } from '@/components/layout/app-layout'
import { InboxScreen } from '@/features/inbox/components/inbox-screen'
import { inboxScenarioData } from '@/features/inbox/data/local-inbox'
import type { SessionUser } from '../../shared/types/auth'
import { waitForStoryRequest } from './fixtures/controlled-request'
import { storyDirectoryStore, storyWorkspace } from './fixtures/directory-store'
import { storyWorkspaceStore } from './fixtures/workspace-store'

const user: SessionUser = { id: 'storybook-member', name: 'Alex Morgan', email: 'alex@mews.test', phone: null, role: 'administrator', status: 'active' }

function DelayedReportsStory() {
  const [router] = useState(() => {
    const workspace = storyWorkspace(user, inboxScenarioData)
    const store = storyWorkspaceStore(user, workspace.workspace)
    const delayed = {
      ...store,
      async markReports(...args: Parameters<typeof store.markReports>) { await waitForStoryRequest('storybook:release-report-write'); return store.markReports(...args) },
      async createReport(...args: Parameters<typeof store.createReport>) { await waitForStoryRequest('storybook:release-report-write'); return store.createReport(...args) },
    }
    return createMemoryRouter([{ id: 'workspace', path: '/app', loader: () => workspace, element: <AppLayout directoryStore={storyDirectoryStore} workspaceStore={delayed} />, children: [
      { path: 'reports', element: <InboxScreen />, handle: { breadcrumb: 'Reports' } },
    ] }], { initialEntries: ['/app/reports'] })
  })
  return <RouterProvider router={router} />
}

const meta = {
  title: 'Feedback/Loading coverage', component: DelayedReportsStory,
  parameters: { layout: 'fullscreen', docs: { description: { component: 'A fictional report workspace with controlled slow saves. Requests wait up to 30 seconds for inspection; tests can release them sooner.' } } },
} satisfies Meta<typeof DelayedReportsStory>
export default meta
type Story = StoryObj<typeof meta>
export const DelayedReports: Story = {}
