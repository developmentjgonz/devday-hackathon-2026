import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from './button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './dialog'

const meta = {
  title: 'Overlays/Dialog',
  component: Dialog,
  render: () => (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>Open dialog</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dialog preview</DialogTitle>
          <DialogDescription>A focused layer for a short task or message.</DialogDescription>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">Try Escape, the close button, or the button below. Focus returns to the trigger after closing.</p>
        <DialogFooter><DialogClose render={<Button />}>Done</DialogClose></DialogFooter>
      </DialogContent>
    </Dialog>
  ),
} satisfies Meta<typeof Dialog>

export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
