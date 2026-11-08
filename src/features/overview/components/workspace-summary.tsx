import { Link } from 'react-router'
import { Card, CardContent } from '@/components/ui/card'
import { TextLink } from '@/components/ui/text-link'
import { Heading, Text } from '@/components/ui/typography'
import { formatTaskDue } from '@/features/tasks/task-data'
import type { overviewSummary } from '../overview-data'

export function WorkspaceSummary({ summary }: { summary: ReturnType<typeof overviewSummary> }) {
  const { mine, team, reports } = summary
  const nextDue = mine.nextDue ? `Next due ${formatTaskDue(mine.nextDue)}` : mine.open ? 'No upcoming due dates' : 'No open tasks'
  return <section aria-label="Workspace summary">
    <div className="grid gap-3 xl:grid-cols-3">
      <Card tone="note" size="sm" render={<section aria-labelledby="my-tasks-summary" />}><CardContent className="flex h-full flex-col gap-4">
        <Heading id="my-tasks-summary" level={2} size="compact">My tasks</Heading>
        <div className="space-y-1"><Text size="metric" weight="semibold">{mine.open} open</Text><Text size="caption" tone="muted">{mine.completed} completed in the last 30 days</Text>{mine.undatedCompleted ? <Text size="caption" tone="muted">Completion date unavailable for {mine.undatedCompleted} {mine.undatedCompleted === 1 ? 'task' : 'tasks'}</Text> : null}</div>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <div>{mine.overdue ? <Text size="caption" tone="danger">{mine.overdue} overdue</Text> : null}{mine.dueToday ? <Text size="caption" tone="muted">{mine.dueToday} due today</Text> : !mine.overdue ? <Text size="caption" tone="muted">{nextDue}</Text> : null}</div>
          <TextLink size="sm" render={<Link to="/app/tasks" />}>View my tasks</TextLink>
        </div>
      </CardContent></Card>
      <Card size="sm" render={<section aria-labelledby="team-tasks-summary" />}><CardContent className="flex h-full flex-col gap-4">
        <Heading id="team-tasks-summary" level={2} size="compact">Team tasks</Heading>
        <div className="space-y-1"><Text size="metric" weight="semibold">{team.open} open</Text><Text size="caption" tone="muted">{team.completed} completed in the last 30 days</Text>{team.undatedCompleted ? <Text size="caption" tone="muted">Completion date unavailable for {team.undatedCompleted} {team.undatedCompleted === 1 ? 'task' : 'tasks'}</Text> : null}</div>
        <div className="mt-auto space-y-1"><Text size="caption" tone="muted">{summary.assignees} {summary.assignees === 1 ? 'member' : 'members'} with open tasks</Text>{team.overdue ? <Text size="caption" tone="danger">{team.overdue} overdue across the team</Text> : null}</div>
      </CardContent></Card>
      <Card size="sm" render={<section aria-labelledby="report-reviews-summary" />}><CardContent className="flex h-full flex-col gap-4">
        <Heading id="report-reviews-summary" level={2} size="compact">Report reviews</Heading>
        <div className="space-y-1"><Text size="metric" weight="semibold">{reports.pending} need review</Text><Text size="caption" tone="muted">{reports.waiting} waiting for details</Text></div>
        <div className="mt-auto"><TextLink size="sm" render={<Link to="/app/reports" />}>View reports</TextLink></div>
      </CardContent></Card>
    </div>
  </section>
}
