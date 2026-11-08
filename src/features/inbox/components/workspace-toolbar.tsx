import { WorkspaceHeader, type WorkspaceBreadcrumb } from '@/components/ui/workspace-header'
import { NotificationsDrawer } from './notifications-drawer'

export function WorkspaceToolbar({ title, breadcrumbs, currentUser }: { title: string; breadcrumbs: WorkspaceBreadcrumb[]; currentUser: string }) {
  return <WorkspaceHeader title={title} breadcrumbs={breadcrumbs} actions={<NotificationsDrawer currentUser={currentUser} />} />
}
