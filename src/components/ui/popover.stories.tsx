import type { Meta, StoryObj } from '@storybook/react-vite'
import { Popover, PopoverTrigger, PopoverContent, PopoverTitle, PopoverDescription, PopoverClose } from './popover'
import { AccountButton } from './account-button'
import { Button } from './button'

const meta = {
  title: 'Overlays/Popover',
  render: () => <div className="w-60 py-40"><Popover><PopoverTrigger aria-label="Account options" render={<AccountButton name="Maya Rivera" description="Administrator" />} /><PopoverContent><div className="space-y-2 p-3"><PopoverTitle>Maya Rivera</PopoverTitle><PopoverDescription>maya@mews.test</PopoverDescription></div><PopoverClose render={<Button variant="ghost" className="w-full justify-start" />}>Close account menu</PopoverClose></PopoverContent></Popover></div>,
  parameters: { docs: { description: { component: 'Shared popover surface, title, and description. The inset follows the shared surface and control radii so edge-aligned actions match the outer corners. Base UI supplies collision handling, outside dismissal, Escape, and focus return. The app account menu uses these same parts. Tall popovers scroll within the available viewport height, including short phone screens.' } } },
} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>
export const AccountMenu: Story = {}

export const LongContent: Story = { render: () => <Popover><PopoverTrigger render={<Button variant="outline" />}>Open care options</PopoverTrigger><PopoverContent><div className="space-y-3 p-3"><PopoverTitle>Care options</PopoverTitle><PopoverDescription>Choose an action for this care visit.</PopoverDescription>{Array.from({ length: 15 }, (_, index) => <PopoverClose key={index} render={<Button variant="ghost" className="w-full justify-start" />}>Care action {index + 1}</PopoverClose>)}</div></PopoverContent></Popover> }
