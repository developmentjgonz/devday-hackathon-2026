import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from './button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip'
import { Heading, Text } from './typography'

const meta = {
  title: 'Overlays/Tooltip',
  component: TooltipContent,
  parameters: { docs: { description: { component: 'Shows a short, non-interactive description on hover or keyboard focus. Tooltips stay open while the pointer moves into them, close with Escape, and use a portal to avoid clipping. On touch, the underlying control remains available.' } } },
} satisfies Meta<typeof TooltipContent>
export default meta
type Story = StoryObj<typeof meta>
export const CatDetails: Story = {
  render: () => <TooltipProvider delay={250}><Tooltip>
    <TooltipTrigger render={<Button variant="outline" />}>Hover or focus</TooltipTrigger>
    <TooltipContent><div className="space-y-1"><Heading level={3} size="compact">Miso</Heading><Text size="caption" tone="muted">Canal · About 3 years</Text><Text size="caption">Orange coat with a white chest.</Text></div></TooltipContent>
  </Tooltip></TooltipProvider>,
}
