import { Tooltip as Primitive } from '@base-ui/react/tooltip'
import { Card, CardContent } from './card'

export const Tooltip = Primitive.Root
export const TooltipProvider = Primitive.Provider
export const TooltipTrigger = Primitive.Trigger
export const createTooltipHandle = Primitive.createHandle

/** A non-interactive description for a hovered or focused control. */
export function TooltipContent({ side = 'top', align = 'center', children, ...props }: Primitive.Popup.Props & Pick<Primitive.Positioner.Props, 'side' | 'align'>) {
  return <Primitive.Portal>
    <Primitive.Positioner side={side} align={align} sideOffset={8} collisionPadding={12} className="z-50">
      <Primitive.Popup {...props} role="tooltip" className="w-64 max-w-[calc(100vw-24px)] rounded-surface shadow-lg outline-none">
        <Card size="sm"><CardContent>{children}</CardContent></Card>
      </Primitive.Popup>
    </Primitive.Positioner>
  </Primitive.Portal>
}
