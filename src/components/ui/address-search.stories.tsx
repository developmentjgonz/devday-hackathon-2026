import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import type { AddressResult } from '@/lib/address-search'
import { AddressSearch } from './address-search'
import { Text } from './typography'

function AddressSearchPreview() {
  const [selected, setSelected] = useState<AddressResult | null>(null)
  return <div className="max-w-xl space-y-3"><AddressSearch onSelect={setSelected} />{selected ? <Text size="small">Selected: {selected.label}</Text> : null}</div>
}

const meta = {
  title: 'Forms/Address search',
  component: AddressSearchPreview,
  parameters: { docs: { description: { component: 'User-submitted address and place searches use a Photon-compatible service. Results use OpenStreetMap data. Searches do not run while typing, and only the submitted query is sent to the provider.' } } },
} satisfies Meta<typeof AddressSearchPreview>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
