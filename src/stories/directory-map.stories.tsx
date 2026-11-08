import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { AppLayout } from '@/components/layout/app-layout'
import { CatPage } from '@/features/cats/pages/cat-page'
import { localInboxData } from '@/features/inbox/data/local-inbox'
import { DirectoryMap } from '@/features/colonies/components/directory-map'
import { storyDirectoryStore, storyWorkspace } from './fixtures/directory-store'
import { storyWorkspaceStore } from './fixtures/workspace-store'
import type { SessionUser } from '../../shared/types/auth'

const data = {
  colonies: [{ id: 'canal', name: 'Canal', coordinates: [-80.226, 25.797] as [number, number] }],
  cats: [{ id: 'miso', name: 'Miso', colonyId: 'canal' }],
  reports: [],
}

function MapContext({ children }: { children: React.ReactNode }) {
  const [router] = useState(() => {
    const user: SessionUser = { id: 'map-member', name: 'Maya Rivera', email: 'maya@mews.test', phone: null, role: 'member', status: 'active' }
    const workspace = storyWorkspace(user, { ...localInboxData, ...data, tasks: [] })
    return createMemoryRouter([{
      path: '/app', id: 'workspace', loader: () => workspace,
      element: <AppLayout directoryStore={storyDirectoryStore} workspaceStore={storyWorkspaceStore(user, workspace.workspace)} />,
      children: [{ index: true, element: children, handle: { breadcrumb: 'Directory map' } }, { path: 'cats/:catId', Component: CatPage, handle: { breadcrumb: 'Cat' } }],
    }], { initialEntries: ['/app'] })
  })
  return <RouterProvider router={router} />
}

const meta = {
  title: 'Pages/Directory map',
  component: DirectoryMap,
  decorators: [(Story) => <MapContext><Story /></MapContext>],
  args: { ...data, scope: 'colonies' },
  parameters: { docs: { description: { component: 'A team directory map using fictional coordinates. Cat markers describe the colony location, not a cat sighting. Select a location to open the related records.' } } },
} satisfies Meta<typeof DirectoryMap>
export default meta
type Story = StoryObj<typeof meta>
export const Colonies: Story = {}
export const Cats: Story = { args: { scope: 'cats' } }
