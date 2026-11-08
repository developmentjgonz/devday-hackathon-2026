import type { ComponentProps } from 'react'
import { Dialog as Primitive } from '@base-ui/react/dialog'
import { X } from 'lucide-react'
import { Button } from './button'
import { DialogOverlay, DialogPortal } from './dialog'
import { cn } from '@/lib/utils'

export const Drawer = Primitive.Root

export function DrawerContent({ className, children, closeLabel = 'Close panel', ...props }: Primitive.Popup.Props & { closeLabel?: string }) {
  return <DialogPortal><DialogOverlay /><Primitive.Popup
    data-slot="drawer-content"
    className={cn('fixed inset-y-0 right-0 z-50 flex h-dvh w-full flex-col overflow-hidden border-l border-border bg-popover font-sans text-sm leading-6 text-popover-foreground shadow-xl outline-none duration-200 ease-(--ease-out) sm:max-w-[38rem] data-open:animate-in data-open:slide-in-from-right data-closed:animate-out data-closed:slide-out-to-right motion-reduce:animate-none', className)}
    {...props}
  >{children}<Primitive.Close render={<Button variant="ghost" size="icon" className="absolute top-[max(1rem,env(safe-area-inset-top))] right-[max(1rem,env(safe-area-inset-right))]" />} aria-label={closeLabel}><X aria-hidden="true" /></Primitive.Close></Primitive.Popup></DialogPortal>
}
export function DrawerHeader({ className, density = 'default', ...props }: ComponentProps<'div'> & { density?: 'default' | 'compact' }) {
  return <div data-slot="drawer-header" className={cn('grid min-w-0 shrink-0 border-b border-border wrap-anywhere', density === 'compact' ? 'gap-2 px-6 py-4 pt-[max(1rem,env(safe-area-inset-top))]' : 'gap-3 p-6 pt-[max(1.5rem,env(safe-area-inset-top))]', 'pr-16', className)} {...props} />
}
export function DrawerBody({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="drawer-body" className={cn('min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-6 py-6', className)} {...props} />
}
export function DrawerFooter({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="drawer-footer" className={cn('flex shrink-0 flex-col gap-3 border-t border-border bg-popover px-6 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]', className)} {...props} />
}
