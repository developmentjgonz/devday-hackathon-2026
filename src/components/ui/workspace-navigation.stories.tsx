import type { Meta, StoryObj } from '@storybook/react-vite'
import { MemoryRouter } from 'react-router'
import { WorkspaceNavigation } from './workspace-navigation'

const meta = {
  title: 'Actions/Workspace navigation',
  component: WorkspaceNavigation,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'The production workspace navigation uses the same vertical rows in the desktop sidebar and phone menu. Pink marks the current route; gray marks hover or press on another link. Keyboard focus adds a ring to either state. These stories use an in-memory router and show the same width as the app shell.',
      },
    },
  },
} satisfies Meta<typeof WorkspaceNavigation>

export default meta
type Story = StoryObj<typeof meta>

export const OverviewCurrent: Story = {
  render: () => (
    <MemoryRouter initialEntries={['/app']}>
      <div className="w-[min(20rem,calc(100%-3rem))] border-r bg-sidebar py-4 md:w-[248px]"><WorkspaceNavigation /></div>
    </MemoryRouter>
  ),
}

export const ReportsCurrent: Story = {
  render: () => (
    <MemoryRouter initialEntries={['/app/reports']}>
      <div className="w-[min(20rem,calc(100%-3rem))] border-r bg-sidebar py-4 md:w-[248px]"><WorkspaceNavigation /></div>
    </MemoryRouter>
  ),
}

export const MyTasksCurrent: Story = {
  render: () => (
    <MemoryRouter initialEntries={['/app/tasks']}>
      <div className="w-[min(20rem,calc(100%-3rem))] border-r bg-sidebar py-4 md:w-[248px]"><WorkspaceNavigation /></div>
    </MemoryRouter>
  ),
}

export const Administrator: Story = {
  render: () => <MemoryRouter initialEntries={['/app/team']}><div className="w-[min(20rem,calc(100%-3rem))] border-r bg-sidebar py-4 md:w-[248px]"><WorkspaceNavigation showTeam /></div></MemoryRouter>,
}
