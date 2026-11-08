import { House } from 'lucide-react'
import { Link } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { RecordListItem } from '@/components/ui/record-list'
import { RecordAvatar } from '@/components/ui/record-avatar'
import { Heading, Text } from '@/components/ui/typography'
import type { InboxCat } from '@/features/inbox/types'

export function CatRecordCard({ cat, colonyName, urgentCount, taskCount, headingLevel = 2 }: {
  cat: InboxCat
  colonyName?: string
  urgentCount: number
  taskCount: number
  headingLevel?: 2 | 3
}) {
  return <Card size="sm" interactive render={<Link to={`/app/cats/${encodeURIComponent(cat.id)}`} />} aria-label={cat.name}>
    <CardContent className="flex items-start gap-4">
      <RecordAvatar name={cat.name} kind="cat" src={cat.photoUrl} size="portrait" />
      <div className="min-w-0 space-y-2">
        <div className="space-y-1">
          <Heading level={headingLevel} size="card" className="wrap-anywhere">{cat.name}</Heading>
          {colonyName ? <div className="flex items-start gap-1.5"><House aria-hidden="true" className="mt-1 size-4 shrink-0" /><Text size="small" tone="muted" className="wrap-anywhere">{colonyName}</Text></div> : null}
        </div>
        {cat.description ? <Text size="caption" tone="muted" className="line-clamp-2 wrap-anywhere">{cat.description}</Text> : null}
        {urgentCount > 0 ? <Badge variant="destructive">{urgentCount} urgent {urgentCount === 1 ? 'report' : 'reports'}</Badge> : null}
        {taskCount > 0 ? <Text size="caption" tone="muted">{taskCount} open {taskCount === 1 ? 'task' : 'tasks'}</Text> : null}
      </div>
    </CardContent>
  </Card>
}

export function CatRecordListItem({ cat, colonyName, urgentCount, taskCount }: {
  cat: InboxCat
  colonyName?: string
  urgentCount: number
  taskCount: number
}) {
  return <RecordListItem render={<Link to={`/app/cats/${encodeURIComponent(cat.id)}`} />} aria-label={cat.name}
    title={cat.name} leading={<RecordAvatar name={cat.name} kind="cat" src={cat.photoUrl} size="sm" />}
    meta={[colonyName, taskCount ? `${taskCount} open ${taskCount === 1 ? 'task' : 'tasks'}` : undefined].filter(Boolean).join(' · ')}
    badge={urgentCount ? <Badge variant="destructive">{urgentCount} urgent {urgentCount === 1 ? 'report' : 'reports'}</Badge> : undefined} />
}
