import type { Meta, StoryObj } from '@storybook/react-vite'
import { MemoryRouter } from 'react-router'
import { WorkspaceNavigation } from './workspace-navigation'

const meta = {
  title: 'Actions/Workspace navigation',
  component: WorkspaceNavigation,
  parameters: {
    docs: {
      description: {
        component: 'The production workspace navigation. Pink marks the current route; gray marks hover on another link. Hover must not change the current route. Keyboard focus adds a ring to either state. Links remain usable, including the current link. These stories use an in-memory router and make no account requests. Check default, hover, current + hover, focus, current + focus, and navigation in light and dark themes.',
      },
    },
  },
} satisfies Meta<typeof WorkspaceNavigation>

export default meta
type Story = StoryObj<typeof meta>

export const OverviewCurrent: Story = {
  render: () => (
    <MemoryRouter initialEntries={['/app']}>
      <div className="w-64 max-w-full bg-sidebar py-4"><WorkspaceNavigation /></div>
    </MemoryRouter>
  ),
}

export const ReportsCurrent: Story = {
  render: () => (
    <MemoryRouter initialEntries={['/app/reports']}>
      <div className="w-64 max-w-full bg-sidebar py-4"><WorkspaceNavigation /></div>
    </MemoryRouter>
  ),
}

export const MyTasksCurrent: Story = {
  render: () => (
    <MemoryRouter initialEntries={['/app/tasks']}>
      <div className="w-64 max-w-full bg-sidebar py-4"><WorkspaceNavigation /></div>
    </MemoryRouter>
  ),
}
