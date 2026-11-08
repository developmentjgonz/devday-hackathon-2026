import * as React from 'react'
import { cn } from 'cn'

function Label({ className, ...props }: React.ComponentProps<'label'>) {
  return (
    <label
      data-slot="label"
      className={cn(
        'flex items-center gap-2 font-sans text-sm leading-5 font-semibold select-none peer-data-[slot=checkbox]:min-h-11 peer-data-[slot=switch]:min-h-11 group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50 peer-data-disabled:cursor-not-allowed peer-data-disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}

export { Label }
