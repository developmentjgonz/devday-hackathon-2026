import { useState } from 'react'
import { Cat, House } from 'lucide-react'
import { cn } from '@/lib/utils'

/** A photo or a neutral fallback for a colony or cat record. */
export function RecordAvatar({ name, kind, src, size = 'default', className }: {
  name: string
  kind: 'cat' | 'colony'
  src?: string
  size?: 'sm' | 'default' | 'lg'
  className?: string
}) {
  const [failedSrc, setFailedSrc] = useState<string>()
  const showPhoto = Boolean(src && src !== failedSrc)
  const Icon = kind === 'cat' ? Cat : House
  return <span role="img" aria-label={showPhoto ? `${name} photo` : `${name}, no photo`} className={cn(
    'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-record-avatar text-muted-foreground',
    size === 'sm' ? 'size-10' : size === 'lg' ? 'size-20' : 'size-14', className,
  )}>
    {showPhoto ? <img src={src} alt="" className="h-full w-full object-cover" onError={() => setFailedSrc(src)} /> : <Icon aria-hidden="true" className="h-1/2 w-1/2" />}
  </span>
}
