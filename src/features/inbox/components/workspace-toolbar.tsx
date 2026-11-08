import { useState } from 'react'
import { Bell } from 'lucide-react'
import { Link } from 'react-router'
import { EmptyState } from '@/components/ui/empty-state'
import { NotificationButton } from '@/components/ui/notification-button'
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from '@/components/ui/popover'
import { RecordButton } from '@/components/ui/record-button'
import { Text } from '@/components/ui/typography'
import { WorkspaceHeader, type WorkspaceBreadcrumb } from '@/components/ui/workspace-header'
import { useInbox } from '../inbox-context'

export function WorkspaceToolbar({ title, breadcrumbs }: { title: string; breadcrumbs: WorkspaceBreadcrumb[] }) {
  const { data, reports } = useInbox()
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const urgentReports = reports.filter((report) => report.urgent && report.status !== 'processed')

  return <WorkspaceHeader title={title} breadcrumbs={breadcrumbs} actions={
    <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
      <PopoverTrigger render={<NotificationButton count={urgentReports.length} label="Urgent reports" />} />
      <PopoverContent side="bottom" align="end">
        <div className="px-3 pt-3 pb-2"><PopoverTitle>Urgent reports</PopoverTitle><Text size="caption" tone="muted" className="mt-1">Reports that need prompt review.</Text></div>
        {urgentReports.length ? <div className="grid max-h-80 gap-1 overflow-y-auto">{urgentReports.map((report) => <RecordButton key={report.id} title={report.title} description={data.colonies.find((colony) => colony.id === report.colonyId)?.name ?? 'Colony unknown'} render={<Link to={`/app/reports?report=${encodeURIComponent(report.id)}`} />} onClick={() => setNotificationsOpen(false)} />)}</div> : <EmptyState icon={<Bell />} title="No urgent reports" />}
      </PopoverContent>
    </Popover>
  } />
}
