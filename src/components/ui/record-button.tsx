import type { ComponentProps, ReactNode } from 'react'
import { Button } from './button'
import { headingVariants, Text } from './typography'

export function RecordButton({ title, description, icon, selected, ...props }: Omit<ComponentProps<typeof Button>, 'title' | 'children' | 'variant' | 'size'> & { title: string; description: string; icon?: ReactNode; selected?: boolean }) {
  return (
    <Button variant="selection" size="content" aria-pressed={selected} {...props}>
      <span className="min-w-0 flex-1">
        <span className={headingVariants({ size: 'compact', className: 'block break-words' })}>{title}</span>
        <Text render={<span />} size="caption" tone="muted" className="mt-0.5 block">{description}</Text>
      </span>
      {icon}
    </Button>
  )
}
