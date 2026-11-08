import type { ReactNode } from 'react'
import { useRouteLoaderData } from 'react-router'
import { NewReportButton } from '@/features/inbox/components/report-composer'
import { TaskEditor } from '@/features/tasks/components/task-editor'
import type { WorkspaceData } from '../../../../shared/types/directory'

export function RecordActions({ colonyId, catId, children }: { colonyId: string; catId?: string; children?: ReactNode }) {
  const { user } = useRouteLoaderData('workspace') as WorkspaceData
  return <div role="group" aria-label="Record actions" className="flex flex-wrap justify-end gap-2">
    {children}
    <TaskEditor currentUser={user.id} initialAssociation={catId ? { type: 'cat', id: catId } : { type: 'colony', id: colonyId }} />
    <NewReportButton colonyId={colonyId} catId={catId} />
  </div>
}
