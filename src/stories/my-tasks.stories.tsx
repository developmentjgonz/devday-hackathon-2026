import { userPortraitUrl } from '../../seeds/user-portraits'
import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { createMemoryRouter, RouterProvider, type Params } from 'react-router'
import { AppLayout } from '@/components/layout/app-layout'
import { OverviewPage } from '@/features/overview/pages/overview-page'
import { InboxPage } from '@/features/inbox/pages/inbox-page'
import { MyTasksPage } from '@/features/tasks/pages/my-tasks-page'
import { TeamTasksPage } from '@/features/tasks/pages/team-tasks-page'
import { TaskPage } from '@/features/tasks/pages/task-page'
import { CatPage } from '@/features/cats/pages/cat-page'
import { CatsPage } from '@/features/cats/pages/cats-page'
import { ColonyPage } from '@/features/colonies/pages/colony-page'
import { ColoniesPage } from '@/features/colonies/pages/colonies-page'
import { inboxScenarioData, localInboxData } from '@/features/inbox/data/local-inbox'
import type { InboxData, Task } from '@/features/inbox/types'
import type { SessionUser } from '../../shared/types/auth'
import { storyDirectoryStore, storyWorkspace } from './fixtures/directory-store'
import { storyWorkspaceStore } from './fixtures/workspace-store'
import { waitForStoryRequest } from './fixtures/controlled-request'

