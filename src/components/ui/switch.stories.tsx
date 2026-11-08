import { useId, type ComponentProps } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Label } from './label'
import { Switch } from './switch'

function SwitchPreview(args: ComponentProps<typeof Switch>) {
  const id = useId()
  return <div className="flex items-center gap-3"><Switch {...args} id={id} /><Label htmlFor={id}>Show phone number</Label></div>
}

const meta = {
  title: 'Forms/Switch',
  component: Switch,
  render: (args) => <SwitchPreview {...args} />,
  parameters: { docs: { description: { component: 'Use a switch for an on or off setting. Its 44px hit area extends above and below the visible track. An adjacent shared Label keeps the row at least 44px high. Pair it with a label that describes what enabling it does. A switch inside a form is saved with the other form changes.' } } },
} satisfies Meta<typeof Switch>
export default meta
type Story = StoryObj<typeof meta>
export const Off: Story = {}
export const On: Story = { args: { defaultChecked: true } }
export const Disabled: Story = { args: { disabled: true } }
