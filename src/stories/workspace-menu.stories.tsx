import type { Meta, StoryObj } from '@storybook/react-vite'
import { MemoryRouter, useLocation } from 'react-router'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { Heading } from '@/components/ui/typography'
import type { SessionUser } from '../../shared/types/auth'

const member: SessionUser = { id: 'maya', name: 'Maya Rivera', email: 'maya@mews.test', phone: null, role: 'member', status: 'active' }
const labels: Record<string, string> = { '/app': 'Overview', '/app/colonies': 'Colonies', '/app/cats': 'Cats', '/app/reports': 'Reports', '/app/tasks': 'My Tasks', '/app/team': 'Team', '/app/configuration': 'Configuration', '/app/profile': 'Profile', '/sign-in': 'Sign in' }

function WorkspaceMenuExample({ user = member }: { user?: SessionUser }) {
  return <MemoryRouter initialEntries={['/app']}><WorkspaceMenuShell user={user} /></MemoryRouter>
}

function WorkspaceMenuShell({ user }: { user: SessionUser }) {
  const { pathname } = useLocation()
  return <div className="min-h-svh md:grid md:grid-cols-[248px_minmax(0,1fr)]">
    <AppSidebar user={user} />
    <main id="main-content" tabIndex={-1} className="p-6"><Heading level={1} size="title">{labels[pathname] ?? 'Page not found'}</Heading></main>
  </div>
}

const meta = {
  title: 'Navigation/Workspace menu',
  component: WorkspaceMenuExample,
  parameters: { layout: 'fullscreen', docs: { description: { component: 'The production sidebar and phone menu, with an in-memory router. Navigation closes the phone drawer. Profile and Sign out are in the account section; Sign out calls the account endpoint.' } } },
} satisfies Meta<typeof WorkspaceMenuExample>
export default meta
type Story = StoryObj<typeof meta>
export const Member: Story = {}
export const Administrator: Story = { args: { user: { ...member, role: 'administrator' } } }
export const LongName: Story = { args: { user: { ...member, name: 'Alexandria Morgan-Rivera de la Cruz and family' } } }
