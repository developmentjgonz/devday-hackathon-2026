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
import { localInboxData } from '@/features/inbox/data/local-inbox'
import { MyTasksPage } from '@/features/tasks/pages/my-tasks-page'
import { OverviewPage } from '@/features/overview/pages/overview-page'
import type { SessionUser } from '../../shared/types/auth'
import { failingDirectoryStore, storyDirectoryStore, storyWorkspace } from './fixtures/directory-store'
import { storyWorkspaceStore } from './fixtures/workspace-store'

const user: SessionUser = { id: 'storybook-member', name: 'Maya Rivera', email: 'maya@mews.test', phone: null, role: 'member', status: 'active' }

function DirectoryStory({ initialPath, data = localInboxData, failSaves = false }: { initialPath: string; data?: InboxData; failSaves?: boolean }) {
  const [router] = useState(() => createMemoryRouter([{
    path: '/app', id: 'workspace', loader: () => storyWorkspace(user, data), element: <AppLayout directoryStore={failSaves ? failingDirectoryStore : storyDirectoryStore} workspaceStore={storyWorkspaceStore(user, storyWorkspace(user, data).workspace)} />, children: [
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
  }], { initialEntries: [initialPath] }))
  return <RouterProvider router={router} />
}

const meta = {
  title: 'Pages/Colonies and cats',
  component: DirectoryStory,
  parameters: { layout: 'fullscreen', docs: { description: { component: 'The workspace directories and profiles share fictional, in-memory records with Reports. Add colony and Add cat update workspace state; records and reviews reset on refresh. List, cards, and maps use the same filters. Map coordinates are fictional and cat markers show colony locations. Cat profiles support optional birth dates, estimated ages, details, and photos. Storybook stores profile changes in memory. Real location editing and feeding schedules are not implemented.' } } },
  args: { initialPath: '/app/colonies' },
} satisfies Meta<typeof DirectoryStory>
export default meta
type Story = StoryObj<typeof meta>
export const Colonies: Story = {}
export const Colony: Story = { args: { initialPath: '/app/colonies/riverside' } }
export const Cats: Story = { args: { initialPath: '/app/cats' } }
export const Cat: Story = { args: { initialPath: '/app/cats/pepper' } }
export const CatWithDetails: Story = { args: { initialPath: '/app/cats/pepper', data: { ...localInboxData, cats: localInboxData.cats.map((cat) => cat.id === 'pepper' ? { ...cat, birthDate: '2021-03-12', birthDateEstimated: true, description: 'White paws and a clipped ear.' } : cat) } } }
export const NoColonies: Story = { args: { initialPath: '/app/cats', data: { ...localInboxData, colonies: [], cats: [], reports: [] } } }
export const SaveFailure: Story = { args: { failSaves: true }, parameters: { docs: { description: { story: 'An unavailable directory keeps the creation form open with its entered values and an error.' } } } }
