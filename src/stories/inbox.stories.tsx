import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { AppLayout } from '@/components/layout/app-layout'
import { OverviewPage } from '@/features/overview/pages/overview-page'
import { InboxScreen } from '@/features/inbox/components/inbox-screen'
import { localInboxData } from '@/features/inbox/data/local-inbox'
import type { InboxData, ReviewStatus } from '@/features/inbox/types'
import type { SessionUser } from '../../shared/types/auth'

const user: SessionUser = { id: 'storybook-member', name: 'Alex Morgan', email: 'alex@mews.test', phone: null, role: 'administrator', status: 'active' }
function InboxStory({ data = localInboxData, initialView = 'review', initialReportId }: { data?: InboxData; initialView?: ReviewStatus; initialReportId?: string }) {
  const [router] = useState(() => createMemoryRouter([{ id: 'workspace', path: '/app', loader: () => user, element: <AppLayout inboxData={data} />, children: [
    { index: true, Component: OverviewPage, handle: { breadcrumb: 'Overview' } },
    { path: 'inbox', element: <InboxScreen currentUser={user.name} initialView={initialView} />, handle: { breadcrumb: 'Inbox' } },
  ] }], { initialEntries: [initialReportId ? `/app/inbox?report=${initialReportId}` : '/app/inbox'] }))
  return <RouterProvider router={router} />
}
const meta = {
  title: 'Pages/Inbox',
  component: InboxStory,
  parameters: { layout: 'fullscreen', docs: { description: { component: 'The actual inbox table, review drawer, and workspace toolbar, with fictional local reports. The bell uses a standard Lucide icon and opens urgent reports. New report uses the same shared right-side drawer as review, with a scrolling form body and fixed header and submit actions. It accepts photos, audio, PDF, text, Word, and CSV attachments; up to five files of 10 MB each. Browser object URLs support local previews and downloads. No files or messages are uploaded or sent. Reports, tasks, and review state stay in the workspace provider until refresh; cat records and D1 are unchanged. Review drafts stay while the inbox screen is mounted. The example cat photo is a stock Unsplash image. Exercise table search and filtering, report matching, question/waiting, tasks, duplicate links, finish/reopen, keyboard access, attachment removal, close-button placement, and phone-width drawers. The Busy inbox story supplies thirty fictional reports to inspect table density.' } } },
} satisfies Meta<typeof InboxStory>
export default meta
type Story = StoryObj<typeof meta>
export const Review: Story = {}
export const ReportDrawer: Story = { args: { initialReportId: 'report-injury' } }
export const BusyInbox: Story = { args: { data: { ...localInboxData, reports: Array.from({ length: 30 }, (_, index) => ({ ...localInboxData.reports[index % 5]!, id: `busy-${index}`, title: `${localInboxData.reports[index % 5]!.title} · ${index + 1}`, possibleDuplicateOf: undefined, submittedAt: new Date(Date.parse('2026-11-07T10:00:00-05:00') - index * 20 * 60000).toISOString() })) } } }
export const WaitingForDetails: Story = { args: { initialView: 'waiting' } }
export const Processed: Story = { args: { initialView: 'processed' } }
export const Empty: Story = { args: { data: { ...localInboxData, reports: [] } } }
