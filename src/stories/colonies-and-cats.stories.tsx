import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { createMemoryRouter, RouterProvider, type Params } from 'react-router'
import { AppLayout } from '@/components/layout/app-layout'
import { CatsPage } from '@/features/cats/pages/cats-page'
import { CatPage } from '@/features/cats/pages/cat-page'
import { ColoniesPage } from '@/features/colonies/pages/colonies-page'
import { ColonyPage } from '@/features/colonies/pages/colony-page'
import { InboxPage } from '@/features/inbox/pages/inbox-page'
import type { InboxData } from '@/features/inbox/types'
import { inboxScenarioData, localInboxData } from '@/features/inbox/data/local-inbox'
import { MyTasksPage } from '@/features/tasks/pages/my-tasks-page'
import { OverviewPage } from '@/features/overview/pages/overview-page'
import type { SessionUser } from '../../shared/types/auth'
import { failingDirectoryStore, storyWorkspace } from './fixtures/directory-store'
import { storyWorkspaceStore } from './fixtures/workspace-store'
import { storyActivityStore } from './fixtures/record-activity-store'

const user: SessionUser = { id: 'storybook-member', name: 'Maya Rivera', email: 'maya@mews.test', phone: null, role: 'member', status: 'active' }

function DirectoryStory({ initialPath, data = localInboxData, failSaves = false, currentUser = user }: { initialPath: string; data?: InboxData; failSaves?: boolean; currentUser?: SessionUser }) {
  const [router] = useState(() => {
    const activity = storyActivityStore(currentUser, data)
    return createMemoryRouter([{
    path: '/app', id: 'workspace', loader: () => storyWorkspace(currentUser, data), element: <AppLayout directoryStore={failSaves ? failingDirectoryStore : activity.directory} workspaceStore={storyWorkspaceStore(currentUser, storyWorkspace(currentUser, data).workspace, activity)} />, children: [
      { index: true, Component: OverviewPage, handle: { breadcrumb: 'Overview' } },
      { path: 'colonies', handle: { breadcrumb: 'Colonies' }, children: [
        { index: true, Component: ColoniesPage },
        { path: ':colonyId', Component: ColonyPage, handle: { breadcrumb: (params: Params, data: InboxData) => data.colonies.find((colony) => colony.id === params.colonyId)?.name ?? 'Colony not found' } },
      ] },
      { path: 'cats', handle: { breadcrumb: 'Cats' }, children: [
        { index: true, Component: CatsPage },
        { path: ':catId', Component: CatPage, handle: { breadcrumb: (params: Params, data: InboxData) => data.cats.find((cat) => cat.id === params.catId)?.name ?? 'Cat not found' } },
      ] },
      { path: 'reports', Component: InboxPage, handle: { breadcrumb: 'Reports' } },
      { path: 'tasks', Component: MyTasksPage, handle: { breadcrumb: 'My Tasks' } },
    ],
  }], { initialEntries: [initialPath] })
  })
  return <RouterProvider router={router} />
}

