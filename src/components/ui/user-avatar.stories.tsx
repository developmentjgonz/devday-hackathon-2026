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
export const Photo: Story = { args: { src: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"%3E%3Crect width="80" height="80" fill="%23e4b9a2"/%3E%3Ccircle cx="40" cy="29" r="15" fill="%238c5a48"/%3E%3Cpath d="M10 80a30 30 0 0 1 60 0" fill="%238c5a48"/%3E%3C/svg%3E', size: 'lg' } }
export const UnavailablePhoto: Story = { args: { src: '/missing-user-photo.jpg' } }
