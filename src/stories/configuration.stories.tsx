import { userPortraitUrl } from '../../seeds/user-portraits'
import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { AppLayout } from '@/components/layout/app-layout'
import { OverviewPage } from '@/features/overview/pages/overview-page'
import { localInboxData } from '@/features/inbox/data/local-inbox'
import { ConfigurationPage } from '@/features/configuration/pages/configuration-page'
import type { ConfigurationStore } from '@/features/configuration/configuration-api'
import type { SessionUser } from '../../shared/types/auth'
import type { Configuration } from '../../shared/types/configuration'
import { storyDirectoryStore, storyWorkspace } from './fixtures/directory-store'
import { storyWorkspaceStore } from './fixtures/workspace-store'
import { defaultReportChatPrompt } from '../../shared/report-chat-instructions'
import { defaultAutopilot } from '../../shared/types/automation'

const admin: SessionUser = { id: 'alex', name: 'Alex Morgan', email: 'alex@mews.test', phone: null, avatarUrl: userPortraitUrl('Alex Morgan'), role: 'administrator', status: 'active' }
const initial: Configuration = { autopilot: defaultAutopilot, inboundPhone: '', inboundEmail: '', phoneEnabled: false, emailEnabled: false, reportChatEnabled: false, openaiModel: '', reportChatPrompt: defaultReportChatPrompt, openaiKeyStatus: 'not-set', secureKeyStorageAvailable: true, demoSignInEnabled: false }

function memoryConfiguration(mode: 'ready' | 'loading' | 'load-error' | 'save-error', values: Configuration): ConfigurationStore {
  let configuration = { ...values }
  return {
    async read() {
      if (mode === 'loading') return new Promise<Configuration>(() => {})
      if (mode === 'load-error') throw new Error('Try again in a moment.')
      return { ...configuration }
    },
    async saveChannels(input) {
      if (mode === 'save-error') throw new Error('Could not save communication settings. Try again.')
      configuration = { ...configuration, ...input, inboundPhone: input.inboundPhone.trim(), inboundEmail: input.inboundEmail.trim().toLowerCase() }
      return { ...configuration }
    },
    async saveAi(input) {
      if (mode === 'save-error') throw new Error('Could not save AI settings. Try again.')
      configuration = { ...configuration, ...(input.autopilot ? { autopilot: input.autopilot } : {}), openaiModel: input.openaiModel.trim(), ...(input.reportChatPrompt !== undefined ? { reportChatPrompt: input.reportChatPrompt.trim() } : {}), ...(input.apiKey ? { openaiKeyStatus: 'saved' } : {}) }
      return { ...configuration }
    },
    async removeAiKey() {
      if (mode === 'save-error') throw new Error('Could not remove the API key. Try again.')
      configuration = { ...configuration, openaiKeyStatus: 'not-set', autopilot: { ...configuration.autopilot, enabled: false } }
      return { ...configuration }
    },
    async setDemoAccess(enabled) {
      if (mode === 'save-error') throw new Error('Could not update demo sign-in. Try again.')
      configuration = { ...configuration, demoSignInEnabled: enabled }
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
      children: [{ path: 'configuration/:section?', element: <ConfigurationPage store={store} />, handle: { breadcrumb: 'Configuration' } }, { index: true, Component: OverviewPage, handle: { breadcrumb: 'Overview' } }],
    }], { initialEntries: [path] })
  })
  return <RouterProvider router={router} />
}

const meta = {
  title: 'Pages/Configuration',
  component: ConfigurationStory,
  parameters: { layout: 'fullscreen', docs: { description: { component: 'The production administrator configuration page with an isolated in-memory store. In the app, the API restricts access to active administrators and stores the OpenAI key encrypted. The report chat uses the saved key when enabled. Enabled contact details appear on the public report form; phone and email are handled outside Mews. The QR code uses the current origin, which is Storybook in this example.' } } },
} satisfies Meta<typeof ConfigurationStory>
export default meta
type Story = StoryObj<typeof meta>

export const CommunicationSetup: Story = {}
export const ChatEnabled: Story = { args: { values: { ...initial, reportChatEnabled: true, openaiKeyStatus: 'saved' } } }
export const AiAnalysis: Story = { args: { path: '/app/configuration/ai' } }
export const SavedKey: Story = { args: { path: '/app/configuration/ai', values: { ...initial, openaiModel: 'example-model', openaiKeyStatus: 'saved' } } }
export const Autopilot: Story = { args: { path: '/app/configuration/ai', values: { ...initial, openaiKeyStatus: 'saved', autopilot: { ...defaultAutopilot, enabled: true } } } }
export const KeyStorageUnavailable: Story = { args: { path: '/app/configuration/ai', values: { ...initial, openaiKeyStatus: 'unavailable', secureKeyStorageAvailable: false } } }
export const SignInAccess: Story = { args: { path: '/app/configuration/access' } }
export const Loading: Story = { args: { mode: 'loading' } }
export const LoadError: Story = { args: { mode: 'load-error' } }
export const SaveError: Story = { args: { mode: 'save-error' } }
export const MemberAccess: Story = { args: { member: true } }
