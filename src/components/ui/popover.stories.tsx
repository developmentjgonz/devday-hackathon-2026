import type { Meta, StoryObj } from '@storybook/react-vite'
import { Popover, PopoverTrigger, PopoverContent, PopoverTitle, PopoverDescription, PopoverClose } from './popover'
import { AccountButton } from './account-button'
import { Button } from './button'

const meta = {
  title: 'Overlays/Popover',
  render: () => <div className="w-60 py-40"><Popover><PopoverTrigger aria-label="Account options" render={<AccountButton name="Maya Rivera" description="Administrator" />} /><PopoverContent><div className="space-y-2 p-3"><PopoverTitle>Maya Rivera</PopoverTitle><PopoverDescription>maya@mews.test</PopoverDescription></div><PopoverClose render={<Button variant="ghost" />}>Close account menu</PopoverClose></PopoverContent></Popover></div>,
  parameters: { docs: { description: { component: 'Shared popover surface, title, and description. Base UI supplies collision handling, outside dismissal, Escape, and focus return. The app account menu uses these same parts.' } } },
} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>
export const AccountMenu: Story = {}
