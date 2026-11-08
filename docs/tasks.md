# My Tasks

The protected `/app/tasks` route uses the workspace loader and the shared page header. **My Tasks** appears in workspace navigation. A shared toolbar sits above the task view.

## Current data and state

The page reads tasks loaded from the authenticated workspace API. Tasks can exist on their own or link to a report. Creating, editing, completing, and reopening a task writes to D1 and survives refresh. Local setup adds fictional seed records; Storybook uses an isolated in-memory store.

Each task stores its assignee by stable user ID. My Tasks shows tasks assigned to the signed-in user. The server permits the assignee or an administrator to update a task, and assignment requires an active account.

`TaskStatus` is `open | completed`. It is separate from `ReportStatus` (`pending | waiting | processed`). Completing or reopening a task does not change the report status, saved review fields, or other tasks. Processing or reopening a report does not change task completion. Completing or reopening a report-linked task saves a report history entry. The report drawer displays the task's actual open or completed status.

## Behavior

- Open tasks appear in note cards on entry. The status filter also offers Completed tasks and All tasks.
- Cards and List in the toolbar switch between note cards and the sortable table. Both views use the same filters, results, actions, and pagination. The browser remembers the selected view; cards are used when no preference is saved.
- Search matches the task title, linked report, and related item names. Clear filters clears the search while preserving the chosen task status.
- Each card shows the task, related items, due date, available record links, edit action, and completion action. The table shows the same information in columns. Missing due dates have readable text. At narrow widths, table details move under the task title.
- Default order is due date, earliest first. Undated tasks appear last. Sortable task, colony, and due date columns use the shared table behavior. Pagination clamps to the last remaining page when completion removes its last row.
- Complete opens a shared confirmation dialog with the task name and linked context. Cancel and Escape keep the task open and return focus to its action. Confirming moves the task to Completed tasks. The success notification includes Undo. The same flow is used on Overview and My Tasks. Reopen returns it to Open tasks. Shared Sonner notifications confirm both actions. Keyboard focus returns to the task results if the action removes the item.
- A task can have up to 30 cat, colony, person, paperwork, and other associations. Cat and colony associations select directory records. Person, paperwork, and other associations are named text until those records have their own directory. Associations are optional, and an existing task can be edited. A task created from a cat or colony profile starts with that record selected.
- Report, Cat, and Colony actions appear in both card and list views when those records exist. Report-linked tasks also follow the report’s current cat and colony. A cat association includes its current colony. Unknown records do not get dead links. Cat and colony pages and counts include directly associated tasks.
- Report links open `/app/reports?report=<id>` in the existing report drawer, including reports outside the current report status filter. Task state remains visible in the drawer and when returning to My Tasks.
- Empty and no-match states use `EmptyState`. The shared Card note tone and ViewSwitcher define the new surface and view control in Storybook.

## Storybook and verification

**Pages → My Tasks** renders the production page and workspace. Stories cover the existing local dataset, focused task workflows, another assignee, no tasks, pagination, and long content. Fixture and integration notes stay in Docs and this file.

The focused browser suites are `tests/ui/my-tasks.spec.ts` and `tests/ui/task-associations.spec.ts`. They cover assignee filtering, search, completion and reopen, report links and status independence, navigation state, task creation, pagination after row removal, empty states, and narrow layouts. Browser checks use `/Users/admin/.local/bin/eday-secure-chrome` with `chromiumSandbox: true` through the shared Playwright configuration.
