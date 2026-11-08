import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { LocationPicker, locationDraft } from './location-picker'

function LocationPickerPreview({ hasLocation = false }: { hasLocation?: boolean }) {
  const [value, setValue] = useState(() => locationDraft(hasLocation ? [-80.1918, 25.7617] : undefined, hasLocation ? '123 Example Street, Miami' : ''))
  return <div className="max-w-xl"><LocationPicker value={value} onChange={setValue} initialCenter={[-80.1918, 25.7617]} /></div>
}

const meta = {
  title: 'Forms/Location picker',
  component: LocationPickerPreview,
  parameters: { docs: { description: { component: 'Search for an address or choose a point by clicking the map, using the device location, or entering coordinates. The user can save an address or landmark, or explicitly look up a nearby address for the pin. Moving the pin clears the previous address. Search and nearby lookup use Photon and OpenStreetMap data; the map uses OpenFreeMap. Story locations are fictional.' } } },
} satisfies Meta<typeof LocationPickerPreview>
export default meta
type Story = StoryObj<typeof meta>
export const Empty: Story = {}
export const Selected: Story = { args: { hasLocation: true } }
