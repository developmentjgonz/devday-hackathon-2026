import type { ComponentProps } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from 'cn'
import { useRender } from '@base-ui/react/use-render'
import { mergeProps } from '@base-ui/react/merge-props'

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
      compact: 'text-base leading-6 font-semibold',
      label: 'text-xs leading-5 font-semibold',
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

const textVariants = cva('font-sans', {
  variants: {
    size: {
      lead: 'text-(length:--type-lead) leading-8',
      body: 'text-(length:--type-body) leading-7',
      small: 'text-(length:--type-small) leading-6',
      caption: 'text-(length:--type-caption) leading-5',
      label: 'text-(length:--type-caption) leading-5 font-semibold',
    },
    tone: { default: '', muted: 'text-muted-foreground', danger: 'text-destructive' },
    weight: { normal: 'font-normal', medium: 'font-medium', semibold: 'font-semibold' },
  },
  defaultVariants: { size: 'body', tone: 'default' },
})

export function Text({
  size = 'body',
  tone = 'default',
  className,
  weight,
  render,
  ...props
}: useRender.ComponentProps<'p'> & VariantProps<typeof textVariants>) {
  return useRender({
    defaultTagName: 'p', render,
    props: { ...mergeProps<'p'>({ className: cn(textVariants({ size, tone, weight }), className) }, props), 'data-slot': 'text' },
  })
}

export function HeadingAccent({ tone = 'primary', className, ...props }: ComponentProps<'span'> & { tone?: 'primary' | 'success' }) {
  return <span {...props} className={cn(tone === 'primary' ? 'text-primary-display' : 'text-success-foreground', className)} />
}

export { headingVariants, textVariants }
