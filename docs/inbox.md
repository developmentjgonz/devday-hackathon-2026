# Inbox interaction design

Open `/app/inbox` with an approved local account, or **Pages → Inbox → Review** in Storybook. The route and stories render the same `InboxScreen` and shared workspace layout.

## Current scope

This is a local interface for reviewing the flow before rescue persistence is designed. `src/features/inbox/data/local-inbox.ts` supplies seven fictional reports, three fictional colonies and cats, and three reviewer names. The attachment is a stock Unsplash cat photo. It does not depict a reported injury. No real reports, messages, locations, or contacts are used.

Reports, questions, tasks, attachments, duplicate links, read state, and history stay in a workspace-level memory provider. They survive navigation between workspace routes. Refreshing or leaving the workspace resets them. Unfinished review drafts stay only while the Inbox screen is mounted. Questions are not sent. Tasks are not persisted or delivered to an assignee. Completing a review does not change a database cat or colony record. The page makes no live-feed claim. Integration notes stay here and in Storybook Docs.

The UI contracts in `src/features/inbox/types.ts` are feature-local and do not define a database schema or API contract. Schema work runs separately; no rescue migrations or endpoints were added for this page.

## Behavior

- **To review**, **Waiting for details**, and **Processed** have separate counts. Read state is independent of review state. Reports become read when their drawer is opened, including links from the bell.
- Search matches titles, original messages, reporters, colonies, and linked cat names. A separate colony filter includes unknown locations. Both filters combine with the current review view. Clear filters recovers from no matches.
- Urgent reports appear first; older submissions come first within each priority group.
- Sortable headers let reviewers order reports by title, colony, reporter, or received time. Clearing the sort restores urgent-first order. Urgency appears beside the report category; the Review column shows review readiness or state independently.
- The shared TanStack table has 10, 25, and 50 rows per page. Changing filters or sorting starts at the first page. Opening a report or changing read state preserves the page. Removing the last report from a page returns to the last available page.
- Checkboxes select reports without opening them. Select this page affects only the displayed page; selections can span pages in the current filtered view. Mark read or Mark unread updates the selected reports. Changing a filter or view clears the selection.
- The original message and attachments remain unchanged. Review drafts can change colony, cat match, care note, and urgency. Changing colony clears the cat match so a cat from another colony cannot remain attached.
- Unknown cat identity is allowed. A colony and nonempty care note are required to finish a normal review. Unclear locations can wait for more information.
- Asking a question adds it to the local conversation and moves the report to Waiting for details. Its draft stays available while the screen is mounted.
- A care task requires a title and team member. Its due date is optional. Tasks remain open when their report is processed or reopened.
- Duplicate linking preserves both reports and moves the duplicate to Processed. Targets belong to the same known colony and cannot already be duplicates. A report with incoming duplicate links cannot itself be linked as a duplicate; this prevents cycles. Cat records are never merged by this action.
- Processed reports show read-only details, history, and open linked tasks. Reopen returns a report to To review.
- Review drafts survive switching reports, filters, and tabs while the screen remains mounted.

The main view uses the shared TanStack `DataTable` over a semantic HTML table. Desktop columns show report, colony/cat, review state, reporter, and received time. Smaller widths hide secondary columns and keep colony and review information in each report cell. Read titles use normal weight; unread titles use stronger weight and a dot in a reserved slot. Multi-page tables keep a stable viewport height with a sticky column header. Clicking a row opens a right-side modal drawer; a native title button gives each row keyboard access. Checkboxes act independently. The drawer fills phone screens. Its body scrolls while the header and save action remain visible. Closing returns focus to the row, or to the table if processing removed that row. Nested task, question, and photo dialogs use the shared focus handling and Escape dismissal.

## Shared controls

- `ViewTabs`: controlled Base UI tabs with optional counts, active styling, arrow-key activation, and the current panel as children.
- `SelectField`: native select with the shared input height, typography, corners, and focus style. The browser supplies the platform picker on phones.
- `Table`, `TableHead`, `TableRow`, `TableCell`, and `TableOpenButton`: compact semantic records with shared hover, focus, unread, and selected states.
- `DataTable`, `useDataTable`, and `createDataColumnHelper`: shared TanStack features, sortable headers, pagination, selection, and request-state rendering. Inbox column definitions remain in `inbox-columns.tsx`. See [the table decision](decisions/0005-shared-tanstack-table.md) for the future Query boundary.
- `Drawer`, `DrawerContent`, `DrawerHeader`, `DrawerBody`, and `DrawerFooter`: a right-side Base UI modal with an independently scrolling body.
- `NotificationButton`: the standard Lucide bell at 20 px inside the shared icon button, with a small attention dot and an accessible count.

These controls have colocated Storybook stories. **Pages → Inbox → Busy inbox** supplies thirty fictional reports to inspect density. **Report drawer** opens a report directly. The page reuses WorkspaceHeader, Heading, Text, Card, Button, Badge, Input, Textarea, Label, Checkbox, Separator, Dialog, and EmptyState without changing their visual styles.

## Workspace toolbar and submissions

The shared workspace header stays at the top during page scroll. The page name and any parent breadcrumbs appear on the left. **New report** and notifications stay on the right. Workspace routes supply their names through `handle.breadcrumb`; the current name is the single `h1`, and parent names link back to their routes. Overview and Inbox are top-level pages, so each shows only its own name. Page bodies do not repeat the title or an introductory description. Report drawer titles and instructions stay inside the drawer. **Navigation → Workspace header** documents the shared component, nested paths, and long labels.

The notification popover lists urgent, unprocessed reports; it is not a complete alerts or task system. Selecting one opens its inbox drawer.

**New report** is available from every protected workspace page. It opens the same shared right-side drawer as report review and fills phone screens. The header and Cancel/Submit actions stay visible while the form body scrolls. The form uses **What happened?**, **Colony**, **Details**, **Attachments (optional)**, and **Needs urgent attention**. Its final action is **Submit report**. Unknown colony is allowed at submission; the reviewer must identify it before processing.

Attachments support images, audio recordings, PDF, text, Word (`.docx`), and CSV files. Each report can contain up to five files of 10 MB each. Users can remove files before submission. Photos show previews; reports offer photo viewing, file downloads, and native audio playback. Local object URLs stay valid while the workspace is mounted and are released on removal, cancellation, or workspace unmount. No storage service or uploads are implemented.

Submitting adds a local report and opens its drawer. A report from another workspace page reaches the Inbox through `?report=<id>`. Closing the drawer clears that query. Review status remains separate from task state.

The shared Button previously forced relative positioning after caller layout classes. That displaced dialog and drawer close controls. Its default positioning now precedes the caller classes, so close buttons stay in the top-right corner. Shared dialogs also limit height to the visible viewport and scroll when necessary.

## Verification

Run `npm run build` and `npm run build-storybook`. Browser checks must use `/Users/admin/.local/bin/eday-secure-chrome` with Playwright `chromiumSandbox: true`.

Exercise search and combined filters; draft retention; task creation followed by report completion; reopen; question/waiting transitions; duplicate linking; photo viewing; report submission with photos/files; attachment removal and validation; bell links; top-right close controls; Escape dismissal and focus return; and arrow-key tabs. Check route authentication, sidebar navigation, title, and reload. Check table, drawer, and dialog widths at 320, 390, 768, 1024, and 1440 px. Phone emulation checks layout only; actual keyboard, safe-area, and touch behavior still need physical hardware.
