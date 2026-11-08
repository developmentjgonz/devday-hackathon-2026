# My Tasks

The protected `/app/tasks` route uses the workspace loader and the shared page header. **My Tasks** appears beside Overview and Reports in workspace navigation. The page body contains the shared table and its toolbar.

## Current data and state

The page reads report-linked tasks from `InboxProvider`. The starting records are fictional local data from `src/features/inbox/data/local-inbox.ts`. There is no task API or task database integration. Task changes remain available during workspace navigation. Refreshing or leaving the workspace resets them.

The current task contract stores its assignee as a member name. My Tasks includes only tasks whose `owner` equals the signed-in user's `name`. It does not display tasks assigned to other names. This is a local interface rule, not a server authorization boundary. The future task API must use stable user IDs and enforce assignee access on the server. Do not add endpoint or schema assumptions to this interface.

`TaskStatus` is `open | completed`. It is separate from `ReportStatus` (`pending | waiting | processed`). Completing or reopening a task does not change the report status, saved review fields, or other tasks. Processing or reopening a report does not change task completion. Each task change adds a local report history entry. The report drawer displays the task's actual open or completed status.

## Behavior

- Open tasks appear first on entry. The status filter also offers Completed tasks and All tasks.
- Search matches task title, linked report title, and colony name. Clear filters clears the search while preserving the chosen task status.
- The table shows task, report link, colony, and due date. Missing colony and due date values have readable text. At narrow widths, colony and due date move under the task title.
- Default order is due date, earliest first. Undated tasks appear last. Sortable task, colony, and due date columns use the shared table behavior. Pagination clamps to the last remaining page when completion removes its last row.
- Complete moves the task to Completed tasks. Reopen returns it to Open tasks. Shared Sonner notifications confirm both actions. Keyboard focus returns to the table if the action removes its row.
- Report links open `/app/reports?report=<id>` in the existing report drawer, including reports outside the current report status filter. Task state remains visible in the drawer and when returning to My Tasks.
- Empty and no-match states use `EmptyState`. No new component styles or loaders are needed.

## Storybook and verification

**Pages → My Tasks** renders the production page and workspace. Stories cover the existing local dataset, focused task workflows, another assignee, no tasks, pagination, and long content. Fixture and integration notes stay in Docs and this file.

The focused browser suite is `tests/ui/my-tasks.spec.ts`. It covers assignee filtering, search, completion and reopen, report links and status independence, navigation state, task creation, pagination after row removal, empty states, and narrow layouts. Browser checks use `/Users/admin/.local/bin/eday-secure-chrome` with `chromiumSandbox: true` through the shared Playwright configuration.
