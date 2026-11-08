import type { ComponentProps, ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from 'cn'
import { Heading, Text } from './typography'

export function Disclosure({ title, titleHeadingLevel, children, className, ...props }: Omit<ComponentProps<'details'>, 'title'> & { title: ReactNode; titleHeadingLevel?: 1 | 2 | 3 | 4 | 5 | 6 }) {
  return (
    <details className={cn('group/disclosure', className)} {...props}>
      <summary className="group/summary flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-control outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
        {titleHeadingLevel ? <Heading level={titleHeadingLevel} size="card" className="underline-offset-4 group-hover/summary:underline">{title}</Heading> : <Text render={<span />} size="small" weight="medium" tone="muted" className="underline-offset-4 group-hover/summary:text-foreground group-hover/summary:underline">{title}</Text>}
        <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground group-hover/summary:text-foreground group-open/disclosure:rotate-180" />
      </summary>
      <div className="pt-3">{children}</div>
    </details>
  )
}
