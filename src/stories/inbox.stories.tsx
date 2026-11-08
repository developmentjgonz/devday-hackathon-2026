import { userPortraitUrl } from '../../seeds/user-portraits'
import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { AppLayout } from '@/components/layout/app-layout'
import { OverviewPage } from '@/features/overview/pages/overview-page'
import { InboxScreen } from '@/features/inbox/components/inbox-screen'
import { MyTasksPage } from '@/features/tasks/pages/my-tasks-page'
import { TeamTasksPage } from '@/features/tasks/pages/team-tasks-page'
import { TaskPage } from '@/features/tasks/pages/task-page'
import { inboxScenarioData, localInboxData } from '@/features/inbox/data/local-inbox'
import type { InboxData, ReportStatus } from '@/features/inbox/types'
import type { SessionUser } from '../../shared/types/auth'
import { storyDirectoryStore, storyWorkspace } from './fixtures/directory-store'
import { storyWorkspaceStore } from './fixtures/workspace-store'

const user: SessionUser = { id: 'storybook-member', name: 'Alex Morgan', email: 'alex@mews.test', phone: null, avatarUrl: userPortraitUrl('Alex Morgan'), role: 'administrator', status: 'active' }
function InboxStory({ data = localInboxData, initialStatus = 'pending', initialReportId, refreshScenario, analysisScenario, aiEnabled = false, currentUserUnavailable = false }: { data?: InboxData; initialStatus?: ReportStatus | 'all'; initialReportId?: string; refreshScenario?: 'incoming' | 'stale'; analysisScenario?: 'empty' | 'error' | 'delayed' | 'retry' | 'approval-error' | 'attachment-error'; aiEnabled?: boolean; currentUserUnavailable?: boolean }) {
  const [router] = useState(() => {
    const workspace = storyWorkspace(user, data)
    if (currentUserUnavailable) workspace.workspace.members = workspace.workspace.members.filter((member) => member.id !== user.id)
    workspace.workspace.aiAnalysisEnabled = aiEnabled
    const store = storyWorkspaceStore(user, workspace.workspace)
    const analyze = store.analyzeReport
    if (analysisScenario === 'empty') store.analyzeReport = async () => ({ tasks: [], cats: [], colonies: [], duplicates: [], skippedAttachments: [] })
    if (analysisScenario === 'error') store.analyzeReport = async () => { throw new Error('Report analysis is unavailable. Try again.') }
    if (analysisScenario === 'delayed') store.analyzeReport = async (id, signal) => { await new Promise((resolve) => setTimeout(resolve, 800)); return analyze(id, signal) }
    if (analysisScenario === 'attachment-error') store.analyzeReport = async (id, signal) => ({ ...await analyze(id, signal), skippedAttachments: [{ name: 'cat-sighting.jpg', reason: 'The file could not be read.' }] })
    if (analysisScenario === 'retry') {
      let failed = false
      store.analyzeReport = async (id, signal) => { if (!failed) { failed = true; throw new Error('Report analysis is unavailable. Try again.') }; return analyze(id, signal) }
    }
    if (analysisScenario === 'approval-error') {
      let failed = false
      const createTask = store.createTask
      store.createTask = async (input) => { if (!failed) { failed = true; throw new Error('Could not create the task. Try again.') }; return createTask(input) }
    }
    const getSnapshot = store.getSnapshot
    let receivedReport = false
    if (refreshScenario) store.getSnapshot = async (signal) => {
      if (refreshScenario === 'incoming' && !receivedReport) {
        receivedReport = true
        await store.createReport({ title: 'New feeding update', message: 'Fresh water is available.', colonyId: 'canal', catId: '', urgent: false }, [])
      }
      const snapshot = await getSnapshot(signal)
      if (refreshScenario === 'stale') await new Promise((resolve) => setTimeout(resolve, 800))
      return snapshot
    }
    return createMemoryRouter([{ id: 'workspace', path: '/app', loader: () => workspace, element: <AppLayout directoryStore={storyDirectoryStore} workspaceStore={store} />, children: [
      { index: true, Component: OverviewPage, handle: { breadcrumb: 'Overview' } },
      { path: 'tasks', handle: { breadcrumb: 'My Tasks' }, children: [{ index: true, Component: MyTasksPage }, { path: ':taskId', Component: TaskPage, handle: { breadcrumb: 'Task' } }] },
      { path: 'team-tasks', Component: TeamTasksPage, handle: { breadcrumb: 'Team Tasks' } },
      { path: 'reports/:reportId?', element: <InboxScreen initialStatus={initialStatus} />, handle: { breadcrumb: 'Reports' } },
    ] }], { initialEntries: [initialReportId ? `/app/reports/${encodeURIComponent(initialReportId)}` : '/app/reports'] })
  })
  return <RouterProvider router={router} />
}
const meta = {
  title: 'Pages/Reports',
  component: InboxStory,
  parameters: { layout: 'fullscreen', docs: { description: { component: 'Reports use a compact phone feed and a desktop table, with a review drawer and one sticky workspace header. Both use the same search, filters, and sorting. The phone feed appends 20 local rows at a time. The stories use 100 fictional local reports across review, waiting, and processed states. Focused inbox supplies the seven detailed interaction scenarios. New report uses the same shared right-side drawer as review, with a scrolling form body and fixed title and submit actions. Colony and Cat fields scroll with the form. Review shows the original report before AI suggestions and places matching fields in Review details. It accepts photos, audio, PDF, text, Word, and CSV attachments; up to five files of 10 MB each. Browser object URLs support local previews and downloads. No files or messages are uploaded or sent. Storybook keeps reports, tasks, and review state in an isolated in-memory store; the application saves them through its API. Review drafts and unfinished question/task forms stay by report while the inbox screen is mounted. Linked tasks can be created, edited, completed, and reopened in the report drawer, including for reviewed reports. Photos have large inline previews and open in a wide dialog. Reviewed reports show saved read-only review details. Review and follow-up actions remain separate; the finish and ask-for-details actions stay in the footer. Duplicate comparison shows the target message before linking. The example cat photo is a stock Unsplash image. Exercise search and filtering on phones and desktop, report matching, question/waiting, tasks, duplicate links, finish/reopen, keyboard access, attachment removal, close-button placement, and phone-width drawers. The Busy inbox story supplies thirty fictional reports to inspect list density.' } } },
} satisfies Meta<typeof InboxStory>
export default meta
type Story = StoryObj<typeof meta>
export const Review: Story = {}
export const FocusedInbox: Story = { args: { data: inboxScenarioData } }
export const ReportDrawer: Story = { args: { initialReportId: 'report-injury' } }
export const CommunityReportWithContact: Story = {
  args: { initialReportId: 'report-injury', data: { ...localInboxData, reports: localInboxData.reports.map((report) => report.id === 'report-injury'
    ? { ...report, reporter: 'Community sender', anonymous: true, contact: { phone: '+1 (305) 555-0123', email: 'sender@example.test', consent: true, consentedAt: report.submittedAt } } : report) } },
  parameters: { docs: { description: { story: 'A public sender gave permission for follow-up contact. The review shows phone and email links. Follow-up takes place outside Mews. Contact details and permission are fictional.' } } },
}
export const LongReportDrawer: Story = { args: { initialReportId: 'report-injury', data: { ...localInboxData, reports: localInboxData.reports.map((report) => report.id === 'report-injury' ? { ...report, title: 'A very long report title about a cat that may need care near the feeding station and a follow-up visit from a member of the local colony team' } : report) } } }
export const AiSuggestions: Story = { args: { initialReportId: 'report-injury', aiEnabled: true }, parameters: { docs: { description: { story: 'Opening the report automatically prepares suggestions for a task, cat, and colony. In the application, this calls OpenAI; Storybook uses fictional in-memory results.' } } } }
export const AiDuplicateSuggestions: Story = { args: { initialReportId: 'report-sighting', aiEnabled: true }, parameters: { docs: { description: { story: 'A possible duplicate opens a comparison with a searchable list of eligible reports. The AI result is fictional.' } } } }
export const AiAttachmentError: Story = { args: { initialReportId: 'report-injury', aiEnabled: true, analysisScenario: 'attachment-error' }, parameters: { docs: { description: { story: 'The review identifies any attachment that analysis could not read.' } } } }
export const AiSuggestionsWithUnavailableAssignee: Story = { args: { initialReportId: 'report-injury', aiEnabled: true, currentUserUnavailable: true } }
export const NoAiSuggestions: Story = { args: { initialReportId: 'report-injury', analysisScenario: 'empty', aiEnabled: true } }
export const AiAnalysisError: Story = { args: { initialReportId: 'report-injury', analysisScenario: 'error', aiEnabled: true } }
export const AiSuggestionsLoading: Story = { args: { initialReportId: 'report-injury', analysisScenario: 'delayed', aiEnabled: true } }
export const AiAnalysisRetry: Story = { args: { initialReportId: 'report-injury', analysisScenario: 'retry', aiEnabled: true } }
export const AiApprovalRetry: Story = { args: { initialReportId: 'report-injury', analysisScenario: 'approval-error', aiEnabled: true } }
export const BusyInbox: Story = { args: { data: { ...localInboxData, reports: Array.from({ length: 30 }, (_, index) => ({ ...localInboxData.reports[index % 5]!, id: `busy-${index}`, title: `${localInboxData.reports[index % 5]!.title} · ${index + 1}`, possibleDuplicateOf: undefined, submittedAt: new Date(Date.parse('2026-11-07T10:00:00-05:00') - index * 20 * 60000).toISOString() })) } } }
export const WaitingForDetails: Story = { args: { initialStatus: 'waiting' } }
export const Processed: Story = { args: { initialStatus: 'processed' } }
export const Empty: Story = { args: { data: { ...localInboxData, reports: [] } } }

export const WaitingReportDrawer: Story = { args: { initialStatus: 'waiting', initialReportId: 'report-waiting' } }
export const ProcessedReportDrawer: Story = { args: { initialStatus: 'processed', initialReportId: 'report-earlier-sighting' } }
export const PossibleDuplicateDrawer: Story = { args: { initialReportId: 'report-sighting' } }
export const UnknownColonyDrawer: Story = { args: { initialReportId: 'report-location' } }
export const ReportWithCareTask: Story = { args: { initialReportId: 'report-injury', data: { ...localInboxData, tasks: [...localInboxData.tasks, { id: 'care-check', reportId: 'report-injury', title: 'Arrange a care check', owner: 'Sam Chen', ownerId: 'story:Sam Chen', due: '2026-11-08', status: 'open', associations: [] }] } } }

export const AllReports: Story = { args: { initialStatus: 'all' } }

export const IncomingReport: Story = { args: { data: { ...inboxScenarioData, reports: [] }, refreshScenario: 'incoming' } }
export const StaleRefresh: Story = { args: { data: inboxScenarioData, refreshScenario: 'stale' } }
