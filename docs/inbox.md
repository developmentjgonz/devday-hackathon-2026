# Inbox interaction design

Open `/app/reports` with an approved local account, or **Pages → Reports → Review** in Storybook. The route and stories render the same `InboxScreen` and shared workspace layout.

## Current scope

Local setup seeds 100 fictional reports across three fictional colonies and cats. The Focused inbox story has seven interaction scenarios. No real reports, messages, locations, or contacts are used in the seed.

Reports, questions, tasks, duplicate links, per-user read state, and history are saved in D1. Report attachments use private R2 storage and authenticated reads. These saved records survive refresh. Unfinished review and follow-up drafts stay only while the screen is mounted. Questions appear in the saved report conversation; outbound delivery is not implemented. Completing a review does not change the cat or colony record.

Shared types and validation schemas define the API contract. `migrations/0010_reports_and_tasks.sql` defines the report and task tables. The report and task APIs require an active account and same-origin writes.

## Behavior

- Status is a toolbar filter with **All reports**, **Pending**, **Waiting for details**, and **Processed**. The initial status is Pending. Clear filters clears search and colony and selects All reports. The table footer shows the current result count. Read state is independent of review state. Reports become read when their drawer is opened.
- Search matches titles, original messages, reporters, colonies, and linked cat names. A separate colony filter includes unknown locations. Both filters combine with the current review view. Clear filters recovers from no matches.
- Urgent reports appear first; older submissions come first within each priority group.
- Sortable headers let reviewers order reports by title, colony, reporter, or received time. Clearing the sort restores urgent-first order. Urgency appears beside the report category; the Status column displays the report workflow status. Urgency and duplicate suggestions remain separate.
- The shared TanStack table has 10, 25, and 50 rows per page. Changing filters or sorting starts at the first page. Opening a report or changing read state preserves the page. Removing the last report from a page returns to the last available page.
- Checkboxes select reports without opening them. Select this page affects only the displayed page; selections can span pages in the current filtered view. Mark read or Mark unread updates the selected reports. Changing a filter or view clears the selection.
- The original message and attachments remain unchanged. Review drafts can change colony, cat match, care note, and urgency. Changing colony clears the cat match so a cat from another colony cannot remain attached.
- Unknown cat identity is allowed. A colony and nonempty care note are required to finish a normal review. Unclear locations can wait for more information.
- Asking a question adds it to the saved conversation and moves the report to Waiting for details. Its draft stays available while the screen is mounted.
- A care task requires a title and team member. Its due date is optional. Tasks remain open when their report is processed or reopened. A confirmation appears beside the linked tasks and is announced to assistive technology; it does not cover the drawer actions.
- Duplicate linking preserves both reports and moves the duplicate to Processed. Targets belong to the same known colony and cannot already be duplicates. A report with incoming duplicate links cannot itself be linked as a duplicate; this prevents cycles. Cat records are never merged by this action.
- Finishing a review confirms that the report can be found under Processed. Processed reports show saved details as readable text, history, and open linked tasks. Unsaved duplicate-review drafts do not appear in the saved summary. Reopen returns a report to Pending and restores its review draft when one exists.
- Review drafts survive switching reports, filters, and tabs while the screen remains mounted.

The main view uses the shared TanStack `DataTable` over a semantic HTML table. Desktop columns show report, colony/cat, review state, reporter, and received time. Smaller widths hide secondary columns and keep colony and review information in each report cell. Read titles use normal weight; unread titles use stronger weight and a dot in a reserved slot. Multi-page tables keep a stable viewport height with a sticky column header. Clicking a row opens a right-side modal drawer; a native title button gives each row keyboard access. Checkboxes act independently. The drawer fills phone screens. Its body scrolls while the header and save action remain visible. Closing returns focus to the row, or to the table if processing removed that row. The drawer receives focus at its top so opening it does not jump to an attachment. Nested task, question, and photo dialogs use the shared focus handling and Escape dismissal. Closing a nested dialog returns focus to its own action; a second Escape closes the drawer.

## Shared controls

- `ViewTabs`: controlled Base UI tabs with optional counts, active styling, arrow-key activation, and the current panel as children.
- `SelectField`: native select with the shared input height, typography, corners, and focus style. The browser supplies the platform picker on phones.
- `Table`, `TableHead`, `TableRow`, `TableCell`, and `TableOpenButton`: compact semantic records with shared hover, focus, unread, and selected states.
- `DataTable`, `useDataTable`, and `createDataColumnHelper`: shared TanStack features, sortable headers, pagination, selection, and request-state rendering. Inbox column definitions remain in `inbox-columns.tsx`. See [the table decision](decisions/0005-shared-tanstack-table.md) for the future Query boundary.
- `Drawer`, `DrawerContent`, `DrawerHeader`, `DrawerBody`, and `DrawerFooter`: a right-side Base UI modal with an independently scrolling body and safe-area spacing.
- `AttachmentList`: shared photo previews without cropping, compact removable file rows, native audio controls, downloads, and file-open links. Photo loading uses `LoadingIndicator`; failed previews use `EmptyState`. `ReportAttachments` selects preview mode for review and compact mode for submission. **Display → Attachments** documents both modes and error states.
- `DialogContent size="wide"`: a shared wider dialog for photo viewing, with the same phone width and viewport height limit as the default.

