import type { Meta, StoryObj } from '@storybook/react-vite'
import { ProgressRing } from './progress-ring'

const meta = {
  title: 'Feedback/Progress ring',
  component: ProgressRing,
  args: { value: 3, max: 8, label: 'Task completion' },
  parameters: { docs: { description: { component: 'Determinate completion for a known total. The shared tokens own graphic size and stroke width. The ring reports its label, count, total, and percentage to assistive technology. A zero total shows a dash and announces No items. Values are clamped to the total. Primary and success tones use the brand palette. The ring has no loading or playback state and adds no motion.' } } },
} satisfies Meta<typeof ProgressRing>
export default meta
type Story = StoryObj<typeof meta>
export const Partial: Story = {}
export const Complete: Story = { args: { value: 8, tone: 'success' } }
export const NotStarted: Story = { args: { value: 0 } }
export const NoItems: Story = { args: { value: 0, max: 0 } }
