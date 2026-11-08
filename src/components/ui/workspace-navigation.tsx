import { Bot, Cat, ChartNoAxesColumn, House, Inbox, LayoutDashboard, ListTodo, Newspaper, Settings2, UsersRound } from 'lucide-react'
import { NavLink } from 'react-router'
import type { MouseEvent } from 'react'
import { isPlainNavigation } from '@/lib/navigation'
import { TextLink } from './text-link'

const items = [
  { to: '/app', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/app/tasks', label: 'My Tasks', icon: ListTodo, end: false },
  { to: '/app/reports', label: 'Reports', icon: Inbox, end: false },
  { to: '/app/colonies', label: 'Colonies', icon: House, end: false },
  { to: '/app/cats', label: 'Cats', icon: Cat, end: false },
]

export function WorkspaceNavigation({ showTeam = false, showAutomation = false, onNavigate }: { showTeam?: boolean; showAutomation?: boolean; onNavigate?: (to: string) => void }) {
  function followLink(event: MouseEvent<HTMLAnchorElement>, to: string) {
    if (isPlainNavigation(event)) onNavigate?.(to)
  }

  return (
    <nav aria-label="Workspace navigation" className="px-4 pb-4 md:flex-1 md:pt-5">
      <div className="flex flex-col gap-1">
        {items.map(({ to, label, icon: Icon, end }) => (
          <TextLink
            key={to}
            variant="navigation"
            onClick={(event) => followLink(event, to)}
            render={<NavLink to={to} end={end} />}
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            {label}
          </TextLink>
        ))}
        {showTeam ? <>
          <TextLink variant="navigation" onClick={(event) => followLink(event, '/app/statistics')} render={<NavLink to="/app/statistics" />}>
            <ChartNoAxesColumn className="size-4 shrink-0" aria-hidden="true" />Statistics &amp; exports
          </TextLink>
          {showAutomation ? <TextLink variant="navigation" onClick={(event) => followLink(event, '/app/automation')} render={<NavLink to="/app/automation" />}><Bot className="size-4 shrink-0" aria-hidden="true" />Automation</TextLink> : null}
          <TextLink variant="navigation" onClick={(event) => followLink(event, '/app/community')} render={<NavLink to="/app/community" />}>
            <Newspaper className="size-4 shrink-0" aria-hidden="true" />Community board
          </TextLink>
          <TextLink variant="navigation" onClick={(event) => followLink(event, '/app/team-tasks')} render={<NavLink to="/app/team-tasks" />}>
            <ListTodo className="size-4 shrink-0" aria-hidden="true" />Team Tasks
          </TextLink>
          <TextLink variant="navigation" onClick={(event) => followLink(event, '/app/team')} render={<NavLink to="/app/team" />}>
            <UsersRound className="size-4 shrink-0" aria-hidden="true" />Team
          </TextLink>
          <TextLink variant="navigation" onClick={(event) => followLink(event, '/app/configuration')} render={<NavLink to="/app/configuration" />}>
            <Settings2 className="size-4 shrink-0" aria-hidden="true" />Configuration
          </TextLink>
        </> : null}
      </div>
    </nav>
  )
}
