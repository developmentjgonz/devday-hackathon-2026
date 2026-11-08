import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { Button } from './button'
import { DialogTitle } from './dialog'
import { Drawer, DrawerBody, DrawerContent, DrawerFooter, DrawerHeader } from './drawer'
import { Input } from './input'
import { Label } from './label'
import { toast } from './toaster'

function ToastExample() {
  return <div className="flex flex-wrap gap-3">
    <Button onClick={() => toast.success('Report reviewed', { description: 'Care check requested at Grove' })}>Show save confirmation</Button>
    <Button variant="outline" onClick={() => toast.error('Could not save the report', { description: 'Your changes are still available. Try again.' })}>Show error</Button>
  </div>
}

const meta = {
  title: 'Feedback/Notifications', component: ToastExample,
  parameters: { docs: { description: { component: 'Shared Sonner notifications by Emil Kowalski. The app and Storybook each mount one host. Save confirmations appear at the bottom right without moving page content. In an open drawer, they sit above its fixed actions. Mews typography and color tokens supply the presentation. Notifications can be dismissed and expire automatically. The loading icon uses the shared cat-print indicator. Keep field validation next to the field; use notifications for completed actions and request failures. Source: https://github.com/emilkowalski/sonner' } } },
} satisfies Meta<typeof ToastExample>
export default meta
type Story = StoryObj<typeof meta>
export const SaveAndError: Story = {}

function DrawerConfirmationExample() {
  const [open, setOpen] = useState(false)
  return <>
    <Button onClick={() => { toast.success('Cat added', { description: 'Poppy', duration: 15000 }); setOpen(true) }}>Open editor with confirmation</Button>
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerContent aria-describedby={undefined}>
        <DrawerHeader density="compact"><DialogTitle size="card" className="flex min-h-11 items-center">Edit cat profile</DialogTitle></DrawerHeader>
        <DrawerBody><div className="grid gap-2"><Label htmlFor="notification-cat-name">Cat name</Label><Input id="notification-cat-name" defaultValue="Poppy" /></div></DrawerBody>
        <DrawerFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={() => setOpen(false)}>Save profile</Button></DrawerFooter>
      </DrawerContent>
    </Drawer>
  </>
}

export const AboveDrawerActions: Story = {
  render: () => <DrawerConfirmationExample />,
  parameters: { docs: { description: { story: 'Notifications sit above the open drawer footer. The shared host measures its height, including stacked phone actions and safe-area padding. Closing the drawer returns notifications to the normal bottom offset.' } } },
}
