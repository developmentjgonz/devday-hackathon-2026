import { Inbox, LayoutDashboard } from 'lucide-react'
import { NavLink } from 'react-router'
import { Text } from './typography'
import { TextLink } from './text-link'

const items = [
  { to: '/app', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/app/inbox', label: 'Inbox', icon: Inbox, end: false },
]

export function WorkspaceNavigation() {
  return (
    <nav aria-label="Workspace navigation" className="px-4 pb-4 md:flex-1 md:pt-5">
      <Text size="caption" weight="medium" tone="muted" className="mb-3 hidden px-3 md:block">Workspace</Text>
      <div className="flex flex-col gap-1">
        {items.map(({ to, label, icon: Icon, end }) => (
          <TextLink
            key={to}
            variant="navigation"
            render={<NavLink to={to} end={end} />}
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            {label}
          </TextLink>
        ))}
      </div>
    </nav>
  )
}
