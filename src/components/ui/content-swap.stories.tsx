import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { ContentSwap } from './content-swap'
import { Button } from './button'
import { Text } from './typography'
function Preview() {
  const [sent, setSent] = useState(false)
  return <div className="max-w-sm space-y-4"><ContentSwap active={sent ? 'sent' : 'ready'} panels={{ ready: <Text>Your report is ready to send.</Text>, sent: <Text>Your report has been sent to the team.</Text> }} /><Button onClick={() => setSent((value) => !value)}>{sent ? 'Start again' : 'Send report'}</Button></div>
}
const meta = { title: 'Display/Content swap', component: Preview, parameters: { docs: { description: { component: 'A 140 ms crossfade between task states. Both panels share one layout footprint. Inactive content is inert and hidden from assistive technology. Reduced motion switches immediately.' } } } } satisfies Meta<typeof Preview>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
