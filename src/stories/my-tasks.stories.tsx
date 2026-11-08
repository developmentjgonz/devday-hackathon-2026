import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { createMemoryRouter, RouterProvider, type Params } from 'react-router'
import { AppLayout } from '@/components/layout/app-layout'
import { OverviewPage } from '@/features/overview/pages/overview-page'
import { InboxPage } from '@/features/inbox/pages/inbox-page'
import { MyTasksPage } from '@/features/tasks/pages/my-tasks-page'
import { CatPage } from '@/features/cats/pages/cat-page'
import { CatsPage } from '@/features/cats/pages/cats-page'
import { ColonyPage } from '@/features/colonies/pages/colony-page'
import { ColoniesPage } from '@/features/colonies/pages/colonies-page'
import { inboxScenarioData, localInboxData } from '@/features/inbox/data/local-inbox'
import type { InboxData, Task } from '@/features/inbox/types'
import type { SessionUser } from '../../shared/types/auth'
import { storyDirectoryStore, storyWorkspace } from './fixtures/directory-store'
import { storyWorkspaceStore } from './fixtures/workspace-store'

const user: SessionUser = { id: 'storybook-member', name: 'Alex Morgan', email: 'alex@mews.test', phone: null, role: 'administrator', status: 'active' }
const focusedTasks: Record<string, Omit<Task, 'reportId' | 'associations' | 'ownerId'>[]> = {
  'report-injury': [
    { id: 'care-check', title: 'Arrange a care check', owner: 'Alex Morgan', due: '2026-11-08', status: 'open' },
    { id: 'contact-vet', title: 'Contact the vet', owner: 'Sam Chen', due: '2026-11-08', status: 'open' },
  ],
  'report-kittens': [{ id: 'check-kittens', title: 'Confirm the kitten count', owner: 'Alex Morgan', due: '', status: 'open' }],
  'report-feeding': [{ id: 'restock', title: 'Restock the food container', owner: 'Alex Morgan', due: '2026-11-09', status: 'open' }],
  'report-waiting': [{ id: 'cover', title: 'Confirm evening cover', owner: 'Alex Morgan', due: '2026-11-07', status: 'completed' }],
}
const focusedData: InboxData = {
  ...inboxScenarioData,
  reports: inboxScenarioData.reports.map((report) => ({
    ...report,
    attachments: [],
    status: report.id === 'report-feeding' ? 'processed' : report.status,
  })),
  tasks: Object.entries(focusedTasks).flatMap(([reportId, tasks]) => tasks.map((task) => ({ ...task, ownerId: `story:${task.owner}`, reportId, associations: [] }))),
}

function MyTasksStory({ data = localInboxData, currentUser = user.name, initialPath = '/app/tasks' }: { data?: InboxData; currentUser?: string; initialPath?: string }) {
  const [router] = useState(() => createMemoryRouter([{
    id: 'workspace', path: '/app', loader: () => storyWorkspace({ ...user, name: currentUser }, data), element: <AppLayout directoryStore={storyDirectoryStore} workspaceStore={storyWorkspaceStore({ ...user, name: currentUser }, storyWorkspace({ ...user, name: currentUser }, data).workspace)} />, children: [
      { index: true, Component: OverviewPage, handle: { breadcrumb: 'Overview' } },
      { path: 'tasks', Component: MyTasksPage, handle: { breadcrumb: 'My Tasks' } },
      { path: 'reports', Component: InboxPage, handle: { breadcrumb: 'Reports' } },
      { path: 'cats', handle: { breadcrumb: 'Cats' }, children: [
        { index: true, Component: CatsPage },
        { path: ':catId', Component: CatPage, handle: { breadcrumb: (params: Params, data: InboxData) => data.cats.find((cat) => cat.id === params.catId)?.name ?? 'Cat not found' } },
      ] },
      { path: 'colonies', handle: { breadcrumb: 'Colonies' }, children: [
        { index: true, Component: ColoniesPage },
        { path: ':colonyId', Component: ColonyPage, handle: { breadcrumb: (params: Params, data: InboxData) => data.colonies.find((colony) => colony.id === params.colonyId)?.name ?? 'Colony not found' } },
      ] },
    ],
  }], { initialEntries: [initialPath] }))
  return <RouterProvider router={router} />
}

const meta = {
  title: 'Pages/My Tasks',
  component: MyTasksStory,
  parameters: {
    layout: 'fullscreen',
    docs: { description: { component: 'The production My Tasks page and shared workspace layout. The workspace loader supplies the signed-in member. Only tasks assigned to the signed-in member appear. Tasks can be created without a report and related to cats, colonies, people, paperwork, or other named items. Open tasks appear in a note card view by default; the toolbar switches between cards and a sortable table while preserving filters and pagination. The browser remembers the selected view. Search matches task, report, and related item names. Due dates sort earliest first, with undated tasks last. Complete and Reopen update the Storybook store, with shared Sonner notifications. Report review status is independent. Small labelled actions open linked reports in the existing drawer and linked cats or colonies in their detail pages. Missing records get no action. Overview shows current personal, team, and report completion totals without time-based productivity claims. The fictional Storybook records reset on refresh. The application saves task changes through the authenticated API using stable assignee IDs. Focused tasks covers open/completed tasks, another assignee, missing due dates, and a task on a processed report. Many tasks covers pagination. Long content covers narrow layouts. Empty has no tasks for the current member. The shared top bar remains the only page heading.' } },
  },
} satisfies Meta<typeof MyTasksStory>
export default meta
type Story = StoryObj<typeof meta>

export const MyTasks: Story = {}
export const FocusedTasks: Story = { args: { data: focusedData } }
export const ProgressOverview: Story = { args: { data: focusedData, initialPath: '/app' } }
export const NoTasksOverview: Story = { args: { data: { ...focusedData, tasks: [] }, initialPath: '/app' } }
export const DifferentAssignee: Story = { args: { data: focusedData, currentUser: 'Sam Chen' } }
export const Empty: Story = { args: { data: { ...inboxScenarioData, tasks: [] } } }
export const UnlinkedRecords: Story = { args: { data: { ...focusedData, reports: [{ ...focusedData.reports.find((report) => report.id === 'report-location')!, catId: 'missing-cat' }], tasks: [{ id: 'find-location', reportId: 'report-location', title: 'Confirm the location', owner: user.name, ownerId: user.id, due: '', status: 'open', associations: [] }] } } }
export const ManyTasks: Story = { args: { data: {
  ...focusedData,
  reports: [focusedData.reports[0]!], tasks: Array.from({ length: 11 }, (_, index) => ({ id: `care-${index + 1}`, reportId: focusedData.reports[0]!.id, title: `Colony care task ${String(index + 1).padStart(2, '0')}`, owner: user.name, ownerId: user.id, due: '2026-11-08', status: 'open' as const, associations: [] })),
} } }
export const LongContent: Story = { args: { data: {
  ...focusedData,
  colonies: [{ id: 'riverside', name: 'Riverside community garden behind the old railway station' }],
  reports: [{ ...focusedData.reports[0]!, title: 'Follow-up observation at the feeding station behind the community garden after the evening visit' }], tasks: [{ id: 'long-care', reportId: focusedData.reports[0]!.id, title: 'Check appetite, movement, shelter bedding, food supplies, and clean water during the next colony visit', owner: user.name, ownerId: user.id, due: '2026-11-08', status: 'open', associations: [] }],
} } }
