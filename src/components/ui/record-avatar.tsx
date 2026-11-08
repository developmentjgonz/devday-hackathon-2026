import { useState } from 'react'
import { Cat, House } from 'lucide-react'
import { CommunityCat } from '@/components/illustrations/community-cat'
import { cn } from '@/lib/utils'

/** A photo or a neutral fallback for a colony or cat record. */
export function RecordAvatar({ name, kind, src, size = 'default', fallback = 'icon', className }: {
  name: string
  kind: 'cat' | 'colony'
  src?: string
  size?: 'sm' | 'default' | 'lg' | 'portrait'
  fallback?: 'icon' | 'illustration'
  className?: string
}) {
  const [failedSrc, setFailedSrc] = useState<string>()
  const showPhoto = Boolean(src && src !== failedSrc)
  const Icon = kind === 'cat' ? Cat : House
  return <span role="img" aria-label={showPhoto ? `${name} photo` : `${name}, no photo`} className={cn(
    'inline-flex shrink-0 items-center justify-center overflow-hidden border border-border bg-record-avatar text-muted-foreground',
    size === 'portrait' ? 'size-24 rounded-control sm:size-32' : 'rounded-full',
    size === 'sm' ? 'size-10' : size === 'lg' ? 'size-20' : size === 'default' ? 'size-14' : '', className,
  )}>
    {showPhoto ? <img src={src} alt="" className="h-full w-full object-cover" onError={() => setFailedSrc(src)} />
      : fallback === 'illustration' ? <CommunityCat aria-hidden="true" role="presentation" className="h-full w-full" />
        : <Icon aria-hidden="true" className="h-1/2 w-1/2" />}
  </span>
}
