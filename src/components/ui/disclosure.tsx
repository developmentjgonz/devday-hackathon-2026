import type { ComponentProps, ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from 'cn'
import { Text } from './typography'

export function Disclosure({ title, children, className, ...props }: Omit<ComponentProps<'details'>, 'title'> & { title: ReactNode }) {
  return (
    <details className={cn('group/disclosure', className)} {...props}>
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-control outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
        <Text render={<span />} size="small" weight="medium" tone="muted">{title}</Text>
        <ChevronDown aria-hidden="true" className="size-4 text-muted-foreground group-open/disclosure:rotate-180" />
      </summary>
      <div className="pt-3">{children}</div>
    </details>
  )
}
