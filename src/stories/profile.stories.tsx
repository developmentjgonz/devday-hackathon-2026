import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { createMemoryRouter, RouterProvider, useRevalidator, useRouteLoaderData } from 'react-router'
import { AppLayout } from '@/components/layout/app-layout'
import { ProfileScreen } from '@/features/auth/components/profile-screen'
import { localInboxData } from '@/features/inbox/data/local-inbox'
import type { SessionUser } from '../../shared/types/auth'
import type { WorkspaceData } from '../../shared/types/directory'
import { storyDirectoryStore, storyWorkspace } from './fixtures/directory-store'
import { storyWorkspaceStore } from './fixtures/workspace-store'
import { waitForStoryRequest } from './fixtures/controlled-request'

const initialUser: SessionUser = { id: 'profile-member', name: 'Maya Rivera', email: 'maya@mews.test', phone: '+1 305 555 0131', role: 'member', status: 'active' }

function ProfileStory({ fail = false, delayed = false }: { fail?: boolean; delayed?: boolean }) {
  const [router] = useState(() => {
    let current = { ...initialUser }
    function Screen() {
      const { user } = useRouteLoaderData('workspace') as WorkspaceData
      const { revalidate } = useRevalidator()
      return <ProfileScreen user={user} onSave={async (profile) => {
        if (delayed) await waitForStoryRequest('storybook:release-profile-save')
        if (fail) throw new Error('Could not save your profile. Try again.')
        const avatarUrl = profile.photo === undefined ? current.avatarUrl : profile.photo ? `data:${profile.photo.mimeType};base64,${profile.photo.data}` : undefined
        current = { ...current, name: profile.name.trim(), email: profile.email.trim().toLowerCase(), phone: profile.phone?.trim() || null, avatarUrl }
        void revalidate()
        return current
      }} />
    }
    return createMemoryRouter([{
      path: '/app', id: 'workspace', loader: () => storyWorkspace(current, localInboxData),
      element: <AppLayout directoryStore={storyDirectoryStore} workspaceStore={storyWorkspaceStore(current, storyWorkspace(current, localInboxData).workspace)} />,
      children: [{ path: 'profile', Component: Screen, handle: { breadcrumb: 'Profile' } }],
    }], { initialEntries: ['/app/profile'] })
  })
  return <RouterProvider router={router} />
}

const meta = {
  title: 'Pages/Profile', component: ProfileStory,
  parameters: { layout: 'fullscreen', docs: { description: { component: 'The account profile screen. Storybook keeps edits in memory; the application saves them to the signed-in account. Delayed save waits up to 30 seconds for inspection; tests can release it sooner.' } } },
} satisfies Meta<typeof ProfileStory>
export default meta
type Story = StoryObj<typeof meta>
export const Profile: Story = {}
export const SaveError: Story = { args: { fail: true } }
export const DelayedSave: Story = { args: { delayed: true } }
