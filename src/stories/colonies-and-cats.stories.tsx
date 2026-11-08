import { userPortraitUrl } from '../../seeds/user-portraits'
import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { createMemoryRouter, RouterProvider, type Params } from 'react-router'
import { AppLayout } from '@/components/layout/app-layout'
import { CatsPage } from '@/features/cats/pages/cats-page'
import { CatPage } from '@/features/cats/pages/cat-page'
import { ColoniesPage } from '@/features/colonies/pages/colonies-page'
import { ColonyBubblesPage } from '@/features/colonies/pages/colony-bubbles-page'
import { ColonyPage } from '@/features/colonies/pages/colony-page'
import { InboxPage } from '@/features/inbox/pages/inbox-page'
import type { InboxData } from '@/features/inbox/types'
import { inboxScenarioData, localInboxData } from '@/features/inbox/data/local-inbox'
import { MyTasksPage } from '@/features/tasks/pages/my-tasks-page'
import { TeamTasksPage } from '@/features/tasks/pages/team-tasks-page'
import { TaskPage } from '@/features/tasks/pages/task-page'
import { OverviewPage } from '@/features/overview/pages/overview-page'
import type { SessionUser } from '../../shared/types/auth'
import type { CareRule } from '../../shared/types/workspace'
import { failingDirectoryStore, storyWorkspace } from './fixtures/directory-store'
import { storyWorkspaceStore } from './fixtures/workspace-store'
import { storyActivityStore } from './fixtures/record-activity-store'
import { communityCats, communityColonies } from '../../seeds/community.ts'

const user: SessionUser = { id: 'storybook-member', name: 'Maya Rivera', email: 'maya@mews.test', phone: null, avatarUrl: userPortraitUrl('Maya Rivera'), role: 'member', status: 'active' }

function DirectoryStory({ initialPath, data = localInboxData, failSaves = false, currentUser = user, careRules = [] }: { initialPath: string; data?: InboxData; failSaves?: boolean; currentUser?: SessionUser; careRules?: CareRule[] }) {
  const [router] = useState(() => {
    const activity = storyActivityStore(currentUser, data)
    const workspace = storyWorkspace(currentUser, data)
    workspace.workspace.careRules = structuredClone(careRules)
    return createMemoryRouter([{
    path: '/app', id: 'workspace', loader: () => workspace, element: <AppLayout directoryStore={failSaves ? failingDirectoryStore : activity.directory} workspaceStore={storyWorkspaceStore(currentUser, workspace.workspace, activity)} />, children: [
      { index: true, Component: OverviewPage, handle: { breadcrumb: 'Overview' } },
      { path: 'colonies', handle: { breadcrumb: 'Colonies' }, children: [
        { index: true, Component: ColoniesPage },
        { path: 'bubbles', Component: ColonyBubblesPage, handle: { breadcrumb: 'Colony bubbles' } },
        { path: ':colonyId', Component: ColonyPage, handle: { breadcrumb: (params: Params, data: InboxData) => data.colonies.find((colony) => colony.id === params.colonyId)?.name ?? 'Colony not found' } },
      ] },
      { path: 'cats', handle: { breadcrumb: 'Cats' }, children: [
        { index: true, Component: CatsPage },
        { path: ':catId', Component: CatPage, handle: { breadcrumb: (params: Params, data: InboxData) => data.cats.find((cat) => cat.id === params.catId)?.name ?? 'Cat not found' } },
      ] },
      { path: 'reports/:reportId?', Component: InboxPage, handle: { breadcrumb: 'Reports' } },
      { path: 'tasks', handle: { breadcrumb: 'My Tasks' }, children: [{ index: true, Component: MyTasksPage }, { path: ':taskId', Component: TaskPage, handle: { breadcrumb: 'Task' } }] },
      { path: 'team-tasks', Component: TeamTasksPage, handle: { breadcrumb: 'Team Tasks' } },
    ],
  }], { initialEntries: [initialPath] })
  })
  return <RouterProvider router={router} />
}

