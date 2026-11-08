import { Link } from 'react-router'
import { Card, CardContent } from '@/components/ui/card'
import { ProgressRing } from '@/components/ui/progress-ring'
import { TextLink } from '@/components/ui/text-link'
import { Heading, Text } from '@/components/ui/typography'
import { formatTaskDue } from '@/features/tasks/task-data'
import type { overviewProgress } from '../progress-data'

export function CareProgress({ progress }: { progress: ReturnType<typeof overviewProgress> }) {
  const { mine, team, reports } = progress
  const nextDue = mine.nextDue ? `Next due ${formatTaskDue(mine.nextDue)}` : mine.completed === mine.total && mine.total ? 'All tasks complete' : mine.total ? 'No upcoming due dates' : 'No tasks assigned'
  return <section aria-labelledby="care-progress" className="space-y-3">
    <Heading id="care-progress" level={2} size="card">Care progress</Heading>
    <div className="grid gap-3 xl:grid-cols-3">
      <Card tone="note" size="sm"><CardContent className="flex h-full flex-col gap-4">
        <Heading level={3} size="compact">My tasks</Heading>
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1"><Text size="metric" weight="semibold">{mine.completed} completed</Text><Text size="caption" tone="muted">of {mine.total} assigned to me</Text></div>
          <ProgressRing label="My task completion" value={mine.completed} max={mine.total} tone={mine.total > 0 && mine.completed === mine.total ? 'success' : 'primary'} />
        </div>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <div>{mine.overdue ? <Text size="caption" tone="danger">{mine.overdue} overdue</Text> : null}{mine.dueToday ? <Text size="caption" tone="muted">{mine.dueToday} due today</Text> : !mine.overdue ? <Text size="caption" tone="muted">{nextDue}</Text> : null}</div>
          <TextLink size="sm" render={<Link to="/app/tasks" />}>View my tasks</TextLink>
        </div>
      </CardContent></Card>
      <Card size="sm"><CardContent className="flex h-full flex-col gap-4">
        <Heading level={3} size="compact">Team tasks</Heading>
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1"><Text size="metric" weight="semibold">{team.completed} completed</Text><Text size="caption" tone="muted">of {team.total} team tasks</Text></div>
          <ProgressRing label="Team task completion" value={team.completed} max={team.total} tone="success" />
        </div>
        <div className="mt-auto space-y-1"><Text size="caption" tone="muted">{progress.assignees} {progress.assignees === 1 ? 'member' : 'members'} with assigned tasks</Text>{team.overdue ? <Text size="caption" tone="danger">{team.overdue} overdue across the team</Text> : null}</div>
      </CardContent></Card>
      <Card size="sm"><CardContent className="flex h-full flex-col gap-4">
        <Heading level={3} size="compact">Report reviews</Heading>
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1"><Text size="metric" weight="semibold">{reports.processed} processed</Text><Text size="caption" tone="muted">of {reports.total} reports</Text></div>
          <ProgressRing label="Report review completion" value={reports.processed} max={reports.total} />
        </div>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-1"><Text size="caption" tone="muted">{reports.pending} pending · {reports.waiting} waiting for details</Text><TextLink size="sm" render={<Link to="/app/reports" />}>View reports</TextLink></div>
      </CardContent></Card>
    </div>
  </section>
}
