import { userPortraitUrl } from '../../seeds/user-portraits'
import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { AppLayout } from '@/components/layout/app-layout'
import { localInboxData } from '@/features/inbox/data/local-inbox'
import { InboxPage } from '@/features/inbox/pages/inbox-page'
import { MyTasksPage } from '@/features/tasks/pages/my-tasks-page'
import { TeamTasksPage } from '@/features/tasks/pages/team-tasks-page'
import { TaskPage } from '@/features/tasks/pages/task-page'
import { UsersPage } from '@/features/users/pages/users-page'
import type { UserStore } from '@/features/users/users-api'
import type { ManagedUser, SessionUser } from '../../shared/types/auth'
import { storyDirectoryStore, storyWorkspace } from './fixtures/directory-store'
import { storyWorkspaceStore } from './fixtures/workspace-store'

const admin: SessionUser = { id: 'alex', name: 'Alex Morgan', email: 'alex@mews.test', phone: null, avatarUrl: userPortraitUrl('Alex Morgan'), role: 'administrator', status: 'active' }
const people: ManagedUser[] = [
  { ...admin, canBeAssignedTasks: true, createdAt: 1759320000 },
  { id: 'maya', name: 'Maya Rivera', email: 'maya@mews.test', phone: '(305) 555-0131', avatarUrl: userPortraitUrl('Maya Rivera'), role: 'administrator', status: 'active', canBeAssignedTasks: true, createdAt: 1760083200 },
  { id: 'sam', name: 'Sam Chen', email: 'sam@mews.test', phone: null, avatarUrl: userPortraitUrl('Sam Chen'), role: 'member', status: 'active', canBeAssignedTasks: true, createdAt: 1761465600 },
  { id: 'jordan', name: 'Jordan Lee', email: 'jordan@mews.test', phone: '(305) 555-0154', avatarUrl: userPortraitUrl('Jordan Lee'), role: 'member', status: 'pending', canBeAssignedTasks: true, createdAt: 1793872800 },
  { id: 'devon', name: 'Devon James', email: 'devon@mews.test', phone: null, avatarUrl: userPortraitUrl('Devon James'), role: 'member', status: 'pending', canBeAssignedTasks: true, createdAt: 1793786400 },
  { id: 'taylor', name: 'Taylor Reed', email: 'taylor@mews.test', phone: null, avatarUrl: userPortraitUrl('Taylor Reed'), role: 'member', status: 'suspended', canBeAssignedTasks: true, createdAt: 1776672000 },
]

function memoryUsers(initial: ManagedUser[], mode: 'ready' | 'load-error' | 'save-error' | 'loading', onChange: (user: ManagedUser) => void): UserStore {
  let users = initial.map((user) => ({ ...user }))
  return {
    async list() {
      if (mode === 'loading') return new Promise<ManagedUser[]>(() => {})
      if (mode === 'load-error') throw new Error('The team list is unavailable. Try again.')
      const priority = { pending: 0, active: 1, suspended: 2 }
      return users.map((user) => ({ ...user })).sort((a, b) => priority[a.status] - priority[b.status] || a.name.localeCompare(b.name))
    },
    async changeAccess(id, change) {
      if (mode === 'save-error') throw new Error('Could not update access. Try again.')
      const user = users.find((item) => item.id === id)
      if (!user || user.role !== change.expectedRole || user.status !== change.expectedStatus || user.canBeAssignedTasks !== change.expectedCanBeAssignedTasks) throw new Error('Access changed. Refresh the team list and try again.')
      const updated = { ...user, role: change.role, status: change.status, canBeAssignedTasks: change.canBeAssignedTasks }
      users = users.map((item) => item.id === id ? updated : item)
      onChange(updated)
      return updated
    },
  }
}

function TeamStory({ data = people, mode = 'ready', member = false }: { data?: ManagedUser[]; mode?: 'ready' | 'load-error' | 'save-error' | 'loading'; member?: boolean }) {
  const [router] = useState(() => {
    const currentUser = member ? { ...admin, role: 'member' as const } : admin
    const available = new Map(data.map((person) => [person.name, person.status === 'active' && person.canBeAssignedTasks]))
    const store = memoryUsers(data, mode, (person) => { available.set(person.name, person.status === 'active' && person.canBeAssignedTasks) })
    const workspace = storyWorkspace(currentUser, localInboxData)
    const workspaceStore = storyWorkspaceStore(currentUser, workspace.workspace)
    const getSnapshot = workspaceStore.getSnapshot
    workspaceStore.getSnapshot = async (signal) => {
      const snapshot = await getSnapshot(signal)
      return { ...snapshot, members: snapshot.members.filter((person) => available.get(person.name)) }
    }
    workspace.workspace.members = workspace.workspace.members.filter((person) => available.get(person.name))
    return createMemoryRouter([{
      path: '/app', id: 'workspace', loader: () => workspace,
      element: <AppLayout directoryStore={storyDirectoryStore} workspaceStore={workspaceStore} />,
      children: [
        { path: 'team', element: <UsersPage store={store} />, handle: { breadcrumb: 'Team' } },
        { path: 'tasks', handle: { breadcrumb: 'My Tasks' }, children: [{ index: true, Component: MyTasksPage }, { path: ':taskId', Component: TaskPage, handle: { breadcrumb: 'Task' } }] },
      { path: 'team-tasks', Component: TeamTasksPage, handle: { breadcrumb: 'Team Tasks' } },
        { path: 'reports/:reportId?', Component: InboxPage, handle: { breadcrumb: 'Reports' } },
      ],
    }], { initialEntries: ['/app/team'] })
  })
  return <RouterProvider router={router} />
}

const meta = {
  title: 'Pages/Team',
  component: TeamStory,
  parameters: { layout: 'fullscreen', docs: { description: { component: 'The production team page and workspace layout. Story records are fictional and changes remain in an isolated in-memory store. In the application, active administrators read and update D1 accounts. Approval, roles, and account status are checked by the server. The page covers requests, search and status filtering, responsive details, loading, and errors.' } } },
} satisfies Meta<typeof TeamStory>
export default meta
type Story = StoryObj<typeof meta>
export const Team: Story = {}
export const NoRequests: Story = { args: { data: people.filter((user) => user.status !== 'pending') } }
export const Empty: Story = { args: { data: [] } }
export const Loading: Story = { args: { mode: 'loading' } }
export const LoadError: Story = { args: { mode: 'load-error' } }
export const SaveError: Story = { args: { mode: 'save-error' } }
export const MemberAccess: Story = { args: { member: true } }
export const ManyAccounts: Story = { args: { data: [...people, ...Array.from({ length: 12 }, (_, index): ManagedUser => ({ id: `member-${index}`, name: `Volunteer ${String(index + 1).padStart(2, '0')}`, email: `volunteer${index + 1}@mews.test`, phone: null, role: 'member', status: 'active', canBeAssignedTasks: true, createdAt: 1792000000 + index }))] } }
export const LongContent: Story = { args: { data: [...people, { id: 'long', name: 'Alexandria Morgan-Rivera de la Cruz and family', email: 'averyveryverylongunbrokenemailaddressfortesting@example.mews.test', phone: null, role: 'member', status: 'active', canBeAssignedTasks: true, createdAt: 1792000000 }] } }
