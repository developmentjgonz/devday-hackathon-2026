import type { Meta, StoryObj } from '@storybook/react-vite'
import { Alert } from './alert'

const meta = {
  title: 'Feedback/Alert',
  component: Alert,
  args: { children: 'We could not save this update. Try again.' },
} satisfies Meta<typeof Alert>
export default meta
type Story = StoryObj<typeof meta>
export const Error: Story = {}
