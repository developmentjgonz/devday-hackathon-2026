import { Cat, House, Inbox, LayoutDashboard, ListTodo, UsersRound } from 'lucide-react'
import { NavLink } from 'react-router'
import { Text } from './typography'
import { TextLink } from './text-link'

const items = [
  { to: '/app', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/app/colonies', label: 'Colonies', icon: House, end: false },
  { to: '/app/cats', label: 'Cats', icon: Cat, end: false },
  { to: '/app/reports', label: 'Reports', icon: Inbox, end: false },
  { to: '/app/tasks', label: 'My Tasks', icon: ListTodo, end: false },
]

export function WorkspaceNavigation({ showTeam = false }: { showTeam?: boolean }) {
  return (
    <nav aria-label="Workspace navigation" className="px-4 pb-4 md:flex-1 md:pt-5">
      <Text size="caption" weight="medium" tone="muted" className="mb-3 hidden px-3 md:block">Workspace</Text>
      <div className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
        {items.map(({ to, label, icon: Icon, end }) => (
          <TextLink
            key={to}
            variant="navigation"
            className="w-auto shrink-0 md:w-full"
            render={<NavLink to={to} end={end} />}
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            {label}
          </TextLink>
        ))}
        {showTeam ? <TextLink variant="navigation" className="w-auto shrink-0 md:w-full" render={<NavLink to="/app/team" />}>
          <UsersRound className="size-4 shrink-0" aria-hidden="true" />Team
        </TextLink> : null}
      </div>
    </nav>
  )
}
