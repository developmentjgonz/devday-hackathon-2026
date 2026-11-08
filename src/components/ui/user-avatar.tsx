import { Text } from './typography'
import { cn } from '@/lib/utils'

/** An anonymous visual companion to a person's visible name. */
export function UserAvatar({ name, size = 'default' }: { name: string; size?: 'default' | 'sm' }) {
  const initials = name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => Array.from(part)[0]).join('').toLocaleUpperCase()
  return <span aria-hidden="true" className={cn('flex shrink-0 items-center justify-center rounded-full border border-foreground/5 bg-secondary text-secondary-foreground', size === 'sm' ? 'size-9' : 'size-11')}>
    <Text render={<span />} size="label">{initials}</Text>
  </span>
}
