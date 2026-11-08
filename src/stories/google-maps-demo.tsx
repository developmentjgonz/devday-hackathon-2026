/// <reference types="google.maps" />
import { useState } from 'react'
import { MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { GooglePlaceSearch } from '@/components/ui/google-place-search'
import GoogleMap from '@/components/ui/map/google-map'
import { RecordAvatar } from '@/components/ui/record-avatar'
import { RecordButton } from '@/components/ui/record-button'
import { Heading, Text } from '@/components/ui/typography'
import { NewRecordButton } from '@/features/colonies/components/new-record-button'
import { InboxProvider } from '@/features/inbox/inbox-context'
import { localInboxData } from '@/features/inbox/data/local-inbox'
import type { SessionUser } from '../../shared/types/auth'
import { storyDirectoryStore, storyWorkspace } from './fixtures/directory-store'
import { teamMapData } from './fixtures/team-map-data'
import { storyWorkspaceStore } from './fixtures/workspace-store'

type Point = google.maps.LatLngLiteral

export function GoogleSearchFormDemo() {
  const [selected, setSelected] = useState(false)
  const [saved, setSaved] = useState(false)
  return <form className="max-w-lg space-y-3" onSubmit={(event) => { event.preventDefault(); setSaved(true) }}>
    <GooglePlaceSearch cancelVersion={0} onSelect={() => setSelected(true)} />
    {selected ? <Text role="status" size="small">Place selected</Text> : null}
    {saved ? <Text role="status" size="small">Saved</Text> : null}
    <Button type="submit">Save</Button>
  </form>
}

export function GoogleCatDraftDemo() {
  const [created, setCreated] = useState(false)
  const user: SessionUser = { id: 'storybook-member', name: 'Maya Rivera', email: 'maya@mews.test', phone: null, role: 'member', status: 'active' }
  const [workspace] = useState(() => storyWorkspace(user, localInboxData).workspace)
  const [workspaceStore] = useState(() => storyWorkspaceStore(user, workspace))
  return <InboxProvider data={localInboxData} workspace={workspace} directoryStore={storyDirectoryStore} workspaceStore={workspaceStore} googleMapsEnabled>
    <NewRecordButton kind="cat" onCreated={() => setCreated(true)} />
    {created ? <Text role="status" size="small">Cat added</Text> : null}
  </InboxProvider>
}
const demoCats = [
  { name: 'Poppy', colonyId: 'demo-01' }, { name: 'Socks', colonyId: 'demo-01' },
  { name: 'Mango', colonyId: 'demo-02' }, { name: 'Pepper', colonyId: 'demo-03' },
  { name: 'Luna', colonyId: 'demo-04' },
]
const catMapColonies = teamMapData.colonies.map((colony) => ({ ...colony, catCount: demoCats.filter((cat) => cat.colonyId === colony.id).length }))

export function GoogleColonyMapDemo({ scope = 'colonies' }: { scope?: 'colonies' | 'cats' }) {
  const [selected, setSelected] = useState<string | undefined>()
  const colonies = scope === 'cats' ? catMapColonies : teamMapData.colonies
  return <Card render={<section />} padding="none" className="w-full max-w-4xl">
    <CardHeader><div><Heading level={2} size="card">{scope === 'cats' ? 'Cats by colony' : 'Colony map'}</Heading><Text size="caption" tone="muted">{scope === 'cats' ? 'Markers show colony locations, not individual cat sightings.' : 'Colony locations'}</Text></div></CardHeader>
    <div className="h-96"><GoogleMap colonies={colonies} selectedColony={selected} onSelectColony={setSelected} /></div>
    <CardFooter className="block space-y-3">
      <div aria-label="Map status legend" className="flex flex-wrap gap-x-4 gap-y-2">
        <Text render={<span />} size="caption" tone="muted" className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="size-2 rounded-full bg-success-foreground" />Routine care</Text>
        <Text render={<span />} size="caption" tone="muted" className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="size-2 rounded-full bg-primary" />Needs a visit</Text>
        <Text render={<span />} size="caption" tone="muted" className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="size-2 rounded-full bg-destructive" />Urgent care</Text>
      </div>
      <Heading level={3} size="label">Browse colonies</Heading>
      <ul className="grid gap-2 sm:grid-cols-2">{colonies.map((colony) => <li key={colony.id}><RecordButton className="w-full" selected={selected === colony.id} onClick={() => setSelected(colony.id)} title={colony.name} description={`${colony.catCount} ${colony.catCount === 1 ? 'cat' : 'cats'}`} /></li>)}</ul>
      {scope === 'cats' && selected ? <div className="space-y-2"><Heading level={3} size="compact">Cats in this colony</Heading><ul className="flex flex-wrap gap-4">{demoCats.filter((cat) => cat.colonyId === selected).map((cat) => <li key={cat.name} className="flex items-center gap-2"><RecordAvatar kind="cat" name={cat.name} size="sm" /><Text size="small">{cat.name}</Text></li>)}</ul></div> : null}
    </CardFooter>
  </Card>
}

export function GoogleLocationPickerDemo() {
  const [point, setPoint] = useState<Point | null>(null)
  const [centerVersion, setCenterVersion] = useState(0)
  const [cancelVersion, setCancelVersion] = useState(0)
  return <Card render={<section />} className="w-full max-w-2xl">
    <CardHeader><div><Heading level={2} size="card">Choose a location</Heading><Text size="small" tone="muted">Search for a place, then click the map to adjust the pin.</Text></div></CardHeader>
    <CardContent className="space-y-3">
      <GooglePlaceSearch cancelVersion={cancelVersion} onSelect={(next) => { setPoint(next.point); setCenterVersion((current) => current + 1) }} />
      <div className="h-96 overflow-hidden rounded-lg"><GoogleMap selectedPoint={point} centerVersion={centerVersion} onPick={(next) => { setCancelVersion((current) => current + 1); setPoint(next) }} /></div>
      {point ? <Text role="status" size="caption" tone="muted" className="flex items-center gap-1"><MapPin aria-hidden="true" className="size-4" />Location selected</Text> : null}
    </CardContent>
  </Card>
}
