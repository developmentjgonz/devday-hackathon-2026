import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { AppLayout } from '@/components/layout/app-layout'
import { OverviewPage } from '@/features/overview/pages/overview-page'
import { InboxScreen } from '@/features/inbox/components/inbox-screen'
import { MyTasksPage } from '@/features/tasks/pages/my-tasks-page'
import { inboxScenarioData, localInboxData } from '@/features/inbox/data/local-inbox'
import type { InboxData, ReportStatus } from '@/features/inbox/types'
import type { SessionUser } from '../../shared/types/auth'

const user: SessionUser = { id: 'storybook-member', name: 'Alex Morgan', email: 'alex@mews.test', phone: null, role: 'administrator', status: 'active' }
function InboxStory({ data = localInboxData, initialStatus = 'pending', initialReportId }: { data?: InboxData; initialStatus?: ReportStatus | 'all'; initialReportId?: string }) {
  const [router] = useState(() => createMemoryRouter([{ id: 'workspace', path: '/app', loader: () => user, element: <AppLayout inboxData={data} />, children: [
    { index: true, Component: OverviewPage, handle: { breadcrumb: 'Overview' } },
    { path: 'tasks', Component: MyTasksPage, handle: { breadcrumb: 'My Tasks' } },
    { path: 'reports', element: <InboxScreen currentUser={user.name} initialStatus={initialStatus} />, handle: { breadcrumb: 'Reports' } },
  ] }], { initialEntries: [initialReportId ? `/app/reports?report=${initialReportId}` : '/app/reports'] }))
  return <RouterProvider router={router} />
}
const meta = {
  title: 'Pages/Reports',
  component: InboxStory,
  parameters: { layout: 'fullscreen', docs: { description: { component: 'The actual inbox table, review drawer, and workspace toolbar, with 100 fictional local reports across review, waiting, and processed states. Focused inbox supplies the seven detailed interaction scenarios. The bell uses a standard Lucide icon and opens urgent reports. New report uses the same shared right-side drawer as review, with a scrolling form body and fixed header and submit actions. It accepts photos, audio, PDF, text, Word, and CSV attachments; up to five files of 10 MB each. Browser object URLs support local previews and downloads. No files or messages are uploaded or sent. Reports, tasks, and review state stay in the workspace provider until refresh; cat records and D1 are unchanged. Review drafts and unfinished question/task forms stay by report while the inbox screen is mounted. Photos have large inline previews and open in a wide dialog. Processed reports show saved read-only details. Review and follow-up actions remain separate; the finish and ask-for-details actions stay in the footer. Duplicate comparison shows the target message before linking. The example cat photo is a stock Unsplash image. Exercise table search and filtering, report matching, question/waiting, tasks, duplicate links, finish/reopen, keyboard access, attachment removal, close-button placement, and phone-width drawers. The Busy inbox story supplies thirty fictional reports to inspect table density.' } } },
} satisfies Meta<typeof InboxStory>
export default meta
type Story = StoryObj<typeof meta>
export const Review: Story = {}
export const FocusedInbox: Story = { args: { data: inboxScenarioData } }
export const ReportDrawer: Story = { args: { initialReportId: 'report-injury' } }
export const BusyInbox: Story = { args: { data: { ...localInboxData, reports: Array.from({ length: 30 }, (_, index) => ({ ...localInboxData.reports[index % 5]!, id: `busy-${index}`, title: `${localInboxData.reports[index % 5]!.title} · ${index + 1}`, possibleDuplicateOf: undefined, submittedAt: new Date(Date.parse('2026-11-07T10:00:00-05:00') - index * 20 * 60000).toISOString() })) } } }
export const WaitingForDetails: Story = { args: { initialStatus: 'waiting' } }
export const Processed: Story = { args: { initialStatus: 'processed' } }
export const Empty: Story = { args: { data: { ...localInboxData, reports: [] } } }

export const WaitingReportDrawer: Story = { args: { initialStatus: 'waiting', initialReportId: 'report-waiting' } }
export const ProcessedReportDrawer: Story = { args: { initialStatus: 'processed', initialReportId: 'report-earlier-sighting' } }
export const PossibleDuplicateDrawer: Story = { args: { initialReportId: 'report-sighting' } }
export const UnknownColonyDrawer: Story = { args: { initialReportId: 'report-location' } }
export const ReportWithCareTask: Story = { args: { initialReportId: 'report-injury', data: { ...localInboxData, reports: localInboxData.reports.map((report) => report.id === 'report-injury' ? { ...report, tasks: [{ id: 'care-check', title: 'Arrange a care check', owner: 'Sam Chen', due: '2026-11-08', status: 'open' }] } : report) } } }

export const AllReports: Story = { args: { initialStatus: 'all' } }
