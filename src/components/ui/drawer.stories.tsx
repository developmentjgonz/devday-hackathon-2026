import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from './button'
import { DialogDescription, DialogTitle } from './dialog'
import { Drawer, DrawerBody, DrawerContent, DrawerFooter, DrawerHeader } from './drawer'
import { Text } from './typography'
function Example({ density = 'default', motion = 'default' }: { density?: 'default' | 'compact'; motion?: 'default' | 'none' }) {
  const [open, setOpen] = useState(false)
  return <><Button onClick={() => setOpen(true)}>Review report</Button><Drawer open={open} onOpenChange={setOpen}><DrawerContent motion={motion}><DrawerHeader density={density}><DialogTitle size={density === 'compact' ? 'card' : 'section'}>Morning feeding complete</DialogTitle><DialogDescription>Canal colony · Maya Rivera</DialogDescription></DrawerHeader><DrawerBody><Text>The original report and review fields appear here.</Text></DrawerBody><DrawerFooter><Button onClick={() => setOpen(false)}>Finish review</Button></DrawerFooter></DrawerContent></Drawer></>
}
const meta = { title: 'Overlays/Drawer', component: Example, parameters: { docs: { description: { component: 'A right-side Base UI modal panel with focus trapping, Escape dismissal, and focus return. The body scrolls independently, while the header and footer stay visible. The default panel fills phone screens; size="navigation" leaves a visible backdrop beside the menu. DrawerTrigger connects a shared Button to the panel. Header and close-button spacing respect the top safe area; the footer respects the bottom safe area. Header, body, and footer expose data-slot attributes for layout checks. Nested dialogs share the same dialog context. Use closeDisabled while a save is pending, together with controlled onOpenChange to prevent dismissal until it finishes.' } } } } satisfies Meta<typeof Example>
export default meta
type Story = StoryObj<typeof meta>
export const RightPanel: Story = {}
export const CompactHeader: Story = { args: { density: 'compact' }, parameters: { docs: { description: { story: 'DrawerHeader density="compact" reduces header padding and spacing while preserving safe areas and room for the close control. DialogTitle size="card" uses the shared heading scale for a compact record title.' } } } }
export const WithoutMotion: Story = { args: { motion: 'none' }, parameters: { docs: { description: { story: 'DrawerContent motion="none" keeps the panel and backdrop still during an immediate handoff between related views.' } } } }
