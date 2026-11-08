import { PawPrint } from 'lucide-react'
import { BarChart, type BarChartItem } from '@/components/ui/bar-chart'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Heading, Text } from '@/components/ui/typography'
import type { Task } from '@/features/inbox/types'

export function TeamWins({ tasks }: { tasks: Task[] }) {
  const byAssignee = new Map<string, BarChartItem>()
  for (const task of tasks) {
    const item = byAssignee.get(task.ownerId)
    if (item) item.value += 1
    else byAssignee.set(task.ownerId, { id: task.ownerId, label: task.owner, value: 1 })
  }
  const items = [...byAssignee.values()].sort((a, b) => a.label.localeCompare(b.label) || a.id.localeCompare(b.id))
  const total = items.reduce((sum, item) => sum + item.value, 0)

  return <section aria-labelledby="team-wins">
    <Card size="sm"><CardContent className="grid gap-6 md:grid-cols-2">
      <div className="space-y-2">
        <Heading id="team-wins" level={2} size="card">Together for the cats</Heading>
        {total ? <Text size="small" className="max-w-prose text-pretty">Your team completed {total} {total === 1 ? 'task' : 'tasks'} in the last 30 days. Thank you for caring for the cats.</Text> : <Text size="small">Every task helps your team care for the cats.</Text>}
      </div>
      {total ? <div className="w-full max-w-md space-y-4">
        <Text size="label" tone="muted">Tasks completed in the last 30 days by assignee</Text>
        <BarChart items={items} label="Tasks completed in the last 30 days by assignee" unit={{ singular: 'task', plural: 'tasks' }} />
      </div> : <EmptyState icon={<PawPrint />} title="No recent completions recorded" description="Tasks completed in the last 30 days will appear here." />}
    </CardContent></Card>
  </section>
}
