import { LayoutDashboard } from 'lucide-react'
import { NavLink } from 'react-router'
import { Brand } from '@/components/brand'
import { cn } from '@/lib/utils'
import type { SessionUser } from '../../../shared/types/auth'
import { WorkspaceAccount } from '@/features/auth/components/workspace-account'

export function AppSidebar({ user }: { user: SessionUser }) {
  return (
    <aside className="flex flex-col border-b bg-sidebar md:sticky md:top-0 md:h-svh md:border-r md:border-b-0">
      <div className="flex items-center justify-between gap-4 px-6 py-5 md:py-7">
        <Brand to="/app" />
      </div>
      <nav aria-label="Workspace navigation" className="px-4 pb-4 md:flex-1 md:pt-5">
        <p className="mb-3 hidden px-3 text-xs font-medium text-muted-foreground md:block">Workspace</p>
        <NavLink
          to="/app"
          end
          className={({ isActive }) => cn(
            'flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring',
            isActive ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground' : 'text-muted-foreground hover:bg-sidebar-accent',
          )}
        >
          <LayoutDashboard className="size-4" aria-hidden="true" />
          Overview
        </NavLink>
      </nav>
      <div className="border-t p-3">
        <WorkspaceAccount user={user} />
      </div>
    </aside>
  )
}
