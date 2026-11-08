import * as React from 'react'
import { cn } from 'cn'

function Textarea({ className, variant = 'default', ...props }: React.ComponentProps<'textarea'> & { variant?: 'default' | 'composer' }) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'flex field-sizing-content min-h-24 w-full rounded-control border border-input bg-card px-4 py-2 text-base transition-colors duration-(--duration-fast) outline-none placeholder:text-placeholder-foreground placeholder:opacity-100 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 aria-invalid:focus-visible:ring-ring dark:aria-invalid:focus-visible:ring-ring md:text-sm dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40',
        '[@media(any-pointer:coarse)]:text-base',
        variant === 'composer' && 'min-h-14 max-h-40 resize-none rounded-none border-0 bg-transparent py-3 focus-visible:ring-0 disabled:bg-transparent md:text-base',
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
