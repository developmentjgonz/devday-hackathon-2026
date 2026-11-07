import type { ReactNode } from 'react'
import { Heading, Text } from './typography'

export function EmptyState({ title, description, icon }: { title: string; description?: string; icon: ReactNode }) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center gap-4 px-5 py-8 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-secondary text-secondary-foreground [&_svg]:size-5">{icon}</span>
      <div>
        <Heading level={3} size="card">{title}</Heading>
        {description ? <Text size="small" tone="muted" className="mt-2 max-w-xs">{description}</Text> : null}
      </div>
    </div>
  )
}
