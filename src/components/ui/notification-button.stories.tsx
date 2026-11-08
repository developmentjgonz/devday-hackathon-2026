import type { Meta, StoryObj } from '@storybook/react-vite'
import { NotificationButton } from './notification-button'
const meta = { title: 'Actions/Notification button', component: NotificationButton, args: { label: 'Notifications', count: 3 }, parameters: { docs: { description: { component: 'The standard Lucide bell at 20 px inside the shared 44 px ghost icon button. A small dot indicates available notifications; the accessible name contains their count. Pair with the shared Popover for the notification list.' } } } } satisfies Meta<typeof NotificationButton>
export default meta
type Story = StoryObj<typeof meta>
export const WithNotifications: Story = {}
export const Empty: Story = { args: { count: 0 } }
