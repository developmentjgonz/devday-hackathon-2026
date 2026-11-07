import { useId, type ComponentProps } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Input } from './input'
import { Label } from './label'

function InputPreview(args: ComponentProps<typeof Input>) {
  const id = useId()
  return <div className="w-80 max-w-full space-y-2"><Label htmlFor={id}>Name</Label><Input {...args} id={id} /></div>
}

const meta = {
  title: 'Forms/Input',
  component: Input,
  args: { placeholder: 'Enter a name', disabled: false },
  render: (args) => <InputPreview {...args} />,
} satisfies Meta<typeof Input>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Disabled: Story = { args: { disabled: true, placeholder: 'Unavailable' } }
export const Invalid: Story = { args: { 'aria-invalid': true } }
