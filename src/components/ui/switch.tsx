import { Switch as SwitchPrimitive } from '@base-ui/react/switch'
import { cn } from 'cn'

function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
  return <SwitchPrimitive.Root
    data-slot="switch"
    className={cn('peer relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-input bg-muted-foreground/40 p-0.5 outline-none transition-colors duration-(--duration-fast) after:absolute after:inset-x-0 after:top-1/2 after:h-11 after:-translate-y-1/2 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-disabled:cursor-not-allowed data-disabled:opacity-50 data-checked:border-primary data-checked:bg-primary', className)}
    {...props}
  >
    <SwitchPrimitive.Thumb data-slot="switch-thumb" className="size-4.5 rounded-full bg-background shadow-sm transition-transform duration-(--duration-fast) ease-(--ease-out) data-checked:translate-x-5 motion-reduce:transition-none" />
  </SwitchPrimitive.Root>
}

export { Switch }
