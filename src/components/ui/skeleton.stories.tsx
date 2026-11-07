import type { Meta, StoryObj } from '@storybook/react-vite'
import { Skeleton } from './skeleton'

const meta = { title: 'Feedback/Skeleton', component: Skeleton } satisfies Meta<
  typeof Skeleton
>
export default meta
type Story = StoryObj<typeof meta>
export const Text: Story = {
  render: () => (
    <div className="w-64 space-y-3" role="status" aria-label="Loading care notes">
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
      <Skeleton className="h-3 w-3/5" />
    </div>
  ),
}
export const CareCard: Story = {
  render: () => (
    <div
      className="w-72 max-w-full space-y-5 rounded-surface border bg-card p-6"
      role="status"
      aria-label="Loading colony card"
      aria-busy="true"
    >
      <div className="flex items-center gap-3">
        <Skeleton className="size-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-2.5 w-1/2" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
      </div>
      <Skeleton className="h-(--control-height) w-full rounded-control" />
    </div>
  ),
}
