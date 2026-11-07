import { ArrowLeft, LayoutDashboard } from 'lucide-react'
import { Link, NavLink } from 'react-router'
import { Brand } from '@/components/brand'
import { cn } from '@/lib/utils'

export function AppSidebar() {
  return (
    <aside className="flex flex-col border-b bg-sidebar md:sticky md:top-0 md:h-svh md:border-r md:border-b-0">
      <div className="flex items-center justify-between gap-4 px-6 py-6 md:py-8">
        <Brand to="/app" />
        <Link to="/" className="rounded-md p-2 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring md:hidden" aria-label="Back to website">
          <ArrowLeft className="size-4" aria-hidden="true" />
        </Link>
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
      <div className="hidden border-t p-4 md:block">
        <Link to="/" className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm text-muted-foreground outline-none hover:bg-sidebar-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to website
        </Link>
      </div>
    </aside>
  )
}
