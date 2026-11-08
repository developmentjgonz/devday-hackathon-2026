import { Brand } from '@/components/brand'
import { WorkspaceNavigation } from '@/components/ui/workspace-navigation'
import type { SessionUser } from '../../../shared/types/auth'
import { WorkspaceAccount } from '@/features/auth/components/workspace-account'
import { MobileWorkspaceMenu } from './mobile-workspace-menu'

export function AppSidebar({ user }: { user: SessionUser }) {
  return (
    <aside className="sticky top-0 z-30 flex flex-col border-b bg-sidebar md:z-auto md:h-svh md:border-r md:border-b-0">
      <div className="flex items-center justify-between gap-4 px-4 py-1.5 md:px-6 md:py-7">
        <Brand to="/app" />
        <div className="md:hidden"><MobileWorkspaceMenu user={user} /></div>
      </div>
      <div className="hidden min-h-0 flex-1 overflow-y-auto md:flex md:flex-col"><WorkspaceNavigation showTeam={user.role === 'administrator'} /></div>
      <div className="hidden border-t p-3 md:block">
        <WorkspaceAccount user={user} />
      </div>
    </aside>
  )
}
