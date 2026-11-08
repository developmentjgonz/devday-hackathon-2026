import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from './button'
import { Text } from './typography'
import { Dialog, DialogBody, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './dialog'
import { Input } from './input'
import { Label } from './label'

const meta = {
  title: 'Overlays/Dialog',
  component: Dialog,
  parameters: { docs: { description: { component: 'DialogContent supports closeDisabled during a pending save. Control onOpenChange as well when dismissal must wait for the save. Its shared dialog-close button size follows the inset curve of the dialog surface.' } } },
  render: () => (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>View last visit</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Canal colony · Last visit</DialogTitle>
          <DialogDescription>Morning feeding · 8:15 am</DialogDescription>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">8 cats seen. Food and water bowls refilled. Miso and Pepper were both present.</p>
        <DialogFooter><DialogClose render={<Button />}>Close visit</DialogClose></DialogFooter>
      </DialogContent>
    </Dialog>
  ),
} satisfies Meta<typeof Dialog>

export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const CompactTitle: Story = {
  render: () => <Dialog><DialogTrigger render={<Button variant="outline" />}>Open compact title</DialogTrigger><DialogContent><DialogHeader><DialogTitle size="card">Care check requested at Grove</DialogTitle><DialogDescription>Report details use the shared card-title size.</DialogDescription></DialogHeader><DialogFooter><DialogClose render={<Button />}>Close details</DialogClose></DialogFooter></DialogContent></Dialog>,
  parameters: { docs: { description: { story: 'DialogTitle accepts the shared Heading size values independently of its dialog-title semantics. The default is section; card is used for compact record drawers.' } } },
}

export const Wide: Story = {
  render: () => <Dialog><DialogTrigger render={<Button variant="outline" />}>Open wide dialog</DialogTrigger><DialogContent size="wide"><DialogHeader><DialogTitle>Photo details</DialogTitle><DialogDescription>A wider dialog for images and other visual content.</DialogDescription></DialogHeader><Text>Wide dialogs use the same phone width and viewport height limit as the default dialog.</Text><DialogFooter><DialogClose render={<Button />}>Close details</DialogClose></DialogFooter></DialogContent></Dialog>,
}

export const ScrollingForm: Story = {
  render: () => <Dialog><DialogTrigger render={<Button variant="outline" />}>Open long form</DialogTrigger><DialogContent layout="scroll"><form className="flex min-h-0 flex-col" onSubmit={(event) => event.preventDefault()}>
    <DialogHeader><DialogTitle>Care task details</DialogTitle><DialogDescription>Review the visit notes.</DialogDescription></DialogHeader>
    <DialogBody>{Array.from({ length: 12 }, (_, index) => <div key={index} className="grid gap-2"><Label htmlFor={`scroll-note-${index}`}>Visit note {index + 1}</Label><Input id={`scroll-note-${index}`} placeholder="Add a care note" /></div>)}</DialogBody>
    <DialogFooter><DialogClose render={<Button variant="outline" />}>Cancel</DialogClose><DialogClose render={<Button />}>Done</DialogClose></DialogFooter>
  </form></DialogContent></Dialog>,
  parameters: { docs: { description: { story: 'Use DialogContent layout="scroll" with a flex column form, DialogHeader, DialogBody, and DialogFooter. Only the body scrolls. The rounded shell clips the inset scroll track; the heading, close action, and footer remain fixed. The default layout still supports short dialogs. Task creation and editing use this shared layout.' } } },
}
