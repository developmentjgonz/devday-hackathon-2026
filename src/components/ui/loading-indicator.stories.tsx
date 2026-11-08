import type { Meta, StoryObj } from '@storybook/react-vite'
import { LoadingIndicator } from './loading-indicator'
import { Button } from './button'
import { LoaderMotionDemo } from '@/stories/examples/loader-motion-demo'

const meta = {
  title: 'Feedback/Loading indicator',
  component: LoadingIndicator,
  args: {
    size: 'md',
    label: 'Loading colony updates',
    paused: false,
  },
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
} satisfies Meta<typeof LoadingIndicator>
export default meta
type Story = StoryObj<typeof meta>
export const MotionPreview: Story = {
  render: () => <LoaderMotionDemo />,
  parameters: {
    layout: 'padded',
    docs: { description: { story: 'The shared single-paw loader in standalone, compact, primary-button, and outline-button contexts. Pause freezes the current frame; slow motion extends the full cycle. The playback button reserves space for both labels so its size stays the same when toggled. The 1.2-second repeating status cycle uses opacity only, with no movement or layout animation.' } },
  },
}
export const SinglePaw: Story = { args: { size: 'lg' } }
export const Compact: Story = { args: { size: 'sm' } }
export const InButton: Story = { render: () => <Button loading>Saving visit</Button> }
export const Paused: Story = {
  args: {
    size: 'lg',
    paused: true,
    label: 'Colony updates paused',
  },
}
