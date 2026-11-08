import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { AppLayout } from '@/components/layout/app-layout'
import { AutomationPage } from '@/features/automation/pages/automation-page'
import type { AutomationStore } from '@/features/automation/automation-api'
import { localInboxData } from '@/features/inbox/data/local-inbox'
import { storyDirectoryStore, storyWorkspace } from './fixtures/directory-store'
import { storyWorkspaceStore } from './fixtures/workspace-store'
import { defaultAutopilot, type AutomationSnapshot } from '../../shared/types/automation'
import type { SessionUser } from '../../shared/types/auth'

const admin: SessionUser = { id: 'alex', name: 'Alex Morgan', email: 'alex@mews.test', phone: null, role: 'administrator', status: 'active' }
const initial: AutomationSnapshot = {
  settings: { ...defaultAutopilot, enabled: true }, running: false, hasMore: false,
  lastRun: { id: 'run-1', startedAt: '2026-11-08T14:00:00Z', finishedAt: '2026-11-08T14:00:10Z', status: 'completed', summary: 'Autopilot checked the enabled features.' },
  proposals: [
    { id: 'review-merge', title: 'Merge Riverside Cats into Riverside', detail: 'The colony names and locations match.', changes: ['Move 3 cats, linked reports, task links, and care rules to Riverside.', 'Keep record history and remove the duplicate colony.'], createdAt: '2026-11-08T14:00:05Z' },
    { id: 'review-report', title: 'Review possible injury near the feeding station', detail: 'Pepper was seen limping and needs a care check.', changes: ['Update Pepper: limping on a front paw.', 'Create and assign task: Check Pepper at the feeding station.', 'Finish the report review after supported changes.'], createdAt: '2026-11-08T14:00:08Z' },
  ],
  events: [
    { id: 'event-review', kind: 'review', title: 'Human review requested: Merge Riverside Cats into Riverside', detail: 'The colony names and locations match.', targetPath: null, occurredAt: '2026-11-08T14:00:05Z' },
    { id: 'event-task', kind: 'task', title: 'Task assigned: Refill water at Canal', detail: 'Assigned to Maya Rivera based on open task count.', targetPath: null, occurredAt: '2026-11-08T13:55:04Z' },
    { id: 'event-cat', kind: 'cat', title: 'Cat updated: Miso', detail: 'Saved the confirmed sighting at the Canal entrance.', targetPath: null, occurredAt: '2026-11-08T13:55:03Z' },
    { id: 'event-report', kind: 'report', title: 'Report reviewed: Morning feeding and fresh water', detail: 'The report confirms clean bowls and fresh water at Grove.', targetPath: null, occurredAt: '2026-11-08T13:55:02Z' },
  ],
}

function memoryAutomation(values: AutomationSnapshot, mode: string): AutomationStore {
  let snapshot = structuredClone(values)
  return {
    async read() {
      if (mode === 'loading') return new Promise<AutomationSnapshot>(() => {})
      if (mode === 'load-error') throw new Error('Automation is unavailable. Try again.')
      return structuredClone(snapshot)
    },
    async run() {
      await new Promise((resolve) => setTimeout(resolve, 400))
      snapshot = { ...snapshot, lastRun: { id: crypto.randomUUID(), startedAt: new Date().toISOString(), finishedAt: new Date().toISOString(), status: 'completed', summary: 'Autopilot checked the enabled features.' } }
      return structuredClone(snapshot)
    },
    async review(id, approve) {
      await new Promise((resolve) => setTimeout(resolve, 250))
      const proposal = snapshot.proposals.find((item) => item.id === id)!
      snapshot = { ...snapshot, proposals: snapshot.proposals.filter((item) => item.id !== id), events: [{ id: crypto.randomUUID(), kind: 'review', title: `${approve ? 'Approved' : 'Rejected'}: ${proposal.title}`, detail: proposal.detail, targetPath: null, occurredAt: new Date().toISOString() }, ...snapshot.events] }
      return structuredClone(snapshot)
    },
  }
}

function AutomationStory({ values = initial, mode = 'ready', member = false }: { values?: AutomationSnapshot; mode?: 'ready' | 'loading' | 'load-error'; member?: boolean }) {
  const [router] = useState(() => {
    const user = member ? { ...admin, role: 'member' as const } : admin
    const workspace = storyWorkspace(user, localInboxData)
    workspace.workspace.autopilotEnabled = values.settings.enabled
    const store = memoryAutomation(values, mode)
    return createMemoryRouter([{
      path: '/app', id: 'workspace', loader: () => workspace,
      element: <AppLayout directoryStore={storyDirectoryStore} workspaceStore={storyWorkspaceStore(user, workspace.workspace)} />,
      children: [{ path: 'automation', element: <AutomationPage store={store} />, handle: { breadcrumb: 'Automation' } }],
    }], { initialEntries: ['/app/automation'] })
  })
  return <RouterProvider router={router} />
}

const meta = {
  title: 'Pages/Automation', component: AutomationStory,
  parameters: { layout: 'fullscreen', docs: { description: { component: 'The production Automation page with fictional activity and an isolated in-memory review queue. The application stores proposals and activity in D1. Approvals check current records before applying changes; rejected proposals do not change records. The background Worker checks enabled features every five minutes. This story demonstrates page states and review controls without contacting OpenAI.' } } },
} satisfies Meta<typeof AutomationStory>
export default meta
type Story = StoryObj<typeof meta>
export const HumanReview: Story = {}
export const Automatic: Story = { args: { values: { ...initial, settings: { ...initial.settings, requireHumanReview: false }, proposals: [] } } }
export const Empty: Story = { args: { values: { ...initial, lastRun: null, events: [], proposals: [] } } }
export const Paused: Story = { args: { values: { ...initial, settings: defaultAutopilot } } }
export const Working: Story = { args: { values: { ...initial, running: true } } }
export const Loading: Story = { args: { mode: 'loading' } }
export const LoadError: Story = { args: { mode: 'load-error' } }
export const MemberAccess: Story = { args: { member: true } }
