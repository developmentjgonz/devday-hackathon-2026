import type { Meta, StoryObj } from '@storybook/react-vite'
import { ReportTaskStage } from './stageshow/report-task'

const meta = {
  title: 'Stories/Report to care task',
  component: ReportTaskStage,
  parameters: {
    layout: 'centered',
    docs: { description: { component: 'A staged illustration using fictional details. It demonstrates a report review, a task assigned to Alex, and the open task in My Tasks. It does not change app data. Show result stops playback at the outcome; Replay demonstration starts it again. Reduced motion shows the outcome as a still.' } },
  },
} satisfies Meta<typeof ReportTaskStage>

export default meta
type Story = StoryObj<typeof meta>
export const Walkthrough: Story = {}
