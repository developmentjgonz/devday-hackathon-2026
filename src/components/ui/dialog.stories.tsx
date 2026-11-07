import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from './button'
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
