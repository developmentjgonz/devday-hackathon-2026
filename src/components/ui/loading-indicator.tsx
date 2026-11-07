import type { ComponentProps } from 'react'
import { PawPrint } from 'lucide-react'
import { cn } from 'cn'

export type LoadingIndicatorProps = Omit<ComponentProps<'span'>, 'children'> & {
  variant?: 'spinner' | 'paws' | 'fire'
  size?: 'sm' | 'md' | 'lg'
  label?: string
  /** Freeze the current animation frame without resetting it. */
  paused?: boolean
  /** Use when the containing control already provides the accessible name. */
  decorative?: boolean
}

export function LoadingIndicator({
  variant = 'spinner',
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
      {variant === 'spinner' ? (
        <span className="mews-spinner block rounded-full border-2 border-current border-r-transparent" />
      ) : null}
      {variant === 'paws'
        ? [0, 1, 2].map((index) => (
            <span key={index} className="mews-paw inline-flex">
              <PawPrint fill="currentColor" strokeWidth={1.5} />
            </span>
          ))
        : null}
      {variant === 'fire' ? (
        <span className="mews-flame relative inline-flex text-primary">
          <span className="mews-flame-shell absolute inset-0 inline-flex origin-bottom">
            <svg viewBox="0 0 40 48" fill="none" aria-hidden="true">
              <path
                d="M22 1c3 13 15 16 15 29a17 17 0 0 1-34 0c0-8 4-13 9-18 0 6 2 8 4 9C22 14 24 10 22 1Z"
                fill="currentColor"
              />
            </svg>
          </span>
          <span className="mews-flame-core absolute inset-0 inline-flex origin-bottom">
            <svg viewBox="0 0 40 48" fill="none" aria-hidden="true">
              <path
                d="M21 24c1 7 8 9 8 15a9 9 0 0 1-18 0c0-4 3-8 5-10 0 4 1 5 2 6 3-4 4-7 3-11Z"
                fill="var(--accent)"
              />
            </svg>
          </span>
        </span>
      ) : null}
    </span>
  )
}
