import type { ReactNode } from 'react'

type PageHeaderProps = {
  title: string
  description: string
  children?: ReactNode
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  )
}
