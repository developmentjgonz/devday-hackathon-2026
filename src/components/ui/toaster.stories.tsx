import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from './button'
import { toast } from './toaster'

function ToastExample() {
  return <div className="flex flex-wrap gap-3">
    <Button onClick={() => toast.success('Report processed', { description: 'Care check requested at Grove' })}>Show save confirmation</Button>
    <Button variant="outline" onClick={() => toast.error('Could not save the report', { description: 'Your changes are still available. Try again.' })}>Show error</Button>
  </div>
}

const meta = {
  title: 'Feedback/Notifications', component: ToastExample,
  parameters: { docs: { description: { component: 'Shared Sonner notifications by Emil Kowalski. The app and Storybook each mount one host. Save confirmations appear at the bottom right without moving page content. Mews typography and color tokens supply the presentation. Notifications can be dismissed and expire automatically. The loading icon uses the shared cat-print indicator. Keep field validation next to the field; use notifications for completed actions and request failures. Source: https://github.com/emilkowalski/sonner' } } },
} satisfies Meta<typeof ToastExample>
export default meta
type Story = StoryObj<typeof meta>
export const SaveAndError: Story = {}
