import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from './button'
import { Text } from './typography'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './dialog'

const meta = {
  title: 'Overlays/Dialog',
  component: Dialog,
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
