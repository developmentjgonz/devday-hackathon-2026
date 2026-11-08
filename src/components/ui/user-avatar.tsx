import { useState } from 'react'
import { Text } from './typography'
import { cn } from '@/lib/utils'

/** A photo or initials beside a person's visible name. */
export function UserAvatar({ name, src, size = 'default' }: { name: string; src?: string; size?: 'default' | 'sm' | 'lg' }) {
  const [failedSrc, setFailedSrc] = useState<string>()
  const initials = name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => Array.from(part)[0]).join('').toLocaleUpperCase()
  return <span aria-hidden="true" className={cn('flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-foreground/5 bg-secondary text-secondary-foreground', size === 'sm' ? 'size-9' : size === 'lg' ? 'size-20' : 'size-11')}>
    {src && src !== failedSrc ? <img src={src} alt="" className="h-full w-full object-cover" onError={() => setFailedSrc(src)} /> : <Text render={<span />} size="label">{initials}</Text>}
  </span>
}
