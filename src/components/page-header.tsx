import type { ReactNode } from 'react'
import { Heading, Text } from './ui/typography'

type PageHeaderProps = {
  title: string
  description: string
  children?: ReactNode
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div>
        <Heading level={1} size="title">
          {title}
        </Heading>
        <Text size="small" tone="muted" className="mt-2 max-w-xl">
          {description}
        </Text>
      </div>
      {children}
    </div>
  )
}
