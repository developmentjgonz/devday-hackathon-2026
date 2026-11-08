import { useEffect, useRef, useState } from 'react'
import { Link, useRouteLoaderData } from 'react-router'
import { Bot, ClipboardCheck, History, ShieldCheck } from 'lucide-react'
import type { WorkspaceData } from '../../../../shared/types/directory'
import type { AutomationSnapshot } from '../../../../shared/types/automation'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Disclosure } from '@/components/ui/disclosure'
import { EmptyState } from '@/components/ui/empty-state'
import { LoadingIndicator } from '@/components/ui/loading-indicator'
import { TextLink } from '@/components/ui/text-link'
import { Heading, Text } from '@/components/ui/typography'
import { useInbox } from '@/features/inbox/inbox-context'
import { databaseAutomation, type AutomationStore } from '../automation-api'

const dateLabel = (value: string) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))

export function AutomationPage({ store = databaseAutomation }: { store?: AutomationStore }) {
  const { user } = useRouteLoaderData('workspace') as WorkspaceData
  return <><title>Automation · Mews</title>{user.role === 'administrator' ? <AutomationScreen store={store} /> : <Card><EmptyState icon={<ShieldCheck />} title="Administrator access required" description="Ask an administrator to review automation activity." /></Card>}</>
}

function AutomationScreen({ store }: { store: AutomationStore }) {
  const { refreshWorkspace } = useInbox()
  const [snapshot, setSnapshot] = useState<AutomationSnapshot | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const busyRef = useRef(false)
  const revision = useRef(0)
  const [reload, setReload] = useState(0)
  const [offset, setOffset] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    let fetching = false
    async function refresh() {
      if (busyRef.current || fetching) return
      fetching = true
      const current = revision.current
      try {
        const result = await store.read(controller.signal, offset)
        if (!controller.signal.aborted && revision.current === current) { setSnapshot(result); setError('') }
      } catch (cause) {
        if (!controller.signal.aborted && revision.current === current) setError(cause instanceof Error ? cause.message : 'Automation is unavailable. Try again.')
      } finally { fetching = false }
    }
    void refresh()
    const interval = window.setInterval(() => { if (document.visibilityState === 'visible') void refresh() }, 15_000)
    return () => { controller.abort(); window.clearInterval(interval) }
  }, [store, reload, offset])

  async function act(key: string, action: () => Promise<AutomationSnapshot>) {
    if (busyRef.current) return
    busyRef.current = true
    revision.current += 1
    setBusy(key)
    setError('')
    try {
      setSnapshot(await action())
      setOffset(0)
      await refreshWorkspace({ invalidate: true })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The action could not be completed. Try again.')
      setReload((value) => value + 1)
    } finally { busyRef.current = false; setBusy(null) }
  }

  if (!snapshot) return error ? <Card><EmptyState icon={<Bot />} title="Automation unavailable" description={error} tone="danger" action={<Button onClick={() => setReload((value) => value + 1)}>Try again</Button>} /></Card> : <div className="flex min-h-48 items-center justify-center"><LoadingIndicator label="Loading automation" /></div>
  if (!snapshot.settings.enabled) return <Card><EmptyState icon={<Bot />} title="Autopilot is paused" description="Enable autopilot in AI setup to manage reports, tasks, cats, and colonies. Your activity history is kept." action={<Button render={<Link to="/app/configuration/ai" />}>Open AI setup</Button>} /></Card>

  return <div className="space-y-8">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="space-y-2"><Heading level={2} size="title">Automation</Heading><Text tone="muted">See what Mews has done and review proposed changes.</Text></div>
      <div className="flex flex-wrap gap-2"><Button variant="outline" render={<Link to="/app/configuration/ai" />}>AI setup</Button><Button loading={busy === 'run'} disabled={Boolean(busy) || snapshot.running} onClick={() => void act('run', store.run)}>Run now</Button></div>
    </div>
    <Card><CardContent className="flex flex-wrap items-start justify-between gap-4">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2"><Heading level={3} size="compact">Autopilot is on</Heading><Badge variant={snapshot.running ? 'warning' : 'success'}>{snapshot.running ? 'Working' : 'Enabled'}</Badge></div>
        <Text size="small" tone="muted">Checks for work every five minutes. {snapshot.settings.requireHumanReview ? 'Changes wait for human approval.' : 'Supported changes are applied automatically.'}</Text>
        {snapshot.lastRun ? <Text size="caption" tone="muted">Last run: {dateLabel(snapshot.lastRun.startedAt)}. {snapshot.lastRun.summary || 'Checking for work.'}</Text> : <Text size="caption" tone="muted">The first check will start within five minutes. You can also run it now.</Text>}
      </div>
      {snapshot.running ? <LoadingIndicator size="sm" label="Autopilot is working" /> : null}
    </CardContent></Card>
    {error ? <Alert>{error}</Alert> : null}
    {snapshot.settings.requireHumanReview ? <section aria-labelledby="automation-review-heading" className="space-y-4">
      <Heading id="automation-review-heading" level={3} size="card">Requires human review{snapshot.proposals.length ? ` (${snapshot.proposals.length})` : ''}</Heading>
      {snapshot.proposals.length ? <div className="space-y-4">{snapshot.proposals.map((proposal) => <Card key={proposal.id}><CardContent className="space-y-4">
        <div className="space-y-1"><Heading level={4} size="compact">{proposal.title}</Heading><Text size="small" tone="muted">{proposal.detail}</Text><Text size="caption" tone="muted">Proposed {dateLabel(proposal.createdAt)}</Text></div>
        <ul className="grid list-disc gap-2 pl-5">{proposal.changes.map((change, index) => <li key={index}><Text size="small">{change}</Text></li>)}</ul>
        {proposal.links?.length ? <div className="flex flex-wrap gap-4">{proposal.links.map((link) => <TextLink key={link.to} size="sm" render={<Link to={link.to} />}>{link.label}</TextLink>)}</div> : null}
        <div className="flex flex-wrap gap-2"><Button size="sm" loading={busy === `approve:${proposal.id}`} disabled={Boolean(busy) || snapshot.running} onClick={() => void act(`approve:${proposal.id}`, () => store.review(proposal.id, true))}>Approve changes</Button><Button size="sm" variant="outline" loading={busy === `reject:${proposal.id}`} disabled={Boolean(busy) || snapshot.running} onClick={() => void act(`reject:${proposal.id}`, () => store.review(proposal.id, false))}>Reject</Button></div>
      </CardContent></Card>)}</div> : <Card><EmptyState icon={<ClipboardCheck />} title="No changes need review" description="New proposals will appear here before the agent applies them." /></Card>}
    </section> : null}
    <section aria-labelledby="automation-activity-heading" className="space-y-4">
      <Heading id="automation-activity-heading" level={3} size="card">Activity</Heading>
      {snapshot.events.length ? <Card><CardContent><ol className="space-y-5">{snapshot.events.map((event) => <li key={event.id} className="space-y-2">
        <div className="flex flex-wrap items-center gap-2"><Badge variant={event.kind === 'error' ? 'destructive' : event.kind === 'review' ? 'warning' : 'secondary'}>{event.kind === 'error' ? 'Needs attention' : event.kind === 'review' ? 'Human review' : event.kind === 'merge' ? 'Colony merge' : event.kind}</Badge><Text render={<time dateTime={event.occurredAt} />} size="caption" tone="muted">{dateLabel(event.occurredAt)}</Text></div>
        <Heading level={4} size="compact">{event.title}</Heading><Text size="small" tone="muted">{event.detail}</Text>
        {event.targetPath ? <TextLink size="sm" render={<Link to={event.targetPath} />}>View details</TextLink> : null}
      </li>)}</ol></CardContent></Card> : <Card><EmptyState icon={<History />} title="No activity yet" description="The agent’s changes, review requests, and failed actions will appear here." /></Card>}
      {offset > 0 || snapshot.hasMore ? <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={offset === 0 || Boolean(busy)} onClick={() => setOffset((value) => Math.max(0, value - 50))}>Newer activity</Button><Button variant="outline" disabled={!snapshot.hasMore || Boolean(busy)} onClick={() => setOffset((value) => value + 50)}>Older activity</Button></div> : null}
      <Disclosure title="What autopilot manages"><Text size="small" tone="muted">Autopilot uses the features selected in AI setup. It records report reviews, duplicate links, task assignments, cat updates, colony updates, and colony merges. It keeps reports open when evidence is missing. People complete physical care tasks.</Text></Disclosure>
    </section>
  </div>
}
