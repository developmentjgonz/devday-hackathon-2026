import { addressLabel, addressResults, type AddressResult } from '../../../shared/address-search'
import { geocodingUrl } from '@/lib/geocoding-service'
import { AddressSearchField } from './address-search-field'
import { TextLink } from './text-link'
import { Text } from './typography'

async function searchAddresses(query: string, signal: AbortSignal) {
  const url = geocodingUrl('search')
  url.searchParams.set('q', query)
  url.searchParams.set('limit', '5')
  const response = await fetch(url, { signal, credentials: 'omit', referrerPolicy: 'no-referrer' })
  if (!response.ok) throw new Error('Address search unavailable')
  return addressResults(await response.json())
}

/** Search for an address or place and choose one result. */
export function AddressSearch({ onSelect, disabled = false, selectedAddress = '', hasLocation = false, cancelVersion = 0, onBusyChange, errorDescription, showPinLookup = true, resultsPlacement = 'overlay' }: {
  onSelect: (result: AddressResult) => void
  disabled?: boolean
  selectedAddress?: string
  hasLocation?: boolean
  cancelVersion?: number
  onBusyChange?: (busy: boolean) => void
  errorDescription?: string
  showPinLookup?: boolean
  resultsPlacement?: 'overlay' | 'inline'
}) {
  return <AddressSearchField
    disabled={disabled}
    selectedAddress={selectedAddress}
    hasLocation={hasLocation}
    resetVersion={cancelVersion}
    onBusyChange={onBusyChange}
    errorDescription={errorDescription}
    resultsPlacement={resultsPlacement}
    onSelect={onSelect}
    search={searchAddresses}
    resolve={async (result) => ({ selection: result, address: addressLabel(result) })}
    resultLabel={(result, index) => ({ key: `${result.coordinates.join(',')}-${index}`, title: result.label, description: result.detail })}
    attribution={<div className="flex flex-wrap items-center gap-x-1"><Text render={<span />} size="caption" tone="muted">{showPinLookup ? 'Searches as you type and pin lookups are sent to' : 'Search:'}</Text><TextLink size="sm" href="https://photon.komoot.io/" target="_blank" rel="noreferrer">Photon</TextLink><Text render={<span />} size="caption" tone="muted">·</Text><TextLink size="sm" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</TextLink></div>}
  />
}
