import { Card, CardContent } from '@/components/ui/card'
import { Text } from '@/components/ui/typography'
import type { colonySummary } from '../directory-data'

type Summary = ReturnType<typeof colonySummary>

export function ColonyOverview({ summaries, openTaskCount, urgentReportCount }: { summaries: Summary[]; openTaskCount: number; urgentReportCount: number }) {
  const totals = summaries.reduce((total, summary) => ({
    cats: total.cats + summary.catCount,
  }), { cats: 0 })
  const cards = [
    { label: 'Colonies', value: summaries.length },
    { label: 'Known cats', value: totals.cats },
    { label: 'Urgent reports', value: urgentReportCount },
    { label: 'Open tasks', value: openTaskCount },
  ]
  return <ul aria-label="Colony summary" className="grid list-none grid-cols-2 gap-3 p-0 lg:grid-cols-4">
    {cards.map(({ label, value }) => <Card key={label} size="sm" render={<li />}>
      <CardContent className="space-y-1"><Text size="caption" tone="muted">{label}</Text><Text size="metric" weight="semibold">{value}</Text></CardContent>
    </Card>)}
  </ul>
}
