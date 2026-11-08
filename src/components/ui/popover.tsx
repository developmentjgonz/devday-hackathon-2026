import { Popover as Primitive } from '@base-ui/react/popover'
import { cn } from 'cn'
import { headingVariants, Text } from './typography'

export const Popover = Primitive.Root
export const PopoverTrigger = Primitive.Trigger
export const PopoverClose = Primitive.Close

export function PopoverContent({ className, side = 'top', align = 'start', ...props }: Primitive.Popup.Props & Pick<Primitive.Positioner.Props, 'side' | 'align'>) {
  return <Primitive.Portal><Primitive.Positioner side={side} align={align} sideOffset={8} collisionPadding={12} className="z-50"><Primitive.Popup className={cn('w-64 max-w-[calc(100vw-24px)] rounded-surface border bg-popover p-[max(0px,calc(var(--surface-radius)-var(--control-radius)-1px))] text-popover-foreground shadow-lg outline-none', className)} {...props} /></Primitive.Positioner></Primitive.Portal>
}
export function PopoverTitle({ className, ...props }: Primitive.Title.Props) {
  return <Primitive.Title className={cn(headingVariants({ size: 'card' }), className)} {...props} />
}
export function PopoverDescription(props: Primitive.Description.Props) {
  return <Text render={<Primitive.Description {...props} />} size="caption" tone="muted" />
}
