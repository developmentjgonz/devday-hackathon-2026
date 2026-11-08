import { useState } from 'react'
import { ChartNoAxesColumn, Download, RefreshCw, ShieldCheck } from 'lucide-react'
import { useLoaderData, useRevalidator, useRouteLoaderData } from 'react-router'
import type { WorkspaceData } from '../../../../shared/types/directory'
import type { StatisticsSnapshot } from '../../../../shared/types/statistics'
import { statisticsFor } from '../../../../shared/statistics'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Heading, Text } from '@/components/ui/typography'
import { Label } from '@/components/ui/label'
import { SelectField } from '@/components/ui/select-field'
import { Table, TableCell, TableHead, TableRow } from '@/components/ui/table'
import { downloadStatistics } from '../statistics-api'

export function StatisticsPage() {
  const { user } = useRouteLoaderData('workspace') as WorkspaceData
  const snapshot = useLoaderData() as StatisticsSnapshot | null
  return <>
    <title>Statistics &amp; exports · Mews</title>
    {user.role !== 'administrator'
      ? <Card><EmptyState icon={<ShieldCheck />} title="Administrator access required" description="Ask an administrator for statistics or data exports." /></Card>
      : snapshot ? <StatisticsScreen snapshot={snapshot} /> : <Card><EmptyState icon={<ChartNoAxesColumn />} title="Statistics are unavailable" description="Reload the page to try again." /></Card>}
  </>
}

function StatisticsScreen({ snapshot }: { snapshot: StatisticsSnapshot }) {
  const [selectedColony, setSelectedColony] = useState('')
  const [downloading, setDownloading] = useState<'summary' | 'cats' | null>(null)
  const [error, setError] = useState('')
  const { revalidate, state } = useRevalidator()
  const colonyId = snapshot.colonies.some((colony) => colony.id === selectedColony) ? selectedColony : ''
  const stats = statisticsFor(snapshot, colonyId)

  async function download(kind: 'summary' | 'cats') {
    setError('')
    setDownloading(kind)
    try { await downloadStatistics(kind, colonyId) }
    catch (error) { setError(error instanceof Error ? error.message : 'The download failed. Try again.') }
    finally { setDownloading(null) }
  }

  return <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="space-y-1">
        <Text>Current counts of registered cats and colonies.</Text>
        <Text size="small" tone="muted">As of <time dateTime={snapshot.asOf}>{new Date(snapshot.asOf).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</time></Text>
      </div>
      <Button variant="outline" loading={state === 'loading'} disabled={downloading !== null} onClick={() => void revalidate()}><RefreshCw aria-hidden="true" />Refresh counts</Button>
    </div>
    <div className="max-w-sm space-y-2">
      <Label htmlFor="statistics-colony">Colony</Label>
      <SelectField id="statistics-colony" value={colonyId} disabled={downloading !== null} onChange={(event) => { setSelectedColony(event.target.value); setError('') }}>
        <option value="">All colonies</option>
        {snapshot.colonies.map((colony) => <option key={colony.id} value={colony.id}>{colony.name}</option>)}
      </SelectField>
    </div>
    <section aria-label="Current counts" className="grid gap-3 sm:grid-cols-3">
      {[
        ['Registered cats', stats.registeredCats],
        ['Colonies', stats.colonyCount],
        ['Cats without a colony', stats.withoutColony],
      ].map(([label, count]) => <Card key={label} size="sm"><CardContent className="space-y-2"><Heading level={2} size="compact">{label}</Heading><Text size="metric" weight="semibold">{count}</Text></CardContent></Card>)}
    </section>
    <Card render={<section aria-labelledby="download-statistics-heading" />}><CardContent className="space-y-4">
      <div className="space-y-1"><Heading id="download-statistics-heading" level={2} size="card">Download data</Heading><Text size="small" tone="muted">Download counts or individual cat records for the selected colony, or all colonies. Each CSV uses current records and includes its own As of time in UTC.</Text></div>
      <div className="flex flex-wrap gap-3">
        <Button loading={downloading === 'summary'} disabled={downloading !== null || state === 'loading'} onClick={() => void download('summary')}><Download aria-hidden="true" />Download summary CSV</Button>
        <Button variant="outline" loading={downloading === 'cats'} disabled={downloading !== null || state === 'loading'} onClick={() => void download('cats')}><Download aria-hidden="true" />Download cat records CSV</Button>
      </div>
      {error ? <Text size="small" tone="danger" role="alert">{error}</Text> : null}
    </CardContent></Card>
    <section aria-labelledby="colony-counts-heading" className="space-y-3">
      <Heading id="colony-counts-heading" level={2} size="card">Cats by colony</Heading>
      <Card padding="none">
        {stats.colonies.length || stats.withoutColony ? <Table aria-label="Registered cats by colony">
          <thead><TableRow><TableHead>Colony</TableHead><TableHead>Registered cats</TableHead></TableRow></thead>
          <tbody>
            {stats.colonies.map((colony) => <TableRow key={colony.id}><TableCell><Text size="small" className="wrap-anywhere">{colony.name}</Text></TableCell><TableCell><Text size="small">{colony.catCount}</Text></TableCell></TableRow>)}
            {!colonyId && stats.withoutColony ? <TableRow><TableCell><Text size="small">Without a colony</Text></TableCell><TableCell><Text size="small">{stats.withoutColony}</Text></TableCell></TableRow> : null}
          </tbody>
        </Table> : <EmptyState icon={<ChartNoAxesColumn />} title="No colonies or cats yet" description="Counts will appear when your team adds records." />}
      </Card>
    </section>
  </div>
}
