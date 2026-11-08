import type { Meta, StoryObj } from '@storybook/react-vite'
import { Label } from './label'
import { SelectField } from './select-field'

const meta = {
  title: 'Forms/Select field',
  component: SelectField,
  render: (args) => <div className="grid w-64 gap-2"><Label htmlFor="colony-select">Colony</Label><SelectField {...args} id="colony-select"><option value="">Colony unknown</option><option value="canal">Canal colony</option><option value="riverside">Riverside colony</option></SelectField></div>,
} satisfies Meta<typeof SelectField>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Compact: Story = { args: { controlSize: 'sm' } }
export const Disabled: Story = { args: { disabled: true } }
export const Invalid: Story = { args: { 'aria-invalid': true } }
