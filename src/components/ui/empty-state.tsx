import { useId, type ComponentProps, type ReactNode } from 'react'
import { Heading, Text } from './typography'
import { cn } from 'cn'

export function EmptyState({ title, description, icon, action, tone = 'default', size = 'default', headingLevel = 3, className, ...props }: Omit<ComponentProps<'div'>, 'title'> & { title: string; description?: string; icon: ReactNode; action?: ReactNode; tone?: 'default' | 'danger'; size?: 'default' | 'page'; headingLevel?: 1 | 2 | 3 | 4 | 5 | 6 }) {
  const titleId = useId()
  return (
    <div aria-labelledby={titleId} className={cn('flex min-h-48 flex-col items-center justify-center gap-4 px-5 py-8 text-center', className)} {...props}>
      <span aria-hidden="true" className={cn('grid size-12 place-items-center rounded-full [&_svg]:size-5', tone === 'danger' ? 'bg-destructive/10 text-destructive' : 'bg-secondary text-secondary-foreground')}>{icon}</span>
      <div>
        <Heading level={headingLevel} size={size === 'page' ? 'title' : 'card'} id={titleId}>{title}</Heading>
        {description ? <Text size="small" tone="muted" className="mt-2 max-w-xs">{description}</Text> : null}
      </div>
      {action}
    </div>
  )
}