These controls have colocated Storybook stories. **Pages → Reports → Busy inbox** supplies thirty fictional reports to inspect density. **Report drawer** opens a report directly. The page reuses WorkspaceHeader, Heading, Text, Card, Button, Badge, Input, Textarea, Label, Checkbox, Separator, Dialog, and EmptyState without changing their visual styles.

## Report review drawer

`ReportReviewDrawer` owns report review drafts, follow-up forms, and nested dialogs. `InboxScreen` owns table state and focus return. The original report comes first, followed by review fields, care tasks, conversation, duplicate linking, and collapsed history. No internal tabs are needed for this reading order.

The header uses plain category text and one relevant state badge. The fixed footer keeps **Ask for details** and **Save and finish** available. It explains a missing colony or care note beside the disabled finish action. **Create task** appears beside care tasks; duplicate linking appears lower in the body. A suggested duplicate opens a comparison with its original message, reporter, and date before linking. Only reports in the same known colony can be targets; existing duplicate and incoming-link checks still prevent chains and cycles.

Review and follow-up drafts are separate. Creating a task adds it immediately without saving unfinished review fields. Finishing a review saves its fields and clears that review draft. Asking a question moves the report to Waiting for details while keeping the review draft. Duplicate linking keeps that draft for a later reopen, but its processed summary always shows the saved report fields.

## Workspace header and submissions

The shared workspace header stays at the top during page scroll. The page name and any parent breadcrumbs appear on the left. **New report** is available from the reports table toolbar. Workspace routes supply their names through `handle.breadcrumb`; the current name is the single `h1`, and parent names link back to their routes. Overview and Inbox are top-level pages, so each shows only its own name. Page bodies do not repeat the title or an introductory description. Report drawer titles and instructions stay inside the drawer. **Navigation → Workspace header** documents the shared component, nested paths, and long labels.

The workspace refreshes its report and task snapshot when the window regains focus and every minute while visible. A response that overlaps a local write is discarded so it cannot undo a completed change.

**New report** is available from the reports table and relevant record pages. It opens the same shared right-side drawer as report review and fills phone screens. The header and Cancel/Submit actions stay visible while the form body scrolls. The form uses **What happened?**, **Colony**, **Details**, **Attachments (optional)**, and **Needs urgent attention**. Its final action is **Submit report**. Unknown colony is allowed at submission; the reviewer must identify it before processing.

Attachments support images, audio recordings, PDF, text, Word (`.docx`), and CSV files. Each report can contain up to five files of 10 MB each. Users can remove files before submission. Photos show large inline previews in the review drawer and compact thumbnails in the submission form. Clicking a review photo opens a wide viewer. Reports also offer file-open links, downloads, and native audio playback. Local object URLs stay valid while the workspace is mounted and are released on removal, cancellation, or workspace unmount. Saved attachments use private R2 storage and require an active account to read.

Submitting adds a local report and opens its review in the same position, with a confirmation in the drawer description. The composer and review skip their sliding transitions for this handoff. A report from another workspace page reaches the Inbox through `?report=<id>`. Closing the drawer clears that query and the submission confirmation. Review status remains separate from task state.

The shared Button previously forced relative positioning after caller layout classes. That displaced dialog and drawer close controls. Its default positioning now precedes the caller classes, so close buttons stay in the top-right corner. Shared dialogs also limit height to the visible viewport and scroll when necessary.

## Verification

Run `npm run build` and `npm run build-storybook`. Browser checks must use `/Users/admin/.local/bin/eday-secure-chrome` with Playwright `chromiumSandbox: true`. The focused `tests/ui/inbox-drawer.spec.ts` suite covers draft retention, questions, task creation, duplicate comparison, saved summaries, completion and reopen, focus return after row removal, attachment failures, and phone-width layout in light and dark modes.

Exercise search and combined filters; draft retention; task creation followed by report completion; reopen; question/waiting transitions; duplicate linking; photo viewing; report submission with photos/files; attachment removal and validation; top-right close controls; Escape dismissal and focus return; and arrow-key tabs. Check route authentication, sidebar navigation, title, and reload. Check combined search, status, and colony filtering; then check table, drawer, and dialog widths at 320, 390, 768, 1024, and 1440 px. Phone emulation checks layout only; actual keyboard, safe-area, and touch behavior still need physical hardware.
