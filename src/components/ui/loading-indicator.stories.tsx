import type { Meta, StoryObj } from '@storybook/react-vite'
import { LoadingIndicator } from './loading-indicator'

const meta = {
  title: 'Feedback/Loading indicator',
  component: LoadingIndicator,
  args: {
    variant: 'spinner',
    size: 'md',
    label: 'Loading colony updates',
    paused: false,
  },
  argTypes: {
    variant: { control: 'select', options: ['spinner', 'paws', 'fire'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
} satisfies Meta<typeof LoadingIndicator>
export default meta
type Story = StoryObj<typeof meta>
export const Spinner: Story = {}
export const Paws: Story = { args: { variant: 'paws', size: 'lg' } }
export const Fire: Story = {
  args: { variant: 'fire', size: 'lg', label: 'Loading colony updates' },
}

export const Paused: Story = {
  args: {
    variant: 'fire',
    size: 'lg',
    paused: true,
    label: 'Colony updates paused',
  },
}
