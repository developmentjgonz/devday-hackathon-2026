import { useId, type ComponentProps } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Input } from './input'
import { Label } from './label'

function InputPreview(args: ComponentProps<typeof Input>) {
  const id = useId()
  return <div className="w-80 max-w-full space-y-2"><Label htmlFor={id}>Cat name</Label><Input {...args} id={id} /></div>
}

const meta = {
  title: 'Forms/Input',
  component: Input,
  args: { placeholder: 'e.g. Miso', disabled: false },
  render: (args) => <InputPreview {...args} />,
} satisfies Meta<typeof Input>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Compact: Story = { args: { controlSize: 'sm' } }
export const Disabled: Story = { args: { disabled: true, defaultValue: 'Miso' } }
export const Invalid: Story = { args: { 'aria-invalid': true } }
