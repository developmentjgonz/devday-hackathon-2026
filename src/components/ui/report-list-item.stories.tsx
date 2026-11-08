import type { Meta, StoryObj } from '@storybook/react-vite'
import { Badge } from './badge'
import { ReportListItem } from './report-list-item'

const meta = { title: 'Display/Report list item', component: ReportListItem, args: { title: 'Possible injury near feeding station', meta: 'Riverside · Care concern', badge: <Badge size="comfortable" variant="warning">Needs review</Badge> }, decorators: [(Story) => <div className="w-full max-w-sm"><Story /></div>], parameters: { docs: { description: { component: 'A full-width action for opening a report. Show its review state, title, and context; place it in a Card when it is used as a standalone row.' } } } } satisfies Meta<typeof ReportListItem>
export default meta
type Story = StoryObj<typeof meta>
export const NeedsReview: Story = {}
export const Selected: Story = { args: { selected: true } }
export const Urgent: Story = { args: { badge: <><Badge size="comfortable" variant="destructive">Urgent</Badge><Badge size="comfortable" variant="warning">Needs review</Badge></> } }
export const Waiting: Story = { args: { badge: <Badge size="comfortable" variant="outline">Waiting for details</Badge> } }
export const Reviewed: Story = { args: { badge: <Badge size="comfortable" variant="success">Reviewed</Badge> } }
