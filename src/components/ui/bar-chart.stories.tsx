import type { Meta, StoryObj } from '@storybook/react-vite'
import { BarChart } from './bar-chart'

const meta = {
  title: 'Display/Bar chart',
  component: BarChart,
  args: {
    label: 'Completed tasks by assignee',
    unit: { singular: 'task', plural: 'tasks' },
    items: [
      { id: 'alex', label: 'Alex Morgan', value: 4 },
      { id: 'maya', label: 'Maya Rivera', value: 3 },
      { id: 'sam', label: 'Sam Chen', value: 2 },
    ],
  },
  parameters: { docs: { description: { component: 'A read-only horizontal bar comparison. Each row has a visible label and count; the bars are decorative. Values use the largest item as the scale. The chart adds no motion. Provide an EmptyState when there are no items.' } } },
} satisfies Meta<typeof BarChart>
export default meta
type Story = StoryObj<typeof meta>
export const Comparison: Story = {}
export const LongLabels: Story = { args: { items: [
  { id: 'long', label: 'ATeamMemberWithAVeryLongUnbrokenNameAndExtraCharacters', value: 12 },
  { id: 'zero', label: 'Another member', value: 0 },
] } }
