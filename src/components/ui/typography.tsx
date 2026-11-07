import type { ComponentProps } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from 'cn'

/** Shared by semantic headings and primitive titles (Card and Dialog). */
const headingVariants = cva('font-heading text-balance', {
  variants: {
    size: {
      display:
        'text-(length:--type-display) leading-[1.02] font-bold tracking-[-0.035em] sm:text-(length:--type-display-wide)',
      title:
        'text-(length:--type-title) leading-tight font-semibold tracking-tight sm:text-(length:--type-title-wide)',
      section:
        'text-(length:--type-section) leading-[1.2] font-semibold tracking-[-0.015em]',
      card: 'text-(length:--type-card-title) leading-[1.35] font-semibold',
    },
  },
  defaultVariants: { size: 'section' },
})

export function Heading({
  level = 2,
  size = 'section',
  className,
  ...props
}: ComponentProps<'h2'> &
  VariantProps<typeof headingVariants> & { level?: 1 | 2 | 3 | 4 | 5 | 6 }) {
  const Tag = `h${level}` as const
  return (
    <Tag
      {...props}
      data-slot="heading"
      className={cn(headingVariants({ size }), className)}
    />
  )
}

export function Text({
  size = 'body',
  tone = 'default',
  className,
  ...props
}: ComponentProps<'p'> & {
  size?: 'lead' | 'body' | 'small' | 'label'
  tone?: 'default' | 'muted' | 'danger'
}) {
  return (
    <p
      {...props}
      data-slot="text"
      className={cn(
        'font-sans',
        size === 'lead'
          ? 'text-(length:--type-lead) leading-8'
          : size === 'body'
          ? 'text-(length:--type-body) leading-7'
          : size === 'small'
            ? 'text-(length:--type-small) leading-6'
            : 'text-(length:--type-caption) leading-5 font-semibold',
        tone === 'muted' && 'text-muted-foreground',
        tone === 'danger' && 'text-destructive',
        className,
      )}
    />
  )
}

export function HeadingAccent({ tone = 'primary', className, ...props }: ComponentProps<'span'> & { tone?: 'primary' | 'success' }) {
  return <span {...props} className={cn(tone === 'primary' ? 'text-primary-display' : 'text-success-foreground', className)} />
}

export { headingVariants }
