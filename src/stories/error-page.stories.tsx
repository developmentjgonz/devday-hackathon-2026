import type { Meta, StoryObj } from '@storybook/react-vite'
import { MemoryRouter } from 'react-router'
import { RouteErrorPage } from '@/pages/route-error-page'

const meta = {
  title: 'Pages/Error page',
  component: RouteErrorPage,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof RouteErrorPage>
export default meta
type Story = StoryObj<typeof meta>

export const Workspace: Story = {
  decorators: [(Story) => <MemoryRouter initialEntries={['/app/cats']}><Story /></MemoryRouter>],
}

export const Public: Story = {
  decorators: [(Story) => <MemoryRouter initialEntries={['/about']}><Story /></MemoryRouter>],
}
