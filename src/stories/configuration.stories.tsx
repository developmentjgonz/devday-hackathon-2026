import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { AppLayout } from '@/components/layout/app-layout'
import { localInboxData } from '@/features/inbox/data/local-inbox'
import { ConfigurationPage } from '@/features/configuration/pages/configuration-page'
import type { ConfigurationStore } from '@/features/configuration/configuration-api'
import type { SessionUser } from '../../shared/types/auth'
import type { Configuration } from '../../shared/types/configuration'
import { storyDirectoryStore, storyWorkspace } from './fixtures/directory-store'
import { storyWorkspaceStore } from './fixtures/workspace-store'

const admin: SessionUser = { id: 'alex', name: 'Alex Morgan', email: 'alex@mews.test', phone: null, role: 'administrator', status: 'active' }
const initial: Configuration = { inboundPhone: '', inboundEmail: '', openaiModel: '', openaiKeyStatus: 'not-set', secureKeyStorageAvailable: true }

function memoryConfiguration(mode: 'ready' | 'loading' | 'load-error' | 'save-error', values: Configuration): ConfigurationStore {
  let configuration = { ...values }
  return {
    async read() {
      if (mode === 'loading') return new Promise<Configuration>(() => {})
      if (mode === 'load-error') throw new Error('Try again in a moment.')
      return { ...configuration }
    },
    async saveChannels(input) {
      if (mode === 'save-error') throw new Error('Could not save phone and email. Try again.')
      configuration = { ...configuration, inboundPhone: input.inboundPhone.trim(), inboundEmail: input.inboundEmail.trim().toLowerCase() }
      return { ...configuration }
    },
    async saveAi(input) {
      if (mode === 'save-error') throw new Error('Could not save AI settings. Try again.')
      configuration = { ...configuration, openaiModel: input.openaiModel.trim(), ...(input.apiKey ? { openaiKeyStatus: 'saved' } : {}) }
      return { ...configuration }
    },
    async removeAiKey() {
      if (mode === 'save-error') throw new Error('Could not remove the API key. Try again.')
      configuration = { ...configuration, openaiKeyStatus: 'not-set' }
      return { ...configuration }
    },
  }
}

function ConfigurationStory({ path = '/app/configuration', mode = 'ready', member = false, values = initial }: {
  path?: string
  mode?: 'ready' | 'loading' | 'load-error' | 'save-error'
  member?: boolean
  values?: Configuration
}) {
  const [router] = useState(() => {
    const currentUser = member ? { ...admin, role: 'member' as const } : admin
    const workspace = storyWorkspace(currentUser, localInboxData)
    const store = memoryConfiguration(mode, values)
    return createMemoryRouter([{
      path: '/app', id: 'workspace', loader: () => workspace,
      element: <AppLayout directoryStore={storyDirectoryStore} workspaceStore={storyWorkspaceStore(currentUser, workspace.workspace)} />,
      children: [{ path: 'configuration/:section?', element: <ConfigurationPage store={store} />, handle: { breadcrumb: 'Configuration' } }],
    }], { initialEntries: [path] })
  })
  return <RouterProvider router={router} />
}

const meta = {
  title: 'Pages/Configuration',
  component: ConfigurationStory,
  parameters: { layout: 'fullscreen', docs: { description: { component: 'The production administrator configuration page with an isolated in-memory store. In the app, the API restricts access to active administrators and stores the OpenAI key encrypted. Phone, email, public reporting, and AI analysis do not have connected services.' } } },
} satisfies Meta<typeof ConfigurationStory>
export default meta
type Story = StoryObj<typeof meta>

export const PhoneAndEmail: Story = {}
export const AiAnalysis: Story = { args: { path: '/app/configuration/ai' } }
export const SavedKey: Story = { args: { path: '/app/configuration/ai', values: { ...initial, openaiModel: 'example-model', openaiKeyStatus: 'saved' } } }
export const KeyStorageUnavailable: Story = { args: { path: '/app/configuration/ai', values: { ...initial, openaiKeyStatus: 'unavailable', secureKeyStorageAvailable: false } } }
export const PublicReporting: Story = { args: { path: '/app/configuration/reporting' } }
export const Loading: Story = { args: { mode: 'loading' } }
export const LoadError: Story = { args: { mode: 'load-error' } }
export const SaveError: Story = { args: { mode: 'save-error' } }
export const MemberAccess: Story = { args: { member: true } }
