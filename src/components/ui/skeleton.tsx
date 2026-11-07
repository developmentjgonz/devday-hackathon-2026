import type { ComponentProps } from 'react'
import { cn } from 'cn'

/** Decorative placeholder. Set aria-busy on the content region and provide one loading label. */
export function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      {...props}
      data-slot="skeleton"
      aria-hidden="true"
      className={cn('mews-skeleton rounded-md bg-muted', className)}
    />
  )
}
