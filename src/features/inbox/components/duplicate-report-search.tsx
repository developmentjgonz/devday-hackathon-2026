import { useEffect, useId, useRef, useState } from 'react'
import { CircleAlert, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LoadingIndicator } from '@/components/ui/loading-indicator'
import { RecordButton } from '@/components/ui/record-button'
import { Heading, Text } from '@/components/ui/typography'
import { useInbox } from '../inbox-context'
import type { DuplicateReport } from '../../../../shared/types/workspace'

const dateFormat = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' })

export function DuplicateReportSearch({ reportId, source, selected, onSelect, disabled }: { reportId: string; source: DuplicateReport; selected: DuplicateReport | null; onSelect: (report: DuplicateReport) => void; disabled: boolean }) {
  const { searchDuplicateReports } = useInbox()
  const id = useId()
  const moreRequest = useRef<AbortController | null>(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<DuplicateReport[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(false)
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setResults([]); setHasMore(false); setError(false); setLoading(true); setLoadingMore(false)
    const timer = setTimeout(() => {
      void searchDuplicateReports(reportId, query.trim(), 0, controller.signal).then((page) => {
        if (!controller.signal.aborted) { setResults(page.reports); setHasMore(page.hasMore) }
      }).catch(() => { if (!controller.signal.aborted) setError(true) }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    }, query.trim() ? 300 : 0)
    return () => { clearTimeout(timer); controller.abort(); moreRequest.current?.abort(); moreRequest.current = null }
  }, [reportId, query, searchDuplicateReports, retry])

  async function more() {
    if (loadingMore) return
    const controller = new AbortController()
    moreRequest.current = controller
    setLoadingMore(true); setError(false)
    try {
      const page = await searchDuplicateReports(reportId, query.trim(), results.length, controller.signal)
      if (!controller.signal.aborted) { setResults((items) => [...items, ...page.reports]); setHasMore(page.hasMore) }
    } catch { if (!controller.signal.aborted) setError(true) }
    finally { if (!controller.signal.aborted) setLoadingMore(false); if (moreRequest.current === controller) moreRequest.current = null }
  }

  return <div className="space-y-4">
    <div className="grid gap-2"><Label htmlFor={id}>Search existing reports</Label><Input id={id} type="search" maxLength={200} autoComplete="off" placeholder="Search title or report text…" value={query} disabled={disabled} onChange={(event) => { moreRequest.current?.abort(); setQuery(event.target.value) }} onKeyDown={(event) => { if (event.key === 'Enter' && !event.nativeEvent.isComposing) event.preventDefault() }} /><Text size="caption" tone="muted">Search reports in the same colony. Enter at least 2 letters per word.</Text></div>
    {selected ? <div className="grid gap-3 sm:grid-cols-2">{[{ report: source, heading: 'Current report', id: 'duplicate-current-title' }, { report: selected, heading: 'Selected report', id: 'duplicate-selected-title' }].map(({ report, heading, id: headingId }) => <section key={headingId} aria-labelledby={headingId} className="min-w-0 space-y-2"><Heading id={headingId} level={3} size="compact">{heading}</Heading><Card size="sm"><CardContent className="space-y-3"><div className="space-y-1"><Text size="label" className="wrap-anywhere">{report.title}</Text><Text size="caption" tone="muted">{report.reporter} · {dateFormat.format(new Date(report.submittedAt))}{report.cat ? ` · ${report.cat}` : ''}</Text></div><Text size="small" className="whitespace-pre-wrap wrap-anywhere">{report.message}</Text></CardContent></Card></section>)}</div> : null}
    {loading ? <div role="status" className="flex items-center gap-3"><LoadingIndicator decorative size="sm" /><Text size="small" tone="muted">Searching reports…</Text></div> : null}
    {error ? <EmptyState role="alert" tone="danger" icon={<CircleAlert />} title="Report search unavailable" description="Try again." action={<Button type="button" variant="outline" size="sm" onClick={() => setRetry((value) => value + 1)}>Try again</Button>} /> : null}
    {!loading && !error && !results.length ? <EmptyState role="status" icon={<Search />} title="No matching reports" description="Try other words from the report." /> : null}
    {results.length ? <section aria-labelledby="duplicate-results-title" className="space-y-3"><Heading id="duplicate-results-title" level={3} size="compact">{query.trim() ? 'Matching reports' : 'Recent reports'}</Heading><Text role="status" size="caption" tone="muted">{results.length} {results.length === 1 ? 'report shown' : 'reports shown'}</Text><ul className="space-y-2">{results.map((item) => <li key={item.id}><RecordButton type="button" className="w-full" disabled={disabled} selected={selected?.id === item.id} title={item.title} description={`${item.reporter} · ${dateFormat.format(new Date(item.submittedAt))}${item.cat ? ` · ${item.cat}` : ''}`} onClick={() => onSelect(item)} /></li>)}</ul>{hasMore && !error ? <Button type="button" variant="outline" size="sm" loading={loadingMore} disabled={disabled} onClick={() => void more()}>Show more reports</Button> : null}</section> : null}
  </div>
}
