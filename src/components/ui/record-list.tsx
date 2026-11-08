import { useId, useRef, useState, type Key, type ReactNode } from 'react'
import { useRender } from '@base-ui/react/use-render'
import { mergeProps } from '@base-ui/react/merge-props'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'
import { Card, CardList } from './card'
import { Text } from './typography'

/** A shared record action. Use render for a real link; keep other actions outside it. */
export function RecordListItem({ title, meta, description, leading, badge, selected = false, render, className, ...props }: Omit<useRender.ComponentProps<'button'>, 'title'> & {
  title: ReactNode
  meta?: ReactNode
  description?: ReactNode
  leading?: ReactNode
  badge?: ReactNode
  selected?: boolean
}) {
  return useRender({
    defaultTagName: 'button', render,
    props: { ...mergeProps<'button'>({
      type: render ? undefined : 'button',
      'aria-current': selected ? 'true' : undefined,
      className: cn('flex min-h-20 w-full cursor-pointer min-w-0 items-center gap-3 rounded-[inherit] px-4 py-3 text-left outline-none transition-colors duration-(--duration-fast) select-none [@media(hover:hover)_and_(pointer:fine)]:hover:bg-muted/50 active:bg-muted focus-visible:relative focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50', selected && 'bg-sidebar-accent', className),
      children: <>
        {leading}
        <span className="min-w-0 flex-1 space-y-0.5">
          <Text render={<span />} size="small" weight="semibold" className="block wrap-anywhere">{title}</Text>
          {meta ? <Text render={<span />} size="caption" tone="muted" className="block wrap-anywhere">{meta}</Text> : null}
          {description ? <Text render={<span />} size="caption" tone="muted" className="block line-clamp-2 wrap-anywhere">{description}</Text> : null}
          {badge ? <span className="flex flex-wrap items-center gap-1.5 pt-1">{badge}</span> : null}
        </span>
        <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
      </>,
    }, props), 'data-slot': 'record-list-item' },
  })
}

/** Client-side feed: append rows, retain scroll position, and focus the first added action. */
export function RecordList<T>({ items, getKey, renderItem, label, itemName = 'record', emptyState, batchSize = 20 }: {
  items: T[]
  getKey: (item: T) => Key
  renderItem: (item: T) => ReactNode
  label: string
  itemName?: string
  emptyState?: ReactNode
  batchSize?: number
}) {
  const [limit, setLimit] = useState(batchSize)
  const list = useRef<HTMLUListElement>(null)
  const listId = useId()
  const count = Math.min(limit, items.length)
  function showMore() {
    setLimit((current) => current + batchSize)
    requestAnimationFrame(() => {
      list.current?.children[count]?.querySelector<HTMLElement>('a, button, [tabindex="0"]')?.focus({ preventScroll: true })
    })
  }
  if (!items.length) return <Card padding="none">{emptyState}</Card>
  return <div className="space-y-3">
    <Card padding="none">
      <CardList ref={list} id={listId} aria-label={label}>
        {items.slice(0, limit).map((item) => <li key={getKey(item)} className="min-w-0">{renderItem(item)}</li>)}
      </CardList>
    </Card>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Text size="caption" tone="muted" role="status">{count < items.length ? `${count} of ` : ''}{items.length} {items.length === 1 ? itemName : itemName.endsWith('y') ? `${itemName.slice(0, -1)}ies` : `${itemName}s`}</Text>
      {count < items.length ? <Button variant="outline" size="sm" aria-controls={listId} onClick={showMore}>Show more</Button> : null}
    </div>
  </div>
}
