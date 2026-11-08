import { Text } from './typography'
import { cn } from '@/lib/utils'

export function ProgressRing({ value, max, label, tone = 'primary' }: { value: number; max: number; label: string; tone?: 'primary' | 'success' }) {
  const total = Number.isFinite(max) ? Math.max(0, max) : 0
  const completed = Number.isFinite(value) ? Math.min(total, Math.max(0, value)) : 0
  const percent = total ? Math.round(completed / total * 100) : 0
  return <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={total || 1} aria-valuenow={completed} aria-valuetext={total ? `${completed} of ${total} complete, ${percent}%` : 'No items'} className="relative grid size-(--progress-ring-size) shrink-0 place-items-center">
    <svg aria-hidden="true" viewBox="0 0 88 88" className="absolute inset-0 size-full fill-none [stroke-width:var(--progress-ring-stroke)]">
      <circle cx="44" cy="44" r="38" className="stroke-border" />
      {percent ? <circle cx="44" cy="44" r="38" pathLength="100" strokeDasharray={`${percent} 100`} strokeLinecap="round" transform="rotate(-90 44 44)" className={cn(tone === 'success' ? 'stroke-success-foreground' : 'stroke-primary')} /> : null}
    </svg>
    <Text render={<span aria-hidden="true" />} size="metric" weight="semibold">{total ? `${percent}%` : '—'}</Text>
  </div>
}
