import { useId, type ComponentProps } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Textarea } from './textarea'
import { Label } from './label'

function TextareaPreview(args: ComponentProps<typeof Textarea>) {
  const id = useId()
  return <div className="w-80 max-w-full space-y-2"><Label htmlFor={id}>Visit notes</Label><Textarea {...args} id={id} /></div>
}

const meta = {
  title: 'Forms/Textarea',
  component: Textarea,
  args: { placeholder: '8 cats seen. Food and water bowls refilled. Miso and Pepper were both present.', rows: 3, disabled: false },
  parameters: { docs: { description: { component: 'Empty hints use the same placeholder foreground token as Input. Entered notes keep the normal foreground, with a persistent label outside the field.' } } },
  render: (args) => <TextareaPreview {...args} />,
} satisfies Meta<typeof Textarea>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Disabled: Story = { args: { disabled: true } }
export const EnteredValue: Story = { args: { defaultValue: 'Food and fresh water are available.' } }
export const Composer: Story = { args: { variant: 'composer', placeholder: 'Write a message…', rows: 1 }, parameters: { docs: { description: { story: 'The composer variant fits inside the shared chat composer, with its surface and actions supplied by that component.' } } } }
