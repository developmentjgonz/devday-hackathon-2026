import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import type { AddressResult } from '../../../shared/address-search'
import { AddressSearch } from './address-search'
import { Text } from './typography'

function AddressSearchPreview({ resultsPlacement = 'overlay' }: { resultsPlacement?: 'overlay' | 'inline' }) {
  const [selected, setSelected] = useState<AddressResult | null>(null)
  return <div className="max-w-xl space-y-3"><AddressSearch onSelect={setSelected} resultsPlacement={resultsPlacement} />{selected ? <Text size="small">Selected: {selected.label}</Text> : null}</div>
}

const meta = {
  title: 'Forms/Address search',
  component: AddressSearchPreview,
  parameters: { docs: { description: { component: 'Address and place suggestions use a Photon-compatible service and OpenStreetMap data. Searches start after at least three characters and a short pause in typing. Selecting a result confirms the location; Escape restores the previous selection.' } } },
} satisfies Meta<typeof AddressSearchPreview>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const InlineResults: Story = { args: { resultsPlacement: 'inline' } }
