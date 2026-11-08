import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { AppLayout } from '@/components/layout/app-layout'
import { CommunityAdminPage } from '@/features/community/pages/community-admin-page'
import type { CommunityStore } from '@/features/community/community-api'
import { localInboxData } from '@/features/inbox/data/local-inbox'
import type { SessionUser } from '../../shared/types/auth'
import type { CommunityBoard } from '../../shared/types/public'
import { storyDirectoryStore, storyWorkspace } from './fixtures/directory-store'
import { storyWorkspaceStore } from './fixtures/workspace-store'
import { storyPublicContent } from './fixtures/public-content'

const admin: SessionUser = { id: 'alex', name: 'Alex Morgan', email: 'alex@mews.test', phone: null, role: 'administrator', status: 'active' }
type Mode = 'ready' | 'loading' | 'load-error' | 'save-error'

function memoryCommunity(initial: CommunityBoard, mode: Mode): CommunityStore {
  const board = structuredClone(initial)
  function result() { return structuredClone(board) }
  function checkSave() { if (mode === 'save-error') throw new Error('Could not save the board. Try again.') }
  return {
    async read() {
      if (mode === 'loading') return new Promise<CommunityBoard>(() => {})
      if (mode === 'load-error') throw new Error('The board is unavailable. Try again.')
      return result()
    },
    async saveSection(input, id) {
      checkSave()
      if (id) board.sections = board.sections.map((section) => section.id === id ? { ...section, ...input } : section)
      else board.sections.push({ id: crypto.randomUUID(), ...input })
      return result()
    },
    async savePost(input, id) {
      checkSave()
      if (id) board.posts = board.posts.map((post) => post.id === id ? { ...post, ...input } : post)
      else board.posts.push({ id: crypto.randomUUID(), ...input, published: true })
      return result()
    },
    async setPublished(id, published) {
      checkSave()
      board.posts = board.posts.map((post) => post.id === id ? { ...post, published } : post)
      return result()
    },
  }
}

function CommunityStory({ mode = 'ready', member = false, empty = false, retired = false }: { mode?: Mode; member?: boolean; empty?: boolean; retired?: boolean }) {
  const [router] = useState(() => {
    const user = member ? { ...admin, role: 'member' as const } : admin
    const workspace = storyWorkspace(user, localInboxData)
    const board = empty ? { sections: [], posts: [] } : structuredClone(storyPublicContent.board)
    if (retired) board.posts[0].published = false
    return createMemoryRouter([{
      path: '/app', id: 'workspace', loader: () => workspace,
      element: <AppLayout directoryStore={storyDirectoryStore} workspaceStore={storyWorkspaceStore(user, workspace.workspace)} />,
      children: [{ path: 'community', element: <CommunityAdminPage store={memoryCommunity(board, mode)} />, handle: { breadcrumb: 'Community board' } }],
    }], { initialEntries: ['/app/community'] })
  })
  return <RouterProvider router={router} />
}

const meta = {
  title: 'Pages/Community board',
  component: CommunityStory,
  parameters: { layout: 'fullscreen', docs: { description: { component: 'The production community board manager with fictional posts and an isolated memory store. Administrators add and edit sections and posts, and retire or restore posts. The public board uses the same cards and shows only published posts. The application persists changes in D1 and checks active administrator access and request origin on the server.' } } },
} satisfies Meta<typeof CommunityStory>
export default meta
type Story = StoryObj<typeof meta>

export const Administrator: Story = {}
export const Empty: Story = { args: { empty: true } }
export const RetiredPosts: Story = { args: { retired: true } }
export const Loading: Story = { args: { mode: 'loading' } }
export const LoadError: Story = { args: { mode: 'load-error' } }
export const SaveError: Story = { args: { mode: 'save-error' } }
export const MemberAccess: Story = { args: { member: true } }
