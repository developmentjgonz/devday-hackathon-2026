import type { Meta, StoryObj } from '@storybook/react-vite'
import { UserAvatar } from './user-avatar'

const meta = {
  title: 'Display/User avatar',
  component: UserAvatar,
  args: { name: 'Maya Rivera' },
  parameters: { docs: { description: { component: 'Initials for a person whose name is already visible. The avatar is decorative and supports default and small sizes.' } } },
} satisfies Meta<typeof UserAvatar>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Small: Story = { args: { size: 'sm' } }
export const SingleName: Story = { args: { name: 'Sam' } }