const meta = {
  title: 'Pages/Colonies and cats',
  component: DirectoryStory,
  parameters: { layout: 'fullscreen', docs: { description: { component: 'The workspace directories and profiles share fictional, in-memory records with Reports. Add colony and Add cat update workspace state; records and reviews reset on refresh. Both directories start with compact vertical lists. List rows open record details. List, cards, and maps use the same filters. Map coordinates are fictional and cat markers show colony locations. Colony locations can be chosen and edited. Cat profiles support optional birth dates, estimated ages, details, and photos. Tasks can be edited, completed, and reopened by their assignee or an administrator. Care rules create recurring tasks in the in-memory store; the application uses a scheduled Worker and D1. The timeline records profile, task, and report changes in this Storybook instance.' } } },
  args: { initialPath: '/app/colonies' },
} satisfies Meta<typeof DirectoryStory>
export default meta
type Story = StoryObj<typeof meta>
export const Colonies: Story = {}
export const ColonyBubbles: Story = { args: { initialPath: '/app/colonies/bubbles' } }
export const ColonyBubblesEmpty: Story = { args: { initialPath: '/app/colonies/bubbles', data: { ...inboxScenarioData, colonies: [], cats: [], reports: [], tasks: [] } } }
export const ColonyBubblesLarge: Story = { args: { initialPath: '/app/colonies/bubbles', data: { ...inboxScenarioData, colonies: [{ id: 'large', name: 'A large colony' }], cats: Array.from({ length: 50 }, (_, index) => ({ id: `cat-${index}`, name: `Cat ${index + 1}`, colonyId: 'large' })), reports: [], tasks: [] } } }
export const ColonyBubblesOneColony: Story = { args: { initialPath: '/app/colonies/bubbles', data: { ...inboxScenarioData, colonies: inboxScenarioData.colonies.filter((colony) => colony.id === 'riverside'), cats: inboxScenarioData.cats.filter((cat) => cat.colonyId === 'riverside') } } }
export const ColonyBubblesManyCats: Story = { args: { initialPath: '/app/colonies/bubbles', data: {
  ...inboxScenarioData,
  colonies: [...inboxScenarioData.colonies, ...communityColonies],
  cats: [...inboxScenarioData.cats, ...communityCats],
} }, parameters: { docs: { description: { story: 'A fictional community of 25 colonies and 200 cats. The generated cat portraits are fictional, and data stays in Storybook memory.' } } } }
export const ColonyBubblesSmall: Story = { args: { initialPath: '/app/colonies/bubbles', data: {
  ...inboxScenarioData,
  colonies: [...inboxScenarioData.colonies, { id: 'garden', name: 'Garden' }, { id: 'orchard', name: 'Orchard' }],
  cats: [...inboxScenarioData.cats, ...['Luna', 'Cleo', 'Bean', 'Mochi', 'Poppy', 'Sunny', 'Maple', 'Pip'].map((name) => ({ id: name.toLowerCase(), name, colonyId: 'garden', ...(name === 'Luna' ? { birthDate: '2020-02-10', birthDateEstimated: true, description: 'Orange tabby with a white chest.' } : {}) })), { id: 'unassigned', name: 'Blue', colonyId: '' }],
} }, parameters: { docs: { description: { story: 'Fictional colonies with different cat counts, an empty colony, and one cat without a colony.' } } } }
export const Colony: Story = { args: { initialPath: '/app/colonies/riverside' } }
export const ColonyAtAGlance: Story = { args: { initialPath: '/app/colonies/canal', data: {
  ...inboxScenarioData,
  reports: inboxScenarioData.reports.map((report) => report.id === 'report-feeding' ? { ...report, colonyId: 'canal', catId: 'miso', status: 'processed' as const } : report),
  tasks: [
    { id: 'colony-task', title: 'Check the shelter', owner: user.name, ownerId: user.id, due: '', status: 'open', associations: [{ type: 'colony', id: 'canal' }] },
    { id: 'cat-task', title: 'Check on Miso', owner: user.name, ownerId: user.id, due: '', status: 'open', associations: [{ type: 'cat', id: 'miso' }] },
    { id: 'completed-task', title: 'Finished visit', owner: user.name, ownerId: user.id, due: '', status: 'completed', associations: [{ type: 'colony', id: 'canal' }] },
    { id: 'other-task', title: 'Check on Pepper', owner: user.name, ownerId: user.id, due: '', status: 'open', associations: [{ type: 'cat', id: 'pepper' }] },
  ],
} }, parameters: { docs: { description: { story: 'A colony with open and collapsed completed tasks, including a task linked through a cat, plus reports in different states.' } } } }
export const ColonyOpenReports: Story = { args: { initialPath: '/app/colonies/canal', data: {
  ...inboxScenarioData,
  reports: inboxScenarioData.reports.map((report) => report.id === 'report-waiting' ? { ...report, colonyId: 'canal' } : report),
} }, parameters: { docs: { description: { story: 'Open reports include items that need review or are waiting for details. Reviewed reports remain available in the colony-filtered reports view.' } } } }
export const ColonyWithoutLocation: Story = { args: { initialPath: '/app/colonies/canal', data: {
  ...inboxScenarioData,
  colonies: inboxScenarioData.colonies.map((colony) => colony.id === 'canal' ? { ...colony, coordinates: undefined } : colony),
  cats: [], reports: [], tasks: [],
} }, parameters: { docs: { description: { story: 'A colony with no saved location, cats, reports, or tasks.' } } } }
export const Cats: Story = { args: { initialPath: '/app/cats' } }
export const Cat: Story = { args: { initialPath: '/app/cats/pepper' } }
export const CareSchedule: Story = { args: { initialPath: '/app/cats/pepper', careRules: [
  { id: 'daily-care', title: 'Feed Pepper', ownerId: user.id, owner: user.name, recordType: 'cat', recordId: 'pepper', repeatDays: 1, startDate: '2026-11-08', nextDue: '2026-11-10', active: true, createdBy: user.id },
  { id: 'paused-care', title: 'Check the food supply', ownerId: user.id, owner: user.name, recordType: 'cat', recordId: 'pepper', repeatDays: 7, startDate: '2026-11-08', nextDue: '2026-11-15', active: false, createdBy: user.id },
] }, parameters: { docs: { description: { story: 'Active and paused rules on a cat profile. New rules create date-only tasks in the fixture store.' } } } }
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
} }, parameters: { docs: { description: { story: 'Long unbroken names, missing photos, no reports, and no tasks in the same directory.' } } } }
export const SaveFailure: Story = { args: { failSaves: true }, parameters: { docs: { description: { story: 'An unavailable directory keeps the creation form open with its entered values and an error.' } } } }

export const LongCatProfile: Story = { args: { initialPath: '/app/cats/long-cat', data: LongNamesAndNoReports.args!.data }, parameters: { docs: { description: { story: 'The full cat and colony names remain readable in the profile body on narrow screens, even when the breadcrumb is shortened.' } } } }
