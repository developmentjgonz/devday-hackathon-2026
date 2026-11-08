import type { ComponentProps, ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Text } from './typography'

export function ReportListItem({ title, summary, meta, badge, selected = false, className, ...props }: Omit<ComponentProps<'button'>, 'title'> & {
  title: string
  summary?: string
  meta: ReactNode
  badge?: ReactNode
  selected?: boolean
}) {
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      aria-current={selected ? 'true' : undefined}
      data-slot="report-list-item"
      className={cn('flex w-full cursor-pointer flex-col gap-2 rounded-[inherit] px-5 py-5 text-left font-sans outline-none transition-colors duration-(--duration-fast) select-none focus-visible:relative focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50', selected ? 'bg-sidebar-accent' : '[@media(hover:hover)_and_(pointer:fine)]:hover:bg-muted/50 active:bg-muted', className)}
      {...props}
    >
      {badge !== null ? <span className="flex w-full flex-wrap items-center gap-2">
        {badge ?? <Text render={<span />} size="caption" tone="muted">Report</Text>}
      </span> : null}
      <span className="flex w-full items-start gap-3">
        <Text render={<span />} size="body" weight="semibold" className="min-w-0 flex-1 wrap-anywhere">{title}</Text>
        <ChevronRight aria-hidden="true" className="mt-1 size-4 shrink-0 text-muted-foreground" />
      </span>
      {summary ? <Text render={<span />} size="small" tone="muted" className="line-clamp-2 wrap-anywhere">{summary}</Text> : null}
      <Text render={<span />} size="small" tone="muted" className="wrap-anywhere">{meta}</Text>
    </button>
  )
}
