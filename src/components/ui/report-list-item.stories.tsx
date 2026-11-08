import type { Meta, StoryObj } from '@storybook/react-vite'
import { Badge } from './badge'
import { ReportListItem } from './report-list-item'

const meta = { title: 'Display/Report list item', component: ReportListItem, args: { title: 'Possible injury near feeding station', summary: 'Pepper is limping and did not come over for food.', meta: 'Riverside · Maya Rivera · Nov 7, 10:40 AM', unread: true }, decorators: [(Story) => <div className="w-full max-w-sm"><Story /></div>] } satisfies Meta<typeof ReportListItem>
export default meta
type Story = StoryObj<typeof meta>
export const Unread: Story = {}
export const Selected: Story = { args: { selected: true, unread: false } }
export const Urgent: Story = { args: { badge: <Badge variant="destructive">Urgent</Badge> } }
export const PossibleDuplicate: Story = { args: { badge: <Badge variant="warning">Possible duplicate</Badge> } }
