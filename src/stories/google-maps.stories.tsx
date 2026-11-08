import type { Meta, StoryObj } from '@storybook/react-vite'
import { GoogleCatDraftDemo, GoogleColonyMapDemo, GoogleLocationPickerDemo, GoogleSearchFormDemo } from './google-maps-demo'

const meta = {
  title: 'Experiments/Google Maps',
  parameters: {
    layout: 'padded',
    docs: { description: { component: 'Local-only Google Maps prototype. Colony locations are fictional. Search results and pin selections stay in memory and are not saved. Set VITE_GOOGLE_MAPS_API_KEY in .env.local and restart Storybook to use the demo.' } },
  },
} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

export const ColonyMap: Story = { render: () => <GoogleColonyMapDemo /> }
export const CatsByColony: Story = { render: () => <GoogleColonyMapDemo scope="cats" /> }
export const LocationPicker: Story = { render: () => <GoogleLocationPickerDemo /> }
export const SearchInAForm: Story = { render: () => <GoogleSearchFormDemo /> }
export const AddCatWithColony: Story = { render: () => <GoogleCatDraftDemo /> }
