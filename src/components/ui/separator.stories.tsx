import type { Meta, StoryObj } from '@storybook/react-vite'
import { Separator } from './separator'

const meta = {
  title: 'Display/Separator',
  component: Separator,
  args: { orientation: 'horizontal' },
  argTypes: { orientation: { control: 'select', options: ['horizontal', 'vertical'] } },
  render: (args) => (
    <div className={args.orientation === 'vertical' ? 'flex h-12 items-center gap-4 text-sm' : 'w-80 max-w-full space-y-4 text-sm'}>
      <p>8 cats seen</p><Separator {...args} /><p className="text-muted-foreground">Food and water refilled</p>
    </div>
  ),
} satisfies Meta<typeof Separator>

export default meta
type Story = StoryObj<typeof meta>
export const Horizontal: Story = {}
export const Vertical: Story = { args: { orientation: 'vertical' } }
