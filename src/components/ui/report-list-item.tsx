import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Text } from './typography'

export function ReportListItem({ title, summary, meta, badge, selected = false, unread = false, className, ...props }: Omit<ComponentProps<'button'>, 'title'> & {
  title: string
  summary: string
  meta: string
  badge?: ReactNode
  selected?: boolean
  unread?: boolean
}) {
  return (
    <button
      type="button"
      aria-current={selected ? 'true' : undefined}
      data-slot="report-list-item"
      className={cn('flex w-full flex-col gap-2 px-5 py-5 text-left font-sans outline-none transition-colors duration-(--duration-fast) select-none focus-visible:relative focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50', selected ? 'bg-sidebar-accent' : 'hover:bg-muted/50 active:bg-muted', className)}
      {...props}
    >
      <span className="flex w-full items-center justify-between gap-3">
        {badge ?? <Text render={<span />} size="caption" tone="muted">Report</Text>}
        {unread ? <span className="size-2 shrink-0 rounded-full bg-primary-text"><span className="sr-only">Unread</span></span> : null}
      </span>
      <Text render={<span />} size="small" weight="semibold">{title}</Text>
      <Text render={<span />} size="small" tone="muted" className="line-clamp-2">{summary}</Text>
      <Text render={<span />} size="caption" tone="muted">{meta}</Text>
    </button>
  )
}