const meta = {
  title: 'Pages/Colonies and cats',
  component: DirectoryStory,
  parameters: { layout: 'fullscreen', docs: { description: { component: 'The workspace directories and profiles share fictional, in-memory records with Reports. Add colony and Add cat update workspace state; records and reviews reset on refresh. List, cards, and maps use the same filters. Map coordinates are fictional and cat markers show colony locations. Colony locations can be chosen and edited. Cat profiles support optional birth dates, estimated ages, details, and photos. Tasks can be edited, completed, and reopened by their assignee or an administrator. The timeline records profile, task, and report changes in this Storybook instance. Feeding schedules are not implemented.' } } },
  args: { initialPath: '/app/colonies' },
} satisfies Meta<typeof DirectoryStory>
export default meta
type Story = StoryObj<typeof meta>
export const Colonies: Story = {}
export const Colony: Story = { args: { initialPath: '/app/colonies/riverside' } }
export const ColonyAtAGlance: Story = { args: { initialPath: '/app/colonies/canal', data: {
  ...inboxScenarioData,
  tasks: [
    { id: 'colony-task', title: 'Check the shelter', owner: user.name, ownerId: user.id, due: '', status: 'open', associations: [{ type: 'colony', id: 'canal' }] },
    { id: 'cat-task', title: 'Check on Miso', owner: user.name, ownerId: user.id, due: '', status: 'open', associations: [{ type: 'cat', id: 'miso' }] },
    { id: 'completed-task', title: 'Finished visit', owner: user.name, ownerId: user.id, due: '', status: 'completed', associations: [{ type: 'colony', id: 'canal' }] },
    { id: 'other-task', title: 'Check on Pepper', owner: user.name, ownerId: user.id, due: '', status: 'open', associations: [{ type: 'cat', id: 'pepper' }] },
  ],
} }, parameters: { docs: { description: { story: 'A colony with open and completed tasks, including a task linked through a cat, plus reports in different states.' } } } }
export const ColonyWithoutLocation: Story = { args: { initialPath: '/app/colonies/canal', data: {
  ...inboxScenarioData,
  colonies: inboxScenarioData.colonies.map((colony) => colony.id === 'canal' ? { ...colony, coordinates: undefined } : colony),
  cats: [], reports: [], tasks: [],
} }, parameters: { docs: { description: { story: 'A colony with no saved location, cats, reports, or tasks.' } } } }
export const Cats: Story = { args: { initialPath: '/app/cats' } }
export const Cat: Story = { args: { initialPath: '/app/cats/pepper' } }
const sharedCatTasks: InboxData = { ...inboxScenarioData, tasks: [
  { id: 'my-cat-task', title: 'Check Pepper’s water', owner: user.name, ownerId: user.id, due: '', status: 'open', associations: [{ type: 'cat', id: 'pepper' }] },
  { id: 'other-cat-task', title: 'Visit Pepper', owner: 'Sam Chen', ownerId: 'story:Sam Chen', due: '', status: 'open', associations: [{ type: 'cat', id: 'pepper' }] },
] }
export const CatWithSharedTasks: Story = { args: { initialPath: '/app/cats/pepper', data: sharedCatTasks } }
export const CatWithSharedTasksAsAdmin: Story = { args: { initialPath: '/app/cats/pepper', data: sharedCatTasks, currentUser: { ...user, role: 'administrator' } } }
export const TimelineFailure: Story = { args: { initialPath: '/app/cats/pepper', failSaves: true }, parameters: { docs: { description: { story: 'An unavailable timeline shows a retry action instead of an empty history.' } } } }
export const CatWithDetails: Story = { args: { initialPath: '/app/cats/pepper', data: { ...localInboxData, cats: localInboxData.cats.map((cat) => cat.id === 'pepper' ? { ...cat, birthDate: '2021-03-12', birthDateEstimated: true, description: 'White paws and a clipped ear.' } : cat) } } }
export const NoColonies: Story = { args: { initialPath: '/app/cats', data: { ...localInboxData, colonies: [], cats: [], reports: [] } } }
export const LongNamesAndNoReports: Story = { args: { data: {
  ...localInboxData,
  colonies: [{ id: 'long-colony', name: 'TheVeryLongUnbrokenColonyNameThatNeedsToWrapOnSmallScreens' }],
  cats: [{ id: 'long-cat', colonyId: 'long-colony', name: 'TheVeryLongUnbrokenCatNameThatNeedsToWrapOnSmallScreens' }],
  reports: [], tasks: [],
} }, parameters: { docs: { description: { story: 'Long unbroken names, missing photos, no feeding report, and no tasks in the same directory.' } } } }
export const SaveFailure: Story = { args: { failSaves: true }, parameters: { docs: { description: { story: 'An unavailable directory keeps the creation form open with its entered values and an error.' } } } }
