import { Text } from './typography'

export type BarChartItem = { id: string; label: string; value: number }

/** A read-only comparison with a text equivalent for every bar. */
export function BarChart({ items, label, unit }: { items: BarChartItem[]; label: string; unit?: { singular: string; plural: string } }) {
  const values = items.map((item) => Number.isFinite(item.value) ? Math.max(0, item.value) : 0)
  const max = values.reduce((largest, value) => Math.max(largest, value), 1)

  return <ul aria-label={label} className="grid gap-4">
    {items.map((item, index) => {
      const value = values[index]!
      return <li key={item.id} className="min-w-0 space-y-1.5">
        <div className="flex items-baseline justify-between gap-4">
          <Text render={<span />} size="small" weight="medium" className="min-w-0 wrap-anywhere">{item.label}</Text>
          <Text render={<span />} size="caption" tone="muted" className="shrink-0">{value}{unit ? ` ${value === 1 ? unit.singular : unit.plural}` : ''}</Text>
        </div>
        <div aria-hidden="true" className="h-2.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary" style={{ width: `${value / max * 100}%` }} />
        </div>
      </li>
    })}
  </ul>
}
