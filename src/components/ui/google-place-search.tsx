/// <reference types="google.maps" />
import { useRef } from 'react'
import { googleLibrary } from '@/lib/google-maps'
import { AddressSearchField } from './address-search-field'
import { GoogleMapsAttribution } from './google-maps-attribution'
import { Text } from './typography'

export type GooglePlaceSelection = { point: google.maps.LatLngLiteral; placeId: string; address: string }

/** Search Google Places as the user types, using one session for each selection. */
export function GooglePlaceSearch({ onSelect, cancelVersion, disabled = false, selectedAddress = '', hasLocation = false, onBusyChange }: {
  onSelect: (place: GooglePlaceSelection) => void
  cancelVersion: number
  disabled?: boolean
  selectedAddress?: string
  hasLocation?: boolean
  onBusyChange?: (busy: boolean) => void
}) {
  const session = useRef<google.maps.places.AutocompleteSessionToken | null>(null)
  return <AddressSearchField
    disabled={disabled}
    selectedAddress={selectedAddress}
    hasLocation={hasLocation}
    resetVersion={cancelVersion}
    onBusyChange={onBusyChange}
    onSelect={onSelect}
    search={async (input, signal) => {
      const { AutocompleteSessionToken, AutocompleteSuggestion } = await googleLibrary('places')
      if (signal.aborted) return []
      session.current ??= new AutocompleteSessionToken()
      const response = await AutocompleteSuggestion.fetchAutocompleteSuggestions({ input, sessionToken: session.current })
      return response.suggestions.flatMap((item) => item.placePrediction ? [item.placePrediction] : [])
    }}
    resolve={async (prediction) => {
      const place = prediction.toPlace()
      await place.fetchFields({ fields: ['id', 'location', 'formattedAddress'] })
      if (!place.location || !place.id) throw new Error('Place details unavailable')
      const address = place.formattedAddress ?? prediction.text.toString()
      return { selection: { point: place.location.toJSON(), placeId: place.id, address }, address }
    }}
    resultLabel={(prediction) => ({ key: prediction.placeId, title: prediction.mainText?.toString() ?? prediction.text.toString(), description: prediction.secondaryText?.toString() ?? '' })}
    onSessionEnd={() => { session.current = null }}
    attribution={<><Text size="caption" tone="muted">Searches are sent as you type to Google Maps.</Text>{selectedAddress ? <GoogleMapsAttribution /> : null}</>}
    resultAttribution={<GoogleMapsAttribution />}
  />
}
