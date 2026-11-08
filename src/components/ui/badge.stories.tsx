import type { Meta, StoryObj } from '@storybook/react-vite'
import { Badge } from './badge'

const meta = {
  title: 'Display/Badge',
  component: Badge,
  args: { children: 'Feeding due', variant: 'default' },
  argTypes: { variant: { control: 'select', options: ['default', 'secondary', 'outline', 'destructive', 'success', 'warning'] }, size: { control: 'select', options: ['default', 'comfortable'] } },
} satisfies Meta<typeof Badge>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Secondary: Story = { args: { children: 'Foster needed', variant: 'secondary' } }
export const Outline: Story = { args: { children: 'Ear-tipped', variant: 'outline' } }
export const Destructive: Story = { args: { children: 'Urgent care needed', variant: 'destructive' } }

export const Success: Story = { args: { children: 'Visit complete', variant: 'success' } }
export const Warning: Story = { args: { children: 'Needs a visit', variant: 'warning' } }
export const Comfortable: Story = { args: { children: 'Needs review', variant: 'warning', size: 'comfortable' }, parameters: { docs: { description: { story: 'Use the comfortable size when a status must be easy to scan in a report card.' } } } }
