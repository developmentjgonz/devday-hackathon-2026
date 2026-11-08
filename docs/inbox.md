# Inbox interaction design

Open `/app/reports` with an approved local account, or **Pages → Reports → Review** in Storybook. The route and stories render the same `InboxScreen` and shared workspace layout.

## Current scope

Local setup seeds 100 fictional reports across three fictional colonies and cats. The Focused inbox story has seven interaction scenarios. No real reports, messages, locations, or contacts are used in the seed.

Reports, questions, tasks, duplicate links, and history are saved in D1. Report attachments use private R2 storage and authenticated reads. These saved records survive refresh. Unfinished review and follow-up drafts stay only while the screen is mounted. Questions appear in the saved report conversation; outbound delivery is not implemented. Completing a review does not change the cat or colony record.

Shared types and validation schemas define the API contract. `migrations/0010_reports_and_tasks.sql` defines the report and task tables. The report and task APIs require an active account and same-origin writes.

## Behavior

- Status is a toolbar filter with **All reports**, **Needs review**, **Waiting for details**, **Reviewed**, and **Dismissed**. The initial status is Needs review. Clear filters clears search and colony and selects All reports. The table footer shows the current result count. Opening a report does not change its review state.
- Search matches titles, original messages, reporters, colonies, and linked cat names. A separate colony filter includes unknown locations. Both filters combine with the current review view. Clear filters recovers from no matches.
- Reports appear newest first by default. The urgent-first sort remains available; it shows older submissions first within each priority group.
- Sortable headers let reviewers order reports by title, colony, reporter, or received time. Clearing the sort restores urgent-first order. Urgency appears beside the report category; the Status column displays the report workflow status. Urgency and duplicate suggestions remain separate.
- The shared TanStack table has 10, 25, and 50 rows per page. Changing filters or sorting starts at the first page. Opening a report preserves the page. Removing the last report from a page returns to the last available page.
- The original message and attachments remain unchanged. Review drafts can change colony, cat match, care note, and urgency. Changing colony clears the cat match so a cat from another colony cannot remain attached.
- Unknown cat identity is allowed. A colony and nonempty care note are required to finish a normal review. Unclear locations can wait for more information.
- Asking a question adds it to the saved conversation and moves the report to Waiting for details. Its draft stays available while the screen is mounted.
- A care task requires a title and team member. Its due date is optional. Tasks remain open when their report is reviewed or reopened. A confirmation appears beside the linked tasks and is announced to assistive technology; it does not cover the drawer actions.
- Duplicate linking preserves both reports and moves the duplicate to Reviewed. Targets belong to the same known colony and cannot already be duplicates. A report with incoming duplicate links cannot itself be linked as a duplicate; this prevents cycles. Cat records are never merged by this action.
- Finishing a review confirms that the report can be found under Reviewed. Reviewed reports show saved details as readable text, history, and open linked tasks. Unsaved duplicate-review drafts do not appear in the saved summary. Reopen returns a report to Needs review and restores its review draft when one exists.
- Dismissed reports stay in the Dismissed filter, keep their history and attachments, and can be reopened.
- Review drafts survive switching reports, filters, and tabs while the screen remains mounted.

Reports use a compact vertical list on phones and a shared TanStack DataTable on desktop. Phone rows show urgency, title, a message preview, colony, category, and received time. When the status filter is Needs review, rows omit that repeated badge. Other status views retain their badges. The default order is newest first; other sort choices match the table columns or use urgent-first order. Both presentations share filters and sorting. Phone feeds append 20 local records at a time. Desktop tables keep paging controls and scroll with the page. Opening a report does not complete its review. A row opens the existing right-side modal drawer. The drawer fills phone screens. Its body scrolls while the header and save action remain visible. Closing returns focus to the row, or to the results if the completed review removed it. Nested task, question, and photo dialogs use the shared focus handling and Escape dismissal.

## Shared controls

- `ViewTabs`: controlled Base UI tabs with optional counts, active styling, arrow-key activation, and the current panel as children.
- `SelectField`: native select with the shared input height, typography, corners, and focus style. The browser supplies the platform picker on phones.
- `Table`, `TableHead`, `TableRow`, `TableCell`, and `TableOpenButton`: compact semantic records with shared hover, focus, and selected states.
- `DataTable`, `useDataTable`, and `createDataColumnHelper`: shared TanStack features, sortable headers, pagination, selection, request states, and an optional mobile card renderer. Inbox column definitions remain in `inbox-columns.tsx`. See [the table decision](decisions/0005-shared-tanstack-table.md) for the future Query boundary.
- `Drawer`, `DrawerContent`, `DrawerHeader`, `DrawerBody`, and `DrawerFooter`: a right-side Base UI modal with an independently scrolling body and safe-area spacing.
- `AttachmentList`: shared photo previews without cropping, compact removable file rows, native audio controls, downloads, and file-open links. Photo loading uses `LoadingIndicator`; failed previews use `EmptyState`. `ReportAttachments` selects preview mode for review and compact mode for submission. **Display → Attachments** documents both modes and error states.
- `DialogContent size="wide"`: a shared wider dialog for photo viewing, with the same phone width and viewport height limit as the default.

These controls have colocated Storybook stories. **Pages → Reports → Busy inbox** supplies thirty fictional reports to inspect density. **Report drawer** opens a report directly. The page reuses WorkspaceHeader, Heading, Text, Card, Button, Badge, Input, Textarea, Label, Checkbox, Separator, Dialog, and EmptyState without changing their visual styles.

## Report review drawer

`ReportReviewDrawer` owns report review drafts, follow-up forms, and nested dialogs. `InboxScreen` owns table state and focus return. The fixed header names the view **Report** and keeps colony and optional cat context visible. The report title and original message come first in the body, followed by a summary and entry point for AI suggestions when available, attachments, review fields, care tasks, conversation, duplicate linking, and collapsed history. Suggestions open in a separate drawer view; returning to the report keeps its draft and scroll position.

