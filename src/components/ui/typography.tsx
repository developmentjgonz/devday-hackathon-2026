import type { ComponentProps } from 'react'
import { cn } from 'cn'

const headingSizes = {
  display: 'text-5xl leading-[0.98] tracking-tight sm:text-7xl',
  title: 'text-3xl leading-tight tracking-tight sm:text-4xl',
  section: 'text-2xl leading-tight tracking-tight',
  card: 'text-lg leading-snug',
}

export function Heading({
  level = 2,
  size = 'section',
  className,
  ...props
}: ComponentProps<'h2'> & {
  level?: 1 | 2 | 3 | 4 | 5 | 6
  size?: keyof typeof headingSizes
}) {
  const Tag = `h${level}` as const
  return (
    <Tag
      {...props}
      data-slot="heading"
      className={cn(
        'font-heading font-semibold text-balance',
        headingSizes[size],
        className,
      )}
    />
  )
}

export function Text({
  size = 'body',
  tone = 'default',
  className,
  ...props
}: ComponentProps<'p'> & {
  size?: 'body' | 'small' | 'label'
  tone?: 'default' | 'muted'
}) {
  return (
    <p
      {...props}
      data-slot="text"
      className={cn(
        size === 'body'
          ? 'text-base leading-7'
          : size === 'small'
            ? 'text-sm leading-6'
            : 'text-xs leading-5 font-medium uppercase tracking-widest',
        tone === 'muted' && 'text-muted-foreground',
        className,
      )}
    />
  )
}
