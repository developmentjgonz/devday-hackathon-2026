import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { ViewTabs } from './view-tabs'

function Example() {
  const [value, setValue] = useState('review')
  return <ViewTabs label="Report views" value={value} onValueChange={setValue} items={[{ value: 'review', label: 'To review', count: 8 }, { value: 'waiting', label: 'Waiting for details', count: 2 }, { value: 'processed', label: 'Reviewed', count: 14 }]} />
}
const meta = { title: 'Actions/View tabs', component: Example, parameters: { docs: { description: { component: 'Controlled view tabs with native Base UI tab semantics, automatic arrow-key navigation, and optional counts. Counts and labels wrap on small screens.' } } } } satisfies Meta<typeof Example>
export default meta
type Story = StoryObj<typeof meta>
export const WithCounts: Story = {}
