import { useEffect, useState } from 'react'
import { History } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { LoadingIndicator } from '@/components/ui/loading-indicator'
import { TextLink } from '@/components/ui/text-link'
import { Heading, Text } from '@/components/ui/typography'
import { useInbox } from '@/features/inbox/inbox-context'
import type { RecordActivity, RecordType } from '../../../../shared/types/record-activity'
import { formatReportTime } from '../directory-data'

export function RecordTimeline({ type, id }: { type: RecordType; id: string }) {
  const { getRecordActivity, activityRevision } = useInbox()
  const [activity, setActivity] = useState<RecordActivity[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setFailed(false)
    void getRecordActivity(type, id, controller.signal).then((items) => { if (!controller.signal.aborted) setActivity(items) }).catch(() => { if (!controller.signal.aborted) setFailed(true) })
    return () => controller.abort()
  }, [type, id, getRecordActivity, activityRevision, attempt])

  return <section aria-labelledby={`${type}-timeline`} className="space-y-3">
    <Heading id={`${type}-timeline`} level={2} size="card">Timeline</Heading>
    {failed ? <EmptyState icon={<History />} tone="danger" title="Timeline unavailable" description="Try loading the history again." action={<Button size="sm" variant="outline" onClick={() => setAttempt((value) => value + 1)}>Try again</Button>} />
      : activity === null ? <Card size="sm"><CardContent><LoadingIndicator size="sm" label="Loading timeline" /></CardContent></Card>
        : !activity.length ? <EmptyState icon={<History />} title="No activity yet" />
          : <Card size="sm"><CardContent><ol className="divide-y divide-border">
            {activity.map((event) => <li key={event.id} className="space-y-2 py-4 first:pt-0 last:pb-0">
              <div><Text size="small" weight="medium" className="wrap-anywhere">{event.summary}</Text>
                <Text size="caption" tone="muted" className="wrap-anywhere"><time dateTime={event.occurredAt}>{formatReportTime(event.occurredAt)}</time> · {event.actorName}</Text></div>
              {event.changes.length ? <dl className="space-y-2">{event.changes.map((change, index) => <div key={`${change.field}-${index}`}>
                <Text render={<dt />} size="caption" tone="muted">{change.field}</Text>
                <Text render={<dd />} size="small" className="whitespace-pre-wrap wrap-anywhere">{change.before || 'None'} → {change.after || 'None'}</Text>
              </div>)}</dl> : null}
              {event.reportId ? <TextLink render={<Link to={`/app/reports?report=${encodeURIComponent(event.reportId)}`} />}>View report</TextLink> : null}
            </li>)}
          </ol></CardContent></Card>}
  </section>
}
