import { useId, type ComponentProps } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Label } from './label'
import { Input } from './input'

function LabelPreview(args: ComponentProps<typeof Label>) {
  const id = useId()
  return <div className="w-80 max-w-full space-y-2"><Label {...args} htmlFor={id} /><Input id={id} placeholder="e.g. Canal colony" /></div>
}

const meta = {
  title: 'Forms/Label',
  component: Label,
  args: { children: 'Colony name' },
  render: (args) => <LabelPreview {...args} />,
} satisfies Meta<typeof Label>

export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
