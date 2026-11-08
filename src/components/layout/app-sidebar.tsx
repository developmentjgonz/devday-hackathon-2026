import { Brand } from '@/components/brand'
import { WorkspaceNavigation } from '@/components/ui/workspace-navigation'
import type { SessionUser } from '../../../shared/types/auth'
import { WorkspaceAccount } from '@/features/auth/components/workspace-account'

export function AppSidebar({ user }: { user: SessionUser }) {
  return (
    <aside className="flex flex-col border-b bg-sidebar md:sticky md:top-0 md:h-svh md:border-r md:border-b-0">
      <div className="flex items-center justify-between gap-4 px-6 py-3 md:py-7">
        <Brand to="/app" />
        <div className="w-48 min-w-0 md:hidden"><WorkspaceAccount user={user} /></div>
      </div>
      <WorkspaceNavigation showTeam={user.role === 'administrator'} />
      <div className="hidden border-t p-3 md:block">
        <WorkspaceAccount user={user} />
      </div>
    </aside>
  )
}
