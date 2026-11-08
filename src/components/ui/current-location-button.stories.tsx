import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import type { ChatCoordinates } from '../../../shared/schemas/public-report-chat'
import { CurrentLocationButton } from './current-location-button'
import { Text } from './typography'

function Example({ disabled = false }: { disabled?: boolean }) {
  const [location, setLocation] = useState<ChatCoordinates | null>(null)
  return <div className="max-w-md space-y-3"><CurrentLocationButton disabled={disabled} onSelect={setLocation} />
    {location ? <Text size="small">{location.latitude.toFixed(6)}, {location.longitude.toFixed(6)} · Approximate accuracy: {Math.round(location.accuracy ?? 0)} m</Text>
      : <Text size="small" tone="muted">Use this if you are where you saw the cats.</Text>}
  </div>
}

const meta = {
  title: 'Forms/Current location', component: Example,
  parameters: { docs: { description: { component: 'A single device-location request, triggered only by pressing the shared button. Uses Button loading, asks for browser permission, reports denied/unavailable/timeout errors, and ignores late results after unmount or disabling. Does not send a network request or save a location itself. This story uses the browser’s real permission prompt. Product flows choose when to confirm or submit the returned pin.' } } },
} satisfies Meta<typeof Example>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Disabled: Story = { args: { disabled: true } }
