import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { LayoutGrid, List, Map as MapIcon } from 'lucide-react'
import { ViewSwitcher } from './view-switcher'

function ViewSwitcherExample({ variant = 'list' }: { variant?: 'list' | 'map' }) {
  const [view, setView] = useState<'cards' | 'list' | 'map'>('cards')
  return <ViewSwitcher label={variant === 'map' ? 'Cat view' : 'Task view'} value={view} onValueChange={setView} options={[
    { value: 'cards', label: 'Cards', icon: <LayoutGrid aria-hidden="true" /> },
    variant === 'map'
      ? { value: 'map', label: 'Map', icon: <MapIcon aria-hidden="true" /> }
      : { value: 'list', label: 'List', icon: <List aria-hidden="true" /> },
  ]} />
}

const meta = {
  title: 'Actions/View switcher', component: ViewSwitcherExample,
  parameters: { docs: { description: { component: 'A labelled, controlled choice between presentations of the same content. The segment button size keeps the whole switcher aligned with small buttons and search fields. Its inner corners follow the track with a consistent inset. The active button keeps its surface on hover, and hovering another option does not change the selection. Keyboard focus remains visible.' } } },
} satisfies Meta<typeof ViewSwitcherExample>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const CardsAndMap: Story = { args: { variant: 'map' } }
