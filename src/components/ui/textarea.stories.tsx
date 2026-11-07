import { useId, type ComponentProps } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Textarea } from './textarea'
import { Label } from './label'

function TextareaPreview(args: ComponentProps<typeof Textarea>) {
  const id = useId()
  return <div className="w-80 max-w-full space-y-2"><Label htmlFor={id}>Notes</Label><Textarea {...args} id={id} /></div>
}

const meta = {
  title: 'Forms/Textarea',
  component: Textarea,
  args: { placeholder: 'Write a few details…', rows: 3, disabled: false },
  render: (args) => <TextareaPreview {...args} />,
} satisfies Meta<typeof Textarea>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Disabled: Story = { args: { disabled: true } }
