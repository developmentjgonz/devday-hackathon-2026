import type { ComponentProps } from 'react'
import { cn } from 'cn'
import sadCatUrl from '@/assets/sad-cat.webp'

/** A decorative illustration for recovery screens. */
export function SadCat({ className, ...props }: Omit<ComponentProps<'img'>, 'src' | 'alt'>) {
  return <img {...props} src={sadCatUrl} alt="" width={512} height={512} className={cn('size-full object-contain', className)} />
}
