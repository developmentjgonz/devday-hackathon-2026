import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { AppLayout } from '@/components/layout/app-layout'
import { OverviewPage } from '@/features/overview/pages/overview-page'
import { InboxPage } from '@/features/inbox/pages/inbox-page'
import { MyTasksPage } from '@/features/tasks/pages/my-tasks-page'
import { inboxScenarioData, localInboxData } from '@/features/inbox/data/local-inbox'
import type { InboxData, ReportTask } from '@/features/inbox/types'
import type { SessionUser } from '../../shared/types/auth'

const user: SessionUser = { id: 'storybook-member', name: 'Alex Morgan', email: 'alex@mews.test', phone: null, role: 'administrator', status: 'active' }
const focusedTasks: Record<string, ReportTask[]> = {
  'report-injury': [
    { id: 'care-check', title: 'Arrange a care check', owner: 'Alex Morgan', due: '2026-11-08', status: 'open' },
    { id: 'contact-vet', title: 'Contact the vet', owner: 'Sam Chen', due: '2026-11-08', status: 'open' },
  ],
  'report-kittens': [{ id: 'check-kittens', title: 'Confirm the kitten count', owner: 'Alex Morgan', due: '', status: 'open' }],
  'report-feeding': [{ id: 'restock', title: 'Restock the food container', owner: 'Alex Morgan', due: '2026-11-09', status: 'open' }],
  'report-waiting': [{ id: 'cover', title: 'Confirm evening cover', owner: 'Alex Morgan', due: '2026-11-07', status: 'completed' }],
}
const focusedData: InboxData = {
  ...inboxScenarioData,
  reports: inboxScenarioData.reports.map((report) => ({
    ...report,
    attachments: [],
    status: report.id === 'report-feeding' ? 'processed' : report.status,
    tasks: focusedTasks[report.id] ?? [],
  })),
}

function MyTasksStory({ data = localInboxData, currentUser = user.name }: { data?: InboxData; currentUser?: string }) {
  const [router] = useState(() => createMemoryRouter([{
    id: 'workspace', path: '/app', loader: () => ({ ...user, name: currentUser }), element: <AppLayout inboxData={data} />, children: [
      { index: true, Component: OverviewPage, handle: { breadcrumb: 'Overview' } },
      { path: 'tasks', Component: MyTasksPage, handle: { breadcrumb: 'My Tasks' } },
      { path: 'reports', Component: InboxPage, handle: { breadcrumb: 'Reports' } },
    ],
  }], { initialEntries: ['/app/tasks'] }))
  return <RouterProvider router={router} />
}

const meta = {
  title: 'Pages/My Tasks',
  component: MyTasksStory,
  parameters: {
    layout: 'fullscreen',
    docs: { description: { component: 'The production My Tasks page and shared workspace layout. The workspace loader supplies the signed-in member. Only report tasks whose owner matches that member name appear. Open tasks are the default; search matches task, report, and colony names. Due dates sort earliest first, with undated tasks last. Complete and Reopen update the report-linked task in the same local workspace provider used by Reports, with shared Sonner notifications. Report review status is independent. Links open /app/reports?report=<id> in the existing right-side drawer. State survives workspace navigation and resets on refresh or workspace exit. All records here are fictional local fixtures; no task API, database writes, messages, or live feed are connected. A future task API must use stable assignee IDs and enforce ownership on the server. Focused tasks covers open/completed tasks, another assignee, missing due dates, and a task on a processed report. Many tasks covers pagination. Long content covers narrow layouts. Empty has no tasks for the current member. The shared top bar remains the only page heading.' } },
  },
} satisfies Meta<typeof MyTasksStory>
export default meta
type Story = StoryObj<typeof meta>

export const MyTasks: Story = {}
export const FocusedTasks: Story = { args: { data: focusedData } }
export const DifferentAssignee: Story = { args: { data: focusedData, currentUser: 'Sam Chen' } }
export const Empty: Story = { args: { data: { ...inboxScenarioData, reports: inboxScenarioData.reports.map((report) => ({ ...report, tasks: [] })) } } }
export const ManyTasks: Story = { args: { data: {
  ...focusedData,
  reports: [{ ...focusedData.reports[0]!, tasks: Array.from({ length: 11 }, (_, index) => ({ id: `care-${index + 1}`, title: `Colony care task ${String(index + 1).padStart(2, '0')}`, owner: user.name, due: '2026-11-08', status: 'open' })) }],
} } }
export const LongContent: Story = { args: { data: {
  ...focusedData,
  colonies: [{ id: 'riverside', name: 'Riverside community garden behind the old railway station' }],
  reports: [{ ...focusedData.reports[0]!, title: 'Follow-up observation at the feeding station behind the community garden after the evening visit', tasks: [{ id: 'long-care', title: 'Check appetite, movement, shelter bedding, food supplies, and clean water during the next colony visit', owner: user.name, due: '2026-11-08', status: 'open' }] }],
} } }
