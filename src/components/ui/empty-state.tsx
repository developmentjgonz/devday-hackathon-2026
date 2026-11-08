import { useId, type ComponentProps, type ReactNode } from 'react'
import { Heading, Text } from './typography'
import { cn } from 'cn'

type EmptyStateProps = Omit<ComponentProps<'div'>, 'title'> & {
  title: string
  description?: string
  action?: ReactNode
  tone?: 'default' | 'danger'
  size?: 'default' | 'page'
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6
} & ({ icon: ReactNode; illustration?: never } | { icon?: never; illustration: ReactNode })

export function EmptyState({ title, description, icon, illustration, action, tone = 'default', size = 'default', headingLevel = 3, className, ...props }: EmptyStateProps) {
  const titleId = useId()
  return (
    <div role="group" aria-labelledby={titleId} className={cn('flex min-h-48 flex-col items-center justify-center gap-4 px-5 py-8 text-center', className)} {...props}>
      {illustration ? (
        <span aria-hidden="true" className="grid size-40 place-items-center rounded-full bg-secondary sm:size-48">{illustration}</span>
      ) : (
        <span aria-hidden="true" className={cn('grid size-12 place-items-center rounded-full [&_svg]:size-5', tone === 'danger' ? 'bg-destructive/10 text-destructive' : 'bg-secondary text-secondary-foreground')}>{icon}</span>
      )}
      <div className="min-w-0 max-w-full wrap-anywhere">
        <Heading level={headingLevel} size={size === 'page' ? 'title' : 'card'} id={titleId}>{title}</Heading>
        {description ? <Text size="small" tone="muted" className="mt-2 max-w-xs">{description}</Text> : null}
      </div>
      {action}
    </div>
  )
}
