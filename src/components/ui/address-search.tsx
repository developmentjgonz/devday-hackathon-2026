import { useEffect, useId, useRef, useState } from 'react'
import { CircleAlert, Search } from 'lucide-react'
import { addressResults, type AddressResult } from '@/lib/address-search'
import { Button } from './button'
import { EmptyState } from './empty-state'
import { Input } from './input'
import { Label } from './label'
import { RecordButton } from './record-button'
import { TextLink } from './text-link'
import { Text } from './typography'

const endpoint = import.meta.env.VITE_GEOCODER_URL || 'https://photon.komoot.io/api'

/** Submit an address or place search and choose one result. */
export function AddressSearch({ onSelect, disabled = false }: { onSelect: (result: AddressResult) => void; disabled?: boolean }) {
  const id = useId()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<AddressResult[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [failed, setFailed] = useState(false)
  const request = useRef<AbortController | null>(null)

  useEffect(() => () => { request.current?.abort(); request.current = null }, [])

  function updateQuery(value: string) {
    request.current?.abort()
    request.current = null
    setSearching(false)
    setResults(null)
    setFailed(false)
    setQuery(value)
  }
  async function search() {
    const term = query.trim()
    if (!term || searching || disabled) return
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    setSearching(true); setResults(null); setFailed(false)
    try {
      const url = new URL(endpoint)
      url.searchParams.set('q', term)
      url.searchParams.set('limit', '5')
      const response = await fetch(url, { signal: controller.signal, credentials: 'omit', referrerPolicy: 'no-referrer' })
      if (!response.ok) throw new Error('Address search unavailable')
      const matches = addressResults(await response.json())
      if (!controller.signal.aborted) setResults(matches)
    } catch {
      if (!controller.signal.aborted) setFailed(true)
    } finally {
      if (request.current === controller) { request.current = null; setSearching(false) }
    }
  }

  return <div className="space-y-2">
    <Label htmlFor={id}>Search for an address or place</Label>
    <div className="flex items-start gap-2">
      <Input id={id} type="search" maxLength={200} placeholder="Street address, city…" value={query} disabled={disabled} onChange={(event) => updateQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.nativeEvent.isComposing) { event.preventDefault(); void search() } }} />
      <Button type="button" variant="outline" loading={searching} disabled={disabled || !query.trim()} onClick={() => void search()}><Search aria-hidden="true" />Search</Button>
    </div>
    {failed ? <EmptyState role="alert" tone="danger" icon={<CircleAlert />} title="Address search unavailable" description="Try again, or place a pin on the map." /> : null}
    {results && !results.length ? <EmptyState role="status" icon={<Search />} title="No matching addresses" description="Try another address or include the city." /> : null}
    {results?.length ? <Text role="status" className="sr-only">{results.length} {results.length === 1 ? 'address' : 'addresses'} found.</Text> : null}
    {results?.length ? <ul aria-label="Address search results" className="grid max-h-56 gap-2 overflow-y-auto p-0">
      {results.map((result, index) => <li key={`${result.coordinates.join(',')}-${index}`}><RecordButton type="button" className="w-full" title={result.label} description={result.detail} disabled={disabled} onClick={() => { onSelect(result); updateQuery(result.label) }} /></li>)}
    </ul> : null}
    <div className="flex flex-wrap items-center gap-x-1"><Text render={<span />} size="caption" tone="muted">Searches are sent to</Text><TextLink size="sm" href="https://photon.komoot.io/" target="_blank" rel="noreferrer">Photon</TextLink><Text render={<span />} size="caption" tone="muted">·</Text><TextLink size="sm" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</TextLink></div>
  </div>
}
