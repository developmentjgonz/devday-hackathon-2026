import { Brand } from '@/components/brand'
import { WorkspaceNavigation } from '@/components/ui/workspace-navigation'
import type { SessionUser } from '../../../shared/types/auth'
import { WorkspaceAccount } from '@/features/auth/components/workspace-account'

export function AppSidebar({ user, showAutomation = false }: { user: SessionUser; showAutomation?: boolean }) {
  return (
    <aside className="sticky top-0 hidden h-dvh flex-col border-r bg-sidebar md:flex">
      <div className="flex items-center justify-between gap-4 px-4 py-1.5 md:px-6 md:py-7">
        <Brand to="/app" />
      </div>
      <div className="hidden min-h-0 flex-1 overflow-y-auto md:flex md:flex-col"><WorkspaceNavigation showTeam={user.role === 'administrator'} showAutomation={showAutomation} /></div>
      <div className="hidden border-t p-3 md:block">
        <WorkspaceAccount user={user} />
      </div>
    </aside>
  )
}
