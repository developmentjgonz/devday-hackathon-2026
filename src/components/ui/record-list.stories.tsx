import type { Meta, StoryObj } from '@storybook/react-vite'
import { House } from 'lucide-react'
import { Badge } from './badge'
import { EmptyState } from './empty-state'
import { RecordAvatar } from './record-avatar'
import { RecordList, RecordListItem } from './record-list'

const records = Array.from({ length: 45 }, (_, index) => ({ id: index, name: `Colony ${String(index + 1).padStart(2, '0')}` }))
function Example({ empty = false, long = false, count = records.length }: { empty?: boolean; long?: boolean; count?: number }) {
  return <RecordList items={empty ? [] : records.slice(0, count)} getKey={(item) => item.id} label="Colonies" itemName="colony"
    emptyState={<EmptyState icon={<House />} title="No colonies" />}
    renderItem={(item) => <RecordListItem title={long && item.id === 0 ? 'TheVeryLongUnbrokenColonyNameThatNeedsToWrapOnSmallScreens' : item.name}
      render={<a href={`#colony-${item.id}`} />} leading={<RecordAvatar name={item.name} kind="colony" size="sm" />}
      meta="12 known cats · 3 open tasks" badge={item.id === 0 ? <Badge variant="destructive">Needs care</Badge> : undefined} />}
  />
}
const meta = {
  title: 'Display/Record list', component: Example,
  parameters: { layout: 'padded', docs: { description: { component: 'A compact vertical list for records. RecordList uses Card and CardList for one divided surface. It adds 20 local records at a time with Show more, preserves existing rows, announces the count, and moves focus to the first new action. Change the React key when filters change to reset the visible limit. Supply a feature-specific EmptyState. RecordListItem is a shared button action, or a real link through render. It supports a title, context, two lines of description, a leading avatar, status badges, and a selected state. Keep editing and secondary record links in the detail view. First and last rows inherit the card corners, including keyboard focus, selected, hover, and press states. A single row inherits all four corners. Hover is limited to a fine pointer that supports hover. Do not nest buttons or links inside a row action. This is client-side rendering; it does not fetch server pages.' } } },
  decorators: [(Story) => <div className="mx-auto max-w-2xl"><Story /></div>],
} satisfies Meta<typeof Example>
export default meta
type Story = StoryObj<typeof meta>
export const Colonies: Story = {}
export const LongContent: Story = { args: { long: true } }
export const SingleRecord: Story = { args: { count: 1 } }
export const TwoRecords: Story = { args: { count: 2 } }
export const Empty: Story = { args: { empty: true } }
