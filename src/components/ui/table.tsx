import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

export function Table({ className, ...props }: ComponentProps<'table'>) {
  return <table data-slot="table" className={cn('w-full table-fixed border-collapse font-sans text-sm', className)} {...props} />
}
export function TableHead({ className, ...props }: ComponentProps<'th'>) {
  return <th scope="col" className={cn('border-b border-border bg-muted/35 px-4 py-3 text-left text-xs leading-5 font-medium text-muted-foreground first:pl-5 last:pr-5', className)} {...props} />
}
export function TableRow({ interactive = false, selected = false, className, ...props }: ComponentProps<'tr'> & { interactive?: boolean; selected?: boolean }) {
  return <tr data-slot="table-row" className={cn('border-b border-border last:border-b-0', interactive && 'cursor-pointer transition-colors duration-(--duration-fast)', selected ? 'bg-sidebar-accent' : interactive && 'hover:bg-muted/45 focus-within:bg-muted/45', className)} {...props} />
}
export function TableCell({ className, ...props }: ComponentProps<'td'>) {
  return <td className={cn('px-4 py-3 align-middle first:pl-5 last:pr-5', className)} {...props} />
}
export function TableOpenButton({ children, className, unread = false, ...props }: ComponentProps<'button'> & { unread?: boolean }) {
  return <button type="button" aria-haspopup="dialog" data-slot="table-open-button" className={cn('flex min-h-7 max-w-full items-center gap-2 rounded-sm font-sans text-sm leading-6 font-semibold text-foreground outline-none select-none hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2', className)} {...props}>{unread ? <span className="size-1.5 shrink-0 rounded-full bg-primary-text"><span className="sr-only">Unread</span></span> : null}<span className="truncate">{children}</span></button>
}