The report body shows its category, urgency, and review state. The fixed footer keeps **Ask for details** and **Save and finish** available. Colony and cat links are optional. **Dismiss report** closes reports that need no further action, without requiring a colony or saving unfinished review fields. Dismissed reports have their own status filter and can be reopened. Both finishing and dismissing leave linked tasks unchanged. A care note is optional. The original message is not repeated in the review when the note is identical. Reviewers can add cats and colonies from the review and create tasks beside care tasks. New cat and colony links take effect when the reviewer saves the review; reviewed reports must be reopened to change their links. Duplicate linking appears lower in the body. The picker searches report titles and text with an indexed search, shows results in pages, and displays the selected report's original message, reporter, and date before linking. Only reports in the same saved, known colony can be targets; existing duplicate and incoming-link checks still prevent chains and cycles.

Review and follow-up drafts are separate. Creating a task adds it immediately without saving unfinished review fields. Finishing a review saves its fields and clears that review draft. Asking a question moves the report to Waiting for details while keeping the review draft. Duplicate linking keeps that draft for a later reopen, but its processed summary always shows the saved report fields.

When AI analysis is configured and available to the signed-in user, opening an unreviewed report starts analysis. The report shows the analysis status and a button to review suggestions in a separate view. A reviewer can run analysis again there, or retry if it fails. Running it again replaces the current suggestions and dismissals. Analysis includes supported attachments and checks a bounded set of related reports for possible duplicates. A reviewer can compare a suggested match before linking it. The reviewer can approve a suggested task in one action; it is assigned to the reviewer and linked to the selected colony and cat. The reviewer can also edit the task before creating it. Suggested cats and colonies open editable forms because a name or other details may be missing. Existing linked records are not recreated automatically. When analysis has no suggestion for a task, cat, or colony, Other actions provides the matching creation form. These actions also remain available while analysis loads or fails. New records update the review draft and are linked when the review is saved. Suggestions and dismissals remain in memory while the inbox is open. See [OpenAI API key setup](openai-key-setup.md) for the information sent to OpenAI and the limits on analysis.

## Workspace header and submissions

The shared workspace header stays at the top during page scroll. The page name and any parent breadcrumbs appear on the left. **New report** is available from the reports table toolbar. Workspace routes supply their names through `handle.breadcrumb`; the current name is the single `h1`, and parent names link back to their routes. Overview and Inbox are top-level pages, so each shows only its own name. Page bodies do not repeat the title or an introductory description. Report drawer titles and instructions stay inside the drawer. **Navigation → Workspace header** documents the shared component, nested paths, and long labels.

The workspace refreshes its report and task snapshot when the window regains focus and every minute while visible. A response that overlaps a local write is discarded so it cannot undo a completed change.

**New report** is available from the reports table and relevant record pages. It opens the same shared right-side drawer as report review and fills phone screens. Colony and optional cat stay in the fixed header while the other form fields scroll. The Cancel/Submit actions also stay visible. The form uses **What happened?**, **Details**, **Attachments (optional)**, and **Needs urgent attention**. Its final action is **Submit report**. Unknown colony is allowed at submission and when finishing a review.

Attachments support images, audio recordings, PDF, text, Word (`.docx`), and CSV files. Each report can contain up to five files of 10 MB each. Users can remove files before submission. Photos show large inline previews in the review drawer and compact thumbnails in the submission form. Clicking a review photo opens a wide viewer. Reports also offer file-open links, downloads, and native audio playback. Local object URLs stay valid while the workspace is mounted and are released on removal, cancellation, or workspace unmount. Saved attachments use private R2 storage and require an active account to read.

Submitting adds a report and opens its review over the current page, with a confirmation in the drawer description. The composer and review skip their sliding transitions for this handoff. Report links open the drawer over the current page and update the address to `/app/reports/<id>`. A shared address or a refresh opens the report directly. Browser Back closes the drawer, and closing returns focus to the original control. Review status remains separate from task state.

The shared Button previously forced relative positioning after caller layout classes. That displaced dialog and drawer close controls. Its default positioning now precedes the caller classes, so close buttons stay in the top-right corner. Shared dialogs also limit height to the visible viewport and scroll when necessary.

## Verification

Run `npm run build` and `npm run build-storybook`. Browser checks must use `/Users/admin/.local/bin/eday-secure-chrome` with Playwright `chromiumSandbox: true`. The focused `tests/ui/inbox-drawer.spec.ts` suite covers draft retention, questions, task creation, duplicate comparison, saved summaries, completion and reopen, focus return after row removal, attachment failures, and phone-width layout in light and dark modes.

Exercise search and combined filters; draft retention; task creation followed by report completion; reopen; question/waiting transitions; duplicate linking; photo viewing; report submission with photos/files; attachment removal and validation; top-right close controls; Escape dismissal and focus return; and arrow-key tabs. Check route authentication, sidebar navigation, title, and reload. Check combined search, status, and colony filtering; then check table, drawer, and dialog widths at 320, 390, 768, 1024, and 1440 px. Phone emulation checks layout only; actual keyboard, safe-area, and touch behavior still need physical hardware.


## Report scrolling

Report drawers keep only their title and close control in the fixed header. Colony and Cat fields are in Review details, inside the scrolling body. Reviewed reports show their saved links there. The original report comes before AI suggestions. Report task, question, duplicate, and AI subviews also keep record context in their scrolling body. New reports put Colony and Cat after the report text in the form body. Footer actions stay visible.

Apply migrations through `0033_report_dismissal.sql` before deploying report dismissal.
