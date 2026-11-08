import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { LocationPicker, locationDraft } from './location-picker'

function LocationPickerPreview({ hasLocation = false }: { hasLocation?: boolean }) {
  const [value, setValue] = useState(() => locationDraft(hasLocation ? [-80.1918, 25.7617] : undefined))
  return <div className="max-w-xl"><LocationPicker value={value} onChange={setValue} initialCenter={[-80.1918, 25.7617]} /></div>
}

const meta = {
  title: 'Forms/Location picker',
  component: LocationPickerPreview,
  parameters: { docs: { description: { component: 'Choose a single point by clicking the map, using the device location, or entering latitude and longitude. The map uses the OpenFreeMap basemap and retains its attribution. Coordinates remain usable if the map background is unavailable. Story locations are fictional.' } } },
} satisfies Meta<typeof LocationPickerPreview>
export default meta
type Story = StoryObj<typeof meta>
export const Empty: Story = {}
export const Selected: Story = { args: { hasLocation: true } }
