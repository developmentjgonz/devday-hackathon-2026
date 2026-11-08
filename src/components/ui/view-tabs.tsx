import { Tabs } from '@base-ui/react/tabs'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type ViewTab = { value: string; label: string; count?: number }

/** Controlled view navigation. Base UI supplies arrow-key and focus behavior. */
export function ViewTabs({ items, value, onValueChange, label, className, children }: {
  items: ViewTab[]
  value: string
  onValueChange: (value: string) => void
  label: string
  className?: string
  children?: ReactNode
}) {
  return (
    <Tabs.Root value={value} onValueChange={(next) => onValueChange(String(next))} className={className}>
      <Tabs.List activateOnFocus aria-label={label} className="flex flex-wrap gap-x-5 gap-y-1 border-b border-border">
        {items.map((item) => (
          <Tabs.Tab key={item.value} value={item.value} className={cn(
            'relative flex min-h-11 items-center gap-2 border-b-2 border-transparent px-0 py-3 font-sans text-sm font-medium text-muted-foreground outline-none select-none hover:text-foreground focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring data-active:border-primary-text data-active:text-foreground',
          )}>
            {item.label}
            {item.count !== undefined ? <span className="rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums">{item.count}</span> : null}
          </Tabs.Tab>
        ))}
      </Tabs.List>
      <Tabs.Panel value={value} tabIndex={-1} className="outline-none">{children}</Tabs.Panel>
    </Tabs.Root>
  )
}
