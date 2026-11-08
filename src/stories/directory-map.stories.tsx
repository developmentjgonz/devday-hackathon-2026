import type { Meta, StoryObj } from '@storybook/react-vite'
import { MemoryRouter } from 'react-router'
import { DirectoryMap } from '@/features/colonies/components/directory-map'

const data = {
  colonies: [{ id: 'canal', name: 'Canal', coordinates: [-80.226, 25.797] as [number, number] }],
  cats: [{ id: 'miso', name: 'Miso', colonyId: 'canal' }],
  reports: [],
}

const meta = {
  title: 'Pages/Directory map',
  component: DirectoryMap,
  decorators: [(Story) => <MemoryRouter><Story /></MemoryRouter>],
  args: { ...data, scope: 'colonies' },
  parameters: { docs: { description: { component: 'A team directory map using fictional coordinates. Cat markers describe the colony location, not a cat sighting. Select a location to open the related records.' } } },
} satisfies Meta<typeof DirectoryMap>
export default meta
type Story = StoryObj<typeof meta>
export const Colonies: Story = {}
export const Cats: Story = { args: { scope: 'cats' } }
