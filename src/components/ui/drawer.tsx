import type { ComponentProps } from 'react'
import { Dialog as Primitive } from '@base-ui/react/dialog'
import { X } from 'lucide-react'
import { Button } from './button'
import { DialogOverlay, DialogPortal } from './dialog'
import { Text } from './typography'
import { cn } from '@/lib/utils'

export const Drawer = Primitive.Root
export const DrawerTrigger = Primitive.Trigger

export function DrawerContent({ className, children, closeLabel = 'Close panel', closeDisabled = false, motion = 'default', size = 'default', ...props }: Primitive.Popup.Props & { closeLabel?: string; closeDisabled?: boolean; motion?: 'default' | 'none'; size?: 'default' | 'navigation' }) {
  return <DialogPortal><DialogOverlay motion={motion} /><Primitive.Popup
    data-slot="drawer-content"
    data-size={size}
    className={cn('fixed inset-y-0 right-0 z-50 flex h-dvh flex-col overflow-hidden border-l border-border bg-popover font-sans text-sm leading-6 text-popover-foreground shadow-xl outline-none', size === 'navigation' ? 'w-[min(20rem,calc(100%-3rem))]' : 'w-full sm:max-w-[38rem]', motion === 'default' && 'duration-200 ease-(--ease-out) data-open:animate-in data-open:slide-in-from-right data-closed:animate-out data-closed:slide-out-to-right motion-reduce:animate-none', className)}
    {...props}
  >{children}<Primitive.Close disabled={closeDisabled} render={<Button variant="ghost" size="icon" className="absolute top-[max(1rem,env(safe-area-inset-top))] right-[max(1rem,env(safe-area-inset-right))]" />} aria-label={closeLabel}><X aria-hidden="true" /></Primitive.Close></Primitive.Popup></DialogPortal>
}
export function DrawerHeader({ className, density = 'default', ...props }: ComponentProps<'div'> & { density?: 'default' | 'compact' }) {
  return <div data-slot="drawer-header" className={cn('grid min-w-0 shrink-0 border-b border-border wrap-anywhere', density === 'compact' ? 'gap-2 px-4 py-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6' : 'gap-3 p-6 pt-[max(1.5rem,env(safe-area-inset-top))]', 'pr-16', className)} {...props} />
}
export function DrawerContext({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="drawer-context" className={cn('grid grid-cols-2 gap-3', className)} {...props} />
}
export function DrawerContextField({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="drawer-context-field" className={cn('grid min-w-0 gap-2', className)} {...props} />
}
export function DrawerContextValue({ label, value, maxLines }: { label: string; value: string; maxLines?: 2 }) {
  return <dl data-slot="drawer-context-value" className="min-w-0 space-y-1">
    <Text render={<dt />} size="caption" tone="muted">{label}</Text>
    <Text render={<dd />} size="small" className={cn('wrap-anywhere', maxLines === 2 && 'line-clamp-2')} title={value}>{value}</Text>
  </dl>
}
export function DrawerBody({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="drawer-body" className={cn('min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-6', className)} {...props} />
}
export function DrawerFooter({ className, layout = 'actions', ...props }: ComponentProps<'div'> & { layout?: 'actions' | 'stack' }) {
  return <div data-slot="drawer-footer" className={cn('flex shrink-0 gap-3 border-t border-border bg-popover px-6 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]', layout === 'actions' ? 'flex-col-reverse sm:flex-row sm:justify-end' : 'flex-col', className)} {...props} />
}
