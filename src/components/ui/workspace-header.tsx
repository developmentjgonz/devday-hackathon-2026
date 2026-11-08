import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router'
import { TextLink } from './text-link'
import { Heading, Text } from './typography'

export type WorkspaceBreadcrumb = { label: string; to: string }

type WorkspaceHeaderProps = {
  title: string
  breadcrumbs?: WorkspaceBreadcrumb[]
  actions?: ReactNode
}

/** The current breadcrumb is the workspace's single page heading. */
export function WorkspaceHeader({ title, breadcrumbs = [], actions }: WorkspaceHeaderProps) {
  return (
    <header aria-label="Workspace header" className="sticky top-[var(--workspace-header-offset,0px)] z-20 flex min-h-14 items-center justify-between gap-3 border-b bg-background px-6 sm:px-10 lg:px-12">
      <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
        <ol className="flex min-w-0 items-center gap-2">
          {breadcrumbs.map(({ label, to }) => (
            <li key={to} className="flex min-w-0 max-w-[40%] items-center gap-2">
              <TextLink render={<Link to={to} />} className="min-w-0">
                <Text render={<span />} size="small" weight="medium" tone="muted" className="truncate">{label}</Text>
              </TextLink>
              <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
            </li>
          ))}
          <li className="min-w-0" aria-current="page">
            <Heading id="workspace-page-title" level={1} size="compact" className="truncate">{title}</Heading>
          </li>
        </ol>
      </nav>
      {actions ? <div aria-label="Workspace actions" className="flex shrink-0 items-center gap-2 py-1.5">{actions}</div> : null}
    </header>
  )
}