const user: SessionUser = { id: 'storybook-member', name: 'Alex Morgan', email: 'alex@mews.test', phone: null, avatarUrl: userPortraitUrl('Alex Morgan'), role: 'administrator', status: 'active' }
const focusedTasks: Record<string, Omit<Task, 'reportId' | 'associations' | 'ownerId'>[]> = {
  'report-injury': [
    { id: 'care-check', title: 'Arrange a care check', owner: 'Alex Morgan', due: '2026-11-08', status: 'open' },
    { id: 'contact-vet', title: 'Contact the vet', owner: 'Sam Chen', due: '2026-11-08', status: 'open' },
  ],
  'report-kittens': [{ id: 'check-kittens', title: 'Confirm the kitten count', owner: 'Alex Morgan', due: '', status: 'open' }],
  'report-feeding': [{ id: 'restock', title: 'Restock the food container', owner: 'Alex Morgan', due: '2026-11-09', status: 'open' }],
  'report-waiting': [{ id: 'cover', title: 'Confirm evening cover', owner: 'Alex Morgan', due: '2026-11-07', status: 'completed', completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() }],
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

function MyTasksStory({ data = localInboxData, currentUser = user.name, initialPath = '/app/tasks', failTaskStatus = false, controlledTaskStatus = false, currentUserUnavailable = false, role = 'administrator' }: { data?: InboxData; currentUser?: string; initialPath?: string; failTaskStatus?: boolean; controlledTaskStatus?: boolean; currentUserUnavailable?: boolean; role?: SessionUser['role'] }) {
  const [router] = useState(() => {
    const workspace = storyWorkspace({ ...user, name: currentUser, role }, data)
    if (currentUserUnavailable) workspace.workspace.members = workspace.workspace.members.filter((member) => member.id !== user.id)
    const store = storyWorkspaceStore({ ...user, name: currentUser, role }, workspace.workspace)
    const workspaceStore = controlledTaskStatus ? { ...store, async changeTaskStatus(...args: Parameters<typeof store.changeTaskStatus>) {
      await waitForStoryRequest('storybook:release-task-status')
      if (failTaskStatus) throw new Error('Could not update task status.')
      return store.changeTaskStatus(...args)
    } } : store
    return createMemoryRouter([{
      id: 'workspace', path: '/app', loader: () => workspace, element: <AppLayout directoryStore={storyDirectoryStore} workspaceStore={workspaceStore} />, children: [
        { index: true, Component: OverviewPage, handle: { breadcrumb: 'Overview' } },
        { path: 'tasks', handle: { breadcrumb: 'My Tasks' }, children: [{ index: true, Component: MyTasksPage }, { path: ':taskId', Component: TaskPage, handle: { breadcrumb: 'Task' } }] },
        { path: 'team-tasks', Component: TeamTasksPage, handle: { breadcrumb: 'Team Tasks' } },
        { path: 'reports/:reportId?', Component: InboxPage, handle: { breadcrumb: 'Reports' } },
        { path: 'cats', handle: { breadcrumb: 'Cats' }, children: [
          { index: true, Component: CatsPage },
          { path: ':catId', Component: CatPage, handle: { breadcrumb: (params: Params, data: InboxData) => data.cats.find((cat) => cat.id === params.catId)?.name ?? 'Cat not found' } },
        ] },
        { path: 'colonies', handle: { breadcrumb: 'Colonies' }, children: [
          { index: true, Component: ColoniesPage },
          { path: ':colonyId', Component: ColonyPage, handle: { breadcrumb: (params: Params, data: InboxData) => data.colonies.find((colony) => colony.id === params.colonyId)?.name ?? 'Colony not found' } },
        ] },
      ],
    }], { initialEntries: [initialPath] })
  })
  return <RouterProvider router={router} />
}

const meta = {
  title: 'Pages/My Tasks',
  component: MyTasksStory,
  parameters: {
    layout: 'fullscreen',
    docs: { description: { component: 'The production My Tasks page and shared workspace layout. The workspace loader supplies the signed-in member. My Tasks shows only tasks assigned to the signed-in member. Team Tasks is an administrator view of all assignments, including tasks whose owners are unavailable for new work. It supports assignee and status filters in the shared Filters panel, assignee search, editing, and status changes. On phones, search fills the first row, with Filters and New task on the next row. Clearing filters preserves search. The Overview team card and workspace navigation open Team Tasks for administrators. Tasks can be created without a report and related to cats, colonies, people, paperwork, or other named items. Open tasks use a compact scrolling list on phones and a sortable table on desktop. Phone lists append 20 local rows at a time. Desktop tables keep paging controls. Task rows open details; editing and secondary record links remain in those details. Search matches task, report, and related item names. Due dates sort earliest first, with undated tasks last. Complete and Reopen update the Storybook store, with shared Sonner notifications. Report review status is independent. Links in task details open linked reports in the existing drawer and linked cats or colonies in their detail pages. Missing records get no action. Overview shows open tasks, tasks completed in the last 30 days, and reports pending review or waiting for details. The fictional Storybook records reset on refresh. The application saves task changes through the authenticated API using stable assignee IDs. Focused tasks covers open/completed tasks, another assignee, missing due dates, and a task on a processed report. Many tasks covers pagination. Long content covers narrow layouts. Empty has no tasks for the current member. The shared top bar remains the only page heading. Delayed task status waits up to 30 seconds for loading checks; tests can release it sooner.' } },
  },
} satisfies Meta<typeof MyTasksStory>
export default meta
type Story = StoryObj<typeof meta>

export const MyTasks: Story = {}
export const TeamTasks: Story = { args: { data: focusedData, initialPath: '/app/team-tasks' } }
export const TeamTasksUnavailableAssignee: Story = { args: { data: focusedData, initialPath: '/app/team-tasks', currentUserUnavailable: true } }
export const TeamTasksMemberAccess: Story = { args: { data: focusedData, initialPath: '/app/team-tasks', role: 'member' } }
export const MemberTasks: Story = { args: { data: focusedData, role: 'member' } }
export const EmptyTeamTasks: Story = { args: { data: { ...focusedData, tasks: [] }, initialPath: '/app/team-tasks' } }
export const FocusedTasks: Story = { args: { data: focusedData }, parameters: { docs: { description: { story: 'Task details and editing share a compact title bar. Linked-record context scrolls after the main fields, so adding a related item does not move the title, assignee, or due date. Create, edit, complete with a note, reopen, and return to the list with these fictional tasks.' } } } }
export const DelayedTaskStatus: Story = { args: { data: focusedData, controlledTaskStatus: true } }
export const FailedTaskStatus: Story = { args: { data: focusedData, controlledTaskStatus: true, failTaskStatus: true } }
export const ProgressOverview: Story = { args: { data: focusedData, initialPath: '/app' } }
export const NoTasksOverview: Story = { args: { data: { ...focusedData, tasks: [] }, initialPath: '/app' } }
export const DifferentAssignee: Story = { args: { data: focusedData, currentUser: 'Sam Chen' } }
export const UnavailableAssignee: Story = { args: { data: focusedData, currentUserUnavailable: true } }
export const UnavailableCareAssignee: Story = { args: { data: focusedData, currentUserUnavailable: true, initialPath: '/app/cats/pepper' } }
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
