import type { ComponentProps } from 'react'
import { Bell } from 'lucide-react'
import { Button } from './button'

export function NotificationButton({ count = 0, label = 'Notifications', ...props }: Omit<ComponentProps<typeof Button>, 'children' | 'size' | 'variant'> & { count?: number; label?: string }) {
  return <Button variant="ghost" size="icon" aria-label={`${label}: ${count}`} title={label} {...props}>
    <Bell className="size-5" strokeWidth={1.75} aria-hidden="true" />
    {count > 0 ? <span aria-hidden="true" className="absolute top-2.5 right-2.5 size-1.5 rounded-full bg-destructive ring-2 ring-background" /> : null}
  </Button>
}
