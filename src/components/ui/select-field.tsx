import type { ComponentProps } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

/** A native select with the same control tokens as Input. */
export function SelectField({ className, children, controlSize = 'default', ...props }: ComponentProps<'select'> & { controlSize?: 'default' | 'sm' }) {
  return (
    <div className={cn('relative min-w-0', className)}>
      <select
        data-slot="select-field"
        className={cn('h-(--control-height) w-full min-w-0 appearance-none rounded-control border border-input bg-card pr-10 pl-4 font-sans text-base text-foreground outline-none transition-colors duration-(--duration-fast) focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive md:text-sm', controlSize === 'sm' && 'h-(--control-height-sm)')}
        {...props}
      >
        {children}
      </select>
      <ChevronDown aria-hidden="true" className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  )
}
