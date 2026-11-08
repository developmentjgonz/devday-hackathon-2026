import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { LayoutGrid, List } from 'lucide-react'
import { ViewSwitcher } from './view-switcher'

function ViewSwitcherExample() {
  const [view, setView] = useState<'cards' | 'list'>('cards')
  return <ViewSwitcher label="Task view" value={view} onValueChange={setView} options={[
    { value: 'cards', label: 'Cards', icon: <LayoutGrid aria-hidden="true" /> },
    { value: 'list', label: 'List', icon: <List aria-hidden="true" /> },
  ]} />
}

const meta = {
  title: 'Actions/View switcher', component: ViewSwitcherExample,
  parameters: { docs: { description: { component: 'A labelled, controlled choice between two presentations of the same content. The segment button size keeps the whole switcher aligned with small buttons and search fields. The active button keeps its surface on hover, and hovering another option does not change the selection. Keyboard focus remains visible.' } } },
} satisfies Meta<typeof ViewSwitcherExample>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
