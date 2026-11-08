import type { ComponentProps } from 'react'
import { CatPawPrint } from '@/components/brand-assets'
import { cn } from 'cn'

export type LoadingIndicatorProps = Omit<ComponentProps<'span'>, 'children'> & {
  size?: 'sm' | 'md' | 'lg'
  label?: string
  /** Freeze the current animation frame without resetting it. */
  paused?: boolean
  /** Use when the containing control already provides the accessible name. */
  decorative?: boolean
}

export function LoadingIndicator({
  size = 'md',
  label = 'Loading',
  decorative = false,
  paused = false,
  className,
  ...props
}: LoadingIndicatorProps) {
  return (
    <span
      {...props}
      data-slot="loading-indicator"
      data-size={size}
      data-paused={paused || undefined}
      className={cn(
        'mews-loader inline-flex shrink-0 items-center justify-center gap-1.5 align-middle',
        className,
      )}
      role={decorative ? undefined : 'status'}
      aria-label={decorative ? undefined : label}
      aria-hidden={decorative || undefined}
    >
      {(size === 'sm' ? [0] : [0, 1, 2]).map((index) => (
        <span key={index} className="mews-paw inline-flex">
          <CatPawPrint />
        </span>
      ))}
    </span>
  )
}
