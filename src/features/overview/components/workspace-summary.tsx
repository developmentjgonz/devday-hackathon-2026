import { ChevronDown, ChevronRight, ChevronUp } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Heading, Text } from '@/components/ui/typography'
import { formatTaskDue } from '@/features/tasks/task-data'
import type { overviewProgress } from '../progress-data'

export function WorkspaceSummary({ summary, tasksOpen, onToggleTasks }: { summary: ReturnType<typeof overviewProgress>; tasksOpen: boolean; onToggleTasks: () => void }) {
  const { mine, team, reports } = summary
  const nextDue = mine.nextDue ? `Next due ${formatTaskDue(mine.nextDue)}` : (mine.total - mine.completed) ? 'No upcoming due dates' : 'No open tasks'
  return <section aria-label="Workspace summary">
    <div className="grid gap-3 xl:grid-cols-3">
      <Card tone="note" size="sm" interactive className="relative" onClick={onToggleTasks} render={<section aria-labelledby="my-tasks-summary" />}><CardContent className="flex h-full flex-col gap-3">
        <Heading id="my-tasks-summary" level={2} size="compact">My tasks</Heading><Button className="absolute right-2 top-2" variant="ghost" size="icon-sm" aria-label={tasksOpen ? 'Hide my tasks' : 'Show my tasks'} aria-expanded={tasksOpen} aria-controls="overview-tasks">{tasksOpen ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}</Button>
        <div className="space-y-1"><Text size="metric" weight="semibold">{(mine.total - mine.completed)} open</Text><Text size="caption" tone="muted">{mine.completed} completed</Text></div>
        <div className="mt-auto flex min-h-(--control-height) flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <div>{mine.overdue ? <Text size="caption" tone="danger">{mine.overdue} overdue</Text> : null}{mine.dueToday ? <Text size="caption" tone="muted">{mine.dueToday} due today</Text> : !mine.overdue ? <Text size="caption" tone="muted">{nextDue}</Text> : null}</div>
        </div>
      </CardContent></Card>
      <Card size="sm" render={<section aria-labelledby="team-tasks-summary" />}><CardContent className="flex h-full flex-col gap-3">
        <Heading id="team-tasks-summary" level={2} size="compact">Team tasks</Heading>
        <div className="space-y-1"><Text size="metric" weight="semibold">{(team.total - team.completed)} open</Text><Text size="caption" tone="muted">{team.completed} completed</Text></div>
        <div className="mt-auto flex min-h-(--control-height) items-center"><div className="space-y-1"><Text size="caption" tone="muted">{summary.assignees} {summary.assignees === 1 ? 'member' : 'members'} with open tasks</Text>{team.overdue ? <Text size="caption" tone="danger">{team.overdue} overdue across the team</Text> : null}</div></div>
      </CardContent></Card>
      <section aria-labelledby="report-reviews-summary">
        <Card size="sm" interactive className="h-full" render={<Link to="/app/reports" aria-labelledby="report-reviews-summary" />}><CardContent className="flex h-full flex-col gap-3">
          <div className="flex items-center justify-between gap-3"><Heading id="report-reviews-summary" level={2} size="compact">Report reviews</Heading><ChevronRight className="size-4" aria-hidden="true" /></div>
          <div className="space-y-1"><Text size="metric" weight="semibold">{reports.pending} {reports.pending === 1 ? 'needs' : 'need'} review</Text><Text size="caption" tone="muted">{reports.waiting} waiting for details</Text></div>
        </CardContent></Card>
      </section>
    </div>
  </section>
}
