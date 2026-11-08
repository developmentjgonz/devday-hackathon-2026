import { Brand } from '@/components/brand'
import { WorkspaceNavigation } from '@/components/ui/workspace-navigation'
import type { SessionUser } from '../../../shared/types/auth'
import { WorkspaceAccount } from '@/features/auth/components/workspace-account'

export function AppSidebar({ user }: { user: SessionUser }) {
  return (
    <aside className="flex flex-col border-b bg-sidebar md:sticky md:top-0 md:h-svh md:border-r md:border-b-0">
      <div className="flex items-center justify-between gap-4 px-6 py-5 md:py-7">
        <Brand to="/app" />
      </div>
      <WorkspaceNavigation />
      <div className="border-t p-3">
        <WorkspaceAccount user={user} />
      </div>
    </aside>
  )
}
