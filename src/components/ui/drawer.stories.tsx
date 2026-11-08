import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from './button'
import { DialogDescription, DialogTitle } from './dialog'
import { Drawer, DrawerBody, DrawerContent, DrawerFooter, DrawerHeader } from './drawer'
import { Text } from './typography'
function Example() {
  const [open, setOpen] = useState(false)
  return <><Button onClick={() => setOpen(true)}>Review report</Button><Drawer open={open} onOpenChange={setOpen}><DrawerContent><DrawerHeader><DialogTitle>Morning feeding complete</DialogTitle><DialogDescription>Canal colony · Maya Rivera</DialogDescription></DrawerHeader><DrawerBody><Text>The original report and review fields appear here.</Text></DrawerBody><DrawerFooter><Button onClick={() => setOpen(false)}>Finish review</Button></DrawerFooter></DrawerContent></Drawer></>
}
const meta = { title: 'Overlays/Drawer', component: Example, parameters: { docs: { description: { component: 'A right-side Base UI modal panel with focus trapping, Escape dismissal, and focus return. The body scrolls independently, while the header and footer stay visible. At phone widths it fills the viewport. Nested dialogs share the same dialog context.' } } } } satisfies Meta<typeof Example>
export default meta
type Story = StoryObj<typeof meta>
export const RightPanel: Story = {}
