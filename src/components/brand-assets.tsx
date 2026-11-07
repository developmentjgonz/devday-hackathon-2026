import type { ComponentProps } from 'react'
import { cn } from 'cn'
import catMarkUrl from '@/assets/mews-cat.svg'
import { Heart } from 'lucide-react'

export function CatMark({
  alt = 'Mews cat mark',
  className,
  ...props
}: Omit<ComponentProps<'img'>, 'src'>) {
  return (
    <img
      {...props}
      src={catMarkUrl}
      alt={alt}
      width={96}
      height={96}
      className={cn('size-8 shrink-0', className)}
    />
  )
}

export function MewsWordmark({ className, ...props }: ComponentProps<'span'>) {
  return (
    <span
      {...props}
      className={cn('inline-flex items-center gap-[0.3em] font-heading text-2xl font-semibold leading-none tracking-[-0.04em]', className)}
    >
      <CatMark alt="" className="size-[1.6em]" />
      <span>mews</span>
    </span>
  )
}

export function CareSticker() {
  return (
    <div className="flex size-28 shrink-0 rotate-6 flex-col items-center justify-center gap-2 rounded-full bg-primary p-4 text-center font-heading text-sm leading-[1.15] font-[450] text-primary-foreground sm:size-32 sm:text-base">
      <span className="whitespace-nowrap">A little care.<br />A whole lot<br />of love.</span>
      <Heart className="size-4 shrink-0" fill="currentColor" strokeWidth={0} aria-hidden="true" />
    </div>
  )
}
