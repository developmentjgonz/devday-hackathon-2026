import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Text } from './typography'

export function ReportListItem({ title, summary, meta, badge, selected = false, className, ...props }: Omit<ComponentProps<'button'>, 'title'> & {
  title: string
  summary?: string
  meta: string
  badge?: ReactNode
  selected?: boolean
}) {
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      aria-current={selected ? 'true' : undefined}
      data-slot="report-list-item"
      className={cn('flex w-full flex-col gap-2 px-5 py-5 text-left font-sans outline-none transition-colors duration-(--duration-fast) select-none focus-visible:relative focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50', selected ? 'bg-sidebar-accent' : 'hover:bg-muted/50 active:bg-muted', className)}
      {...props}
    >
      <span className="flex w-full flex-wrap items-center gap-2">
        {badge ?? <Text render={<span />} size="caption" tone="muted">Report</Text>}
      </span>
      <Text render={<span />} size="body" weight="semibold" className="wrap-anywhere">{title}</Text>
      {summary ? <Text render={<span />} size="small" tone="muted" className="line-clamp-2">{summary}</Text> : null}
      <Text render={<span />} size="small" tone="muted" className="wrap-anywhere">{meta}</Text>
    </button>
  )
}
