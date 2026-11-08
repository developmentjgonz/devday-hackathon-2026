import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { CircleAlert, Search } from 'lucide-react'
import { Button } from './button'
import { Card } from './card'
import { EmptyState } from './empty-state'
import { Input } from './input'
import { Label } from './label'
import { LoadingIndicator } from './loading-indicator'
import { RecordButton } from './record-button'
import { Text } from './typography'

type ResultLabel = { key: string; title: string; description: string }

type AddressSearchFieldProps<Result, Selection> = {
  selectedAddress?: string
  hasLocation?: boolean
  resetVersion?: number
  disabled?: boolean
  onBusyChange?: (busy: boolean) => void
  onSelect: (selection: Selection) => void
  search: (query: string, signal: AbortSignal) => Promise<Result[]>
  resolve: (result: Result, signal: AbortSignal) => Promise<{ selection: Selection; address: string }>
  resultLabel: (result: Result, index: number) => ResultLabel
  onSessionEnd?: () => void
  attribution: ReactNode
  resultAttribution?: ReactNode
  errorDescription?: string
  resultsPlacement?: 'overlay' | 'inline'
}

/** Shared address suggestions for the supported geocoding providers. */
export function AddressSearchField<Result, Selection>({
  selectedAddress = '', hasLocation = false, resetVersion = 0, disabled = false,
  onBusyChange, onSelect, search, resolve, resultLabel, onSessionEnd, attribution, resultAttribution,
  errorDescription = 'Try again, or choose a point on the map.', resultsPlacement = 'overlay',
}: AddressSearchFieldProps<Result, Selection>) {
  const id = useId()
  const resultsId = useId()
  const input = useRef<HTMLInputElement>(null)
  const container = useRef<HTMLDivElement>(null)
  const list = useRef<HTMLUListElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const request = useRef<AbortController | null>(null)
  const composing = useRef(false)
  const busyCallback = useRef(onBusyChange)
  const sessionEnd = useRef(onSessionEnd)
  busyCallback.current = onBusyChange
  sessionEnd.current = onSessionEnd
  const [query, setQuery] = useState(selectedAddress)
  const [editing, setEditing] = useState(false)
  const [open, setOpen] = useState(false)
  const [results, setResults] = useState<Result[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [selecting, setSelecting] = useState<string | null>(null)
  const [error, setError] = useState(false)
  const pending = Boolean(selecting) || (editing && (hasLocation || Boolean(query.trim())))

  function cancelRequest() {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    request.current?.abort()
    request.current = null
  }

  useEffect(() => {
    cancelRequest()
    sessionEnd.current?.()
    setQuery(selectedAddress); setEditing(false); setOpen(false); setResults(null); setSearching(false); setSelecting(null); setError(false)
  }, [selectedAddress, resetVersion])
  useEffect(() => { busyCallback.current?.(pending) }, [pending])
  useEffect(() => () => { cancelRequest(); busyCallback.current?.(false); sessionEnd.current?.() }, [])

  async function runSearch(term: string) {
    if (term.length < 3 || disabled) return
    cancelRequest()
    const controller = new AbortController()
    request.current = controller
    setSearching(true); setResults(null); setError(false)
    try {
      const matches = await search(term, controller.signal)
      if (!controller.signal.aborted) setResults(matches)
    } catch {
      if (!controller.signal.aborted) setError(true)
    } finally {
      if (request.current === controller) { request.current = null; setSearching(false) }
    }
  }

  function updateQuery(next: string, schedule = true) {
    cancelRequest()
    const changed = next !== selectedAddress && (Boolean(next.trim()) || hasLocation)
    setQuery(next); setEditing(changed); setOpen(changed); setResults(null); setSearching(false); setSelecting(null); setError(false)
    if (!next.trim()) sessionEnd.current?.()
    const term = next.trim()
    if (changed && schedule && term.length >= 3) timer.current = setTimeout(() => void runSearch(term), 500)
  }

  function restoreSelection() {
    cancelRequest()
    sessionEnd.current?.()
    setQuery(selectedAddress); setEditing(false); setOpen(false); setResults(null); setSearching(false); setSelecting(null); setError(false)
    input.current?.focus()
  }

  async function choose(result: Result, index: number) {
    if (disabled || selecting) return
    cancelRequest()
    const controller = new AbortController()
    request.current = controller
    setSearching(false); setSelecting(resultLabel(result, index).key); setError(false)
    try {
      const chosen = await resolve(result, controller.signal)
      if (controller.signal.aborted) return
      setQuery(chosen.address); setEditing(false); setOpen(false); setResults(null)
      sessionEnd.current?.()
      onSelect(chosen.selection)
      input.current?.focus()
    } catch {
      if (!controller.signal.aborted) { setError(true); setResults(null) }
    } finally {
      if (request.current === controller) { request.current = null; setSelecting(null) }
    }
  }

  function resultKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); restoreSelection(); return }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    event.preventDefault()
    const buttons = list.current?.querySelectorAll<HTMLButtonElement>('button')
    if (!buttons?.length) return
    if (event.key === 'ArrowUp' && index === 0) input.current?.focus()
    else buttons[(index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length]?.focus()
  }

  const showPanel = (open || Boolean(selecting)) && (searching || Boolean(results?.length))
  return <div ref={container} className="space-y-2" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false) }}>
    <Label htmlFor={id}>Search for an address or place</Label>
    <div className="relative">
      <Input ref={input} id={id} type="search" maxLength={200} autoComplete="off" placeholder="Street address, city…" value={query} disabled={disabled} aria-controls={showPanel && results?.length ? resultsId : undefined} onFocus={() => { if (editing) setOpen(true) }} onChange={(event) => updateQuery(event.target.value, !composing.current)} onCompositionStart={() => { composing.current = true }} onCompositionEnd={(event) => { composing.current = false; updateQuery(event.currentTarget.value) }} onKeyDown={(event) => {
        if (event.nativeEvent.isComposing) return
        if (event.key === 'Escape' && editing) { event.preventDefault(); event.stopPropagation(); restoreSelection() }
        else if (event.key === 'ArrowDown' && open && results?.length) { event.preventDefault(); list.current?.querySelector<HTMLButtonElement>('button')?.focus() }
        else if (event.key === 'Enter') { event.preventDefault(); if (open && results?.length) void choose(results[0], 0); else if (!searching && editing) { setOpen(true); void runSearch(query.trim()) } }
      }} />
      {showPanel ? <Card padding="none" className={resultsPlacement === 'inline' ? 'mt-2' : 'absolute inset-x-0 top-full z-30 mt-2 shadow-lg'}>
        {searching ? <div role="status" className="flex items-center gap-3 p-4"><LoadingIndicator decorative size="sm" /><Text size="small" tone="muted">Searching addresses…</Text></div> : null}
        {results?.length ? <>
          <Text role="status" className="sr-only">{results.length} {results.length === 1 ? 'address' : 'addresses'} found.</Text>
          <ul ref={list} id={resultsId} aria-label="Address search results" className="grid max-h-64 gap-1 overflow-y-auto p-2">
            {results.map((result, index) => { const label = resultLabel(result, index); return <li key={label.key}><RecordButton type="button" className="w-full" title={label.title} description={label.description} disabled={disabled || Boolean(selecting && selecting !== label.key)} loading={selecting === label.key} onKeyDown={(event) => resultKeyDown(event, index)} onClick={() => void choose(result, index)} /></li> })}
          </ul>
          {resultAttribution}
        </> : null}
      </Card> : null}
    </div>
    {error ? <EmptyState role="alert" tone="danger" icon={<CircleAlert />} title="Address search unavailable" description={errorDescription} action={<Button type="button" variant="outline" size="sm" onClick={() => { setOpen(true); void runSearch(query.trim()) }}>Try again</Button>} /> : null}
    {results && !results.length ? <EmptyState role="status" icon={<Search />} title="No matching addresses" description="Try another address or include the city." /> : null}
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1"><Text size="caption" tone="muted">{hasLocation ? 'Your current pin stays until you choose a result.' : query.trim().length < 3 ? 'Enter at least 3 characters to search.' : 'Choose a result to set the location.'}</Text>{hasLocation ? <Button type="button" variant="link" size="sm" className={editing ? undefined : 'invisible'} disabled={!editing} aria-hidden={!editing || undefined} onClick={restoreSelection}>Keep current location</Button> : null}</div>
    {attribution}
  </div>
}
