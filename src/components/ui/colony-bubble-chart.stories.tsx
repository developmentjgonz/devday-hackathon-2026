import type { Meta, StoryObj } from '@storybook/react-vite'
import { MemoryRouter } from 'react-router'
import { ColonyBubbleChart } from './colony-bubble-chart'

const names = ['Miso', 'Pepper', 'Olive', 'Bean', 'Cleo', 'Luna', 'Pumpkin', 'Sunny', 'Poppy', 'Mochi', 'Maple', 'Pip']
const meta = {
  title: 'Display/Colony bubble chart',
  component: ColonyBubbleChart,
  decorators: [(Story) => <MemoryRouter><Story /></MemoryRouter>],
  args: {
    colonies: [{ id: 'garden', name: 'Garden' }, { id: 'harbor', name: 'Harbor' }, { id: 'park', name: 'Park' }],
    cats: names.map((name, index) => ({ id: name.toLowerCase(), name, colonyId: index < 8 ? 'garden' : 'harbor' })),
  },
  parameters: { layout: 'fullscreen', docs: { description: { component: 'A linked circle for every colony, containing one action per cat. Scroll to zoom around the pointer, drag the background to pan, or use the zoom controls and Fit all. On touch screens, scroll the chart to move it. Gentle floating pauses during interaction and respects reduced-motion preferences. Hover or focus a cat for its name, colony, age, and details when available. Colors distinguish neighboring circles; they do not encode status. Provide an EmptyState when there are no colonies. Names and cats in this story are fictional.' } } },
} satisfies Meta<typeof ColonyBubbleChart>
export default meta
type Story = StoryObj<typeof meta>
export const Colonies: Story = {}
export const LargeColony: Story = { args: { colonies: [{ id: 'large', name: 'A large colony' }], cats: Array.from({ length: 50 }, (_, index) => ({ id: `cat-${index}`, name: `Cat ${index + 1}`, colonyId: 'large' })) } }
