import * as React from 'react'
import { Input as InputPrimitive } from '@base-ui/react/input'
import { cn } from 'cn'

function Input({ className, type, controlSize = 'default', ...props }: React.ComponentProps<'input'> & { controlSize?: 'default' | 'sm' }) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        'h-(--control-height) w-full min-w-0 rounded-control border border-input bg-card px-4 py-1 text-base transition-colors duration-(--duration-fast) outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-placeholder-foreground placeholder:opacity-100 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 aria-invalid:focus-visible:ring-ring dark:aria-invalid:focus-visible:ring-ring md:text-sm dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40',
        controlSize === 'sm' && 'h-(--control-height-sm)',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
