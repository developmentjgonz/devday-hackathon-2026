import { userPortraitUrl } from '../../../seeds/user-portraits'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { UserAvatar } from './user-avatar'

const meta = {
  title: 'Display/User avatar',
  component: UserAvatar,
  args: { name: 'Maya Rivera' },
  parameters: { docs: { description: { component: 'A photo or initials for a person whose name is already visible. The avatar is decorative, falls back to initials if a photo fails, and supports small, default, and large sizes.' } } },
} satisfies Meta<typeof UserAvatar>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Small: Story = { args: { size: 'sm' } }
export const Large: Story = { args: { size: 'lg' } }
export const SingleName: Story = { args: { name: 'Sam' } }
export const Photo: Story = { args: { src: userPortraitUrl('Maya Rivera'), size: 'lg' } }
export const UnavailablePhoto: Story = { args: { src: '/missing-user-photo.jpg' } }
