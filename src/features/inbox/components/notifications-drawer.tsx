import { useRef, useState } from 'react'
import { Bell, CircleAlert } from 'lucide-react'
import { Link } from 'react-router'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Drawer, DrawerBody, DrawerContent, DrawerHeader } from '@/components/ui/drawer'
import { EmptyState } from '@/components/ui/empty-state'
import { LoadingIndicator } from '@/components/ui/loading-indicator'
import { NotificationButton } from '@/components/ui/notification-button'
import { Heading, Text } from '@/components/ui/typography'
import { formatReportTime } from '@/features/colonies/directory-data'
import { workspaceDate } from '@/features/overview/progress-data'
import { formatTaskDue } from '@/features/tasks/task-data'
import { useInbox } from '../inbox-context'
import { reportStatusLabels, type InboxReport } from '../types'

export function NotificationsDrawer({ currentUser }: { currentUser: string }) {
  const { data, reports, tasks, markReports, refreshWorkspace, refreshingWorkspace, workspaceRefreshFailed } = useInbox()
  const [open, setOpen] = useState(false)
  const [marking, setMarking] = useState<string | null>(null)
  const [markError, setMarkError] = useState('')
  const [markNotice, setMarkNotice] = useState('')
  const drawerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const handoff = useRef(false)
  const today = workspaceDate()
  const urgentReports = reports.filter((report) => report.urgent && report.status !== 'processed')
    .sort((a, b) => Date.parse(b.submittedAt) - Date.parse(a.submittedAt))
  const unreadReports = reports.filter((report) => report.unread && !(report.urgent && report.status !== 'processed'))
    .sort((a, b) => Date.parse(b.submittedAt) - Date.parse(a.submittedAt))
  const dueTasks = tasks.filter((task) => task.ownerId === currentUser && task.status === 'open' && task.due && task.due <= today)
    .sort((a, b) => a.due.localeCompare(b.due) || a.title.localeCompare(b.title) || a.id.localeCompare(b.id))
  const unreadIds = reports.filter((report) => report.unread).map((report) => report.id)
  const count = urgentReports.length + unreadReports.length + dueTasks.length
  const colonies = new Map(data.colonies.map((colony) => [colony.id, colony.name]))

  function changeOpen(next: boolean) {
    if (next) {
      handoff.current = false
      setMarkError('')
      setMarkNotice('')
      void refreshWorkspace()
    }
    setOpen(next)
  }

  function openRecord() {
    handoff.current = true
    setOpen(false)
  }

  async function markRead(ids: string[], key: string) {
    if (marking || !ids.length) return
    setMarking(key)
    setMarkError('')
    setMarkNotice('')
    let completed = 0
    try {
      // The API accepts at most 100 IDs per request. Completed batches stay read if a later one fails.
      for (let offset = 0; offset < ids.length; offset += 100) {
        const batch = ids.slice(offset, offset + 100)
        await markReports(batch, false)
        completed += batch.length
      }
      setMarkNotice(`${completed} ${completed === 1 ? 'report' : 'reports'} marked as read.`)
      if (drawerRef.current?.hasAttribute('data-open')) drawerRef.current.focus({ preventScroll: true })
    } catch {
      setMarkError(completed ? `${completed} reports marked as read. Could not update the rest. Try again.` : `Could not mark ${ids.length === 1 ? 'the report' : 'all reports'} as read. Try again.`)
    } finally { setMarking(null) }
  }

  function reportList(items: InboxReport[]) {
    return <ul className="grid list-none gap-3 p-0">{items.map((report) => <li key={report.id} className="space-y-1">
      <Button variant="selection" size="content" className="w-full min-w-0" render={<Link to={`/app/reports?report=${encodeURIComponent(report.id)}`} />} onClick={openRecord}>
        <span className="grid min-w-0 gap-1">
          <Text render={<span />} size="small" weight="semibold" className="wrap-anywhere">{report.title}</Text>
          <Text render={<span />} size="caption" tone="muted" className="wrap-anywhere">{colonies.get(report.colonyId) ?? 'Colony unknown'} · {report.reporter} · {formatReportTime(report.submittedAt)}</Text>
          <Text render={<span />} size="caption" tone={report.urgent && report.status !== 'processed' ? 'danger' : 'muted'}>{report.urgent && report.status !== 'processed' ? 'Urgent · ' : ''}{reportStatusLabels[report.status]}{report.unread ? ' · Unread' : ' · Read'}</Text>
        </span>
      </Button>
      {report.unread ? <div className="flex justify-end"><Button variant="ghost" size="sm" aria-label={`Mark ${report.title} as read`} loading={marking === report.id} disabled={Boolean(marking)} onClick={() => void markRead([report.id], report.id)}>Mark as read</Button></div> : null}
    </li>)}</ul>
  }

  return <Drawer open={open} onOpenChange={changeOpen}>
    <DialogTrigger render={<NotificationButton ref={triggerRef} count={count} />} />
    <DrawerContent ref={drawerRef} closeLabel="Close notifications" motion={handoff.current ? 'none' : 'default'} finalFocus={() => handoff.current ? false : triggerRef.current}>
      <DrawerHeader>
        <DialogTitle>Notifications</DialogTitle>
        <DialogDescription>Urgent reports, tasks due, and unread reports.</DialogDescription>
      </DrawerHeader>
      <DrawerBody>
        <Text role="status" size="small" tone="muted" className={markNotice ? undefined : 'sr-only'}>{markNotice}</Text>
        {workspaceRefreshFailed && count > 0 ? <div className="space-y-2"><Alert>Could not refresh notifications. The list may be out of date.</Alert><Button variant="outline" size="sm" loading={refreshingWorkspace} onClick={() => void refreshWorkspace()}>Try again</Button></div> : null}
        {markError ? <Alert>{markError}</Alert> : null}
        {unreadIds.length ? <div className="flex justify-end"><Button variant="outline" size="sm" loading={marking === 'all'} disabled={Boolean(marking)} onClick={() => void markRead(unreadIds, 'all')}>Mark all reports as read</Button></div> : null}
        {urgentReports.length ? <section aria-labelledby="notification-urgent" className="space-y-3">
          <div className="space-y-1"><Heading id="notification-urgent" level={2} size="card">Urgent reports</Heading><Text size="caption" tone="muted">These stay here until the review is complete.</Text></div>
          {reportList(urgentReports)}
        </section> : null}
        {dueTasks.length ? <section aria-labelledby="notification-tasks" className="space-y-3">
          <Heading id="notification-tasks" level={2} size="card">Your tasks due</Heading>
          <ul className="grid list-none gap-3 p-0">{dueTasks.map((task) => <li key={task.id}>
            <Button variant="selection" size="content" className="w-full min-w-0" render={<Link to={`/app/tasks?task=${encodeURIComponent(task.id)}`} />} onClick={openRecord}>
              <span className="grid min-w-0 gap-1"><Text render={<span />} size="small" weight="semibold" className="wrap-anywhere">{task.title}</Text><Text render={<span />} size="caption" tone={task.due < today ? 'danger' : 'muted'}>{task.due < today ? 'Overdue' : 'Due today'} · {formatTaskDue(task.due)}</Text></span>
            </Button>
          </li>)}</ul>
        </section> : null}
        {unreadReports.length ? <section aria-labelledby="notification-unread" className="space-y-3"><Heading id="notification-unread" level={2} size="card">Unread reports</Heading>{reportList(unreadReports)}</section> : null}
        {!count && workspaceRefreshFailed ? <EmptyState icon={<CircleAlert />} tone="danger" title="Notifications unavailable" description="Could not refresh notifications." action={<Button variant="outline" loading={refreshingWorkspace} onClick={() => void refreshWorkspace()}>Try again</Button>} /> :
          !count && refreshingWorkspace ? <div className="flex min-h-48 items-center justify-center"><LoadingIndicator label="Refreshing notifications" /></div> :
          !count ? <EmptyState icon={<Bell />} title="No notifications" description="Urgent reports, unread reports, and tasks due will appear here." /> : null}
      </DrawerBody>
    </DrawerContent>
  </Drawer>
}
