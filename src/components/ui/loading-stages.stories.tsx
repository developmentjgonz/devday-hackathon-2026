import type { Meta, StoryObj } from '@storybook/react-vite'
import { LoadingStages, type LoadingStagesProps } from './loading-stages'
import {
  careSteps,
  LoadingStagesDemo,
} from '@/stories/examples/loading-stages-demo'

const meta = {
  title: 'Feedback/Loading stages',
  component: LoadingStages,
  args: {
    steps: careSteps,
    currentStep: 1,
    status: 'loading',
    label: 'Preparing your workspace',
  },
  argTypes: {
    status: { control: 'select', options: ['loading', 'complete', 'error'] },
    currentStep: { control: { type: 'number', min: 0, max: 2 } },
  },
  render: (args: LoadingStagesProps) => (
    <div className="w-80 max-w-full">
      <LoadingStages {...args} />
    </div>
  ),
} satisfies Meta<typeof LoadingStages>
export default meta
type Story = StoryObj<typeof meta>
export const InProgress: Story = {}
export const Complete: Story = { args: { status: 'complete' } }
export const Error: Story = {
  args: {
    status: 'error',
    errorMessage:
      'We could not load colony updates. Try again when your connection is ready.',
  },
}
export const Empty: Story = { args: { steps: [] } }
export const Interactive: Story = { render: () => <LoadingStagesDemo /> }

export const Paused: Story = { args: { paused: true } }
