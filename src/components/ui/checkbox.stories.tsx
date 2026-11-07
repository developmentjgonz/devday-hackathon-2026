import { useId, type ComponentProps } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Checkbox } from './checkbox'
import { Label } from './label'

function CheckboxPreview(args: ComponentProps<typeof Checkbox>) {
  const id = useId()
  return <div className="flex items-center gap-3"><Checkbox {...args} id={id} /><Label htmlFor={id}>Fresh water provided</Label></div>
}

const meta = {
  title: 'Forms/Checkbox',
  component: Checkbox,
  args: { disabled: false },
  render: (args) => <CheckboxPreview {...args} />,
} satisfies Meta<typeof Checkbox>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Checked: Story = { args: { defaultChecked: true } }
export const Disabled: Story = { args: { disabled: true } }
