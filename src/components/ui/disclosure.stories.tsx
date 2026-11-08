import type { Meta, StoryObj } from '@storybook/react-vite'
import { Disclosure } from './disclosure'
import { Text } from './typography'

const meta = {
  title: 'Display/Disclosure', component: Disclosure,
  args: { title: 'Review history', children: <Text size="small" tone="muted">Maya reviewed this report and confirmed its colony.</Text> },
  decorators: [(Story) => <div className="w-80 max-w-full"><Story /></div>],
} satisfies Meta<typeof Disclosure>
export default meta
type Story = StoryObj<typeof meta>
export const Closed: Story = {}
export const Open: Story = { args: { open: true } }
