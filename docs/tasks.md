# Tasks

The protected `/app/tasks` route uses the workspace loader and the shared page header. **My Tasks** appears in workspace navigation. A shared toolbar sits above the task view. Administrators also have **Team Tasks** at `/app/team-tasks`, available from workspace navigation and the Overview team task card. This page shows every assignee, including owners who are suspended or unavailable for new assignments. Members who open this route see an administrator access message.

## Current data and state

The page reads tasks loaded from the authenticated workspace API. Tasks can exist on their own or link to a report. Creating, editing, completing, and reopening a task writes to D1 and survives refresh. Local setup adds fictional seed records; Storybook uses an isolated in-memory store.

Each task stores its assignee by stable user ID. My Tasks shows tasks assigned to the signed-in user. The server permits the assignee or an administrator to update a task. New assignments require an active account with **Available for tasks** enabled in Team. If that setting is disabled later, the person keeps their existing tasks and can still update them.

Each task has a shareable `/app/tasks/<id>` address. Opening a task from the workspace keeps the current page behind its drawer. A shared address or a refresh opens the task page directly. Any signed-in team member can view it; only the assignee or an administrator can edit or change its status.

`TaskStatus` is `open | completed`. Report status is Needs review, Waiting for details, In progress, Resolved, or Dismissed. Finishing a review moves the report to In progress if any linked task is open, or Resolved if none are open. Completing the last linked task resolves the report. Reopening a task or adding a new one returns a reviewed report to In progress. Pending, waiting, and dismissed reports keep their status when tasks change. Task changes keep the saved review fields and other tasks intact. Report history records the change. The stored `processed` value records a completed review; API reads derive In progress or Resolved from its current tasks, without a second stored work status.

## Behavior

- Open tasks appear in a compact vertical list on phones and a table on desktop. The status filter also offers Completed tasks and All tasks.
- The phone list appends 20 local rows at a time with Show more. Existing rows stay in place. Desktop tables keep sortable columns and paging controls. Both use the same filtered data.
- Team Tasks groups Status and Assignee in the shared Filters panel, matching Reports. On phones, search fills the first row; Filters and New task share the next row. The button shows the active filter count. Clear filters selects all statuses and assignees while preserving the search.
- Team Tasks adds an assignee column on desktop and an assignee label on phones. Its assignee filter uses existing task owners, rather than the list of people eligible for new assignments. Administrators can edit, reassign, complete, and reopen team tasks through the existing API rules.
- Search matches the task title, linked report, and related item names. Team Tasks search also matches the assignee name. Clear the search field to remove the search while preserving the chosen task status.
- Each phone row shows the task, related record names, and due date. Activate the row to open task details, edit it, follow related links, or change its status. Desktop tables retain direct actions. Missing due dates have readable text.
- Default order is due date, earliest first. Undated tasks appear last. Sortable task, colony, and due date columns use the shared table behavior. Pagination clamps to the last remaining page when completion removes its last row.
- Mark complete opens a confirmation with an optional note. Confirming moves the task to Completed tasks. The note appears in task details and in related cat and colony timelines. Reopening keeps the previous note visible on the task; the next completion replaces it. The success notification includes Undo. The same flow is used on My Tasks, task details, cat and colony profiles, and report drawers. Reopen returns it to Open tasks. Keyboard focus returns to the task results if the action removes the item. While a status change is saving, the action shows loading and cannot be activated again. A failed save keeps the confirmation and note open for retry.
- A task can have up to 30 cat, colony, person, paperwork, and other associations. Cat and colony associations select directory records. Person, paperwork, and other associations are named text until those records have their own directory. Associations are optional, and an existing task can be edited. A task created from a cat or colony profile starts with that record selected.
- The task drawer keeps its title in a compact fixed header. The linked colony and cat summary scrolls below the title, owner, and due-date fields. Adding related items does not move those fields. The summary includes links inherited from the report or a cat's current colony. When there are multiple links, the complete list can be expanded in the form. Directly related items remain editable there. A task opened from report review uses the saved report links until the reviewer saves changes to that report.
- Report, Cat, and Colony links appear in task details when those records exist. Report-linked tasks also follow the report’s current cat and colony. A cat association includes its current colony. Unknown records do not get dead links. Cat and colony pages and counts include directly associated tasks.
- Task links open details over the current page. Closing returns to the previous page or report. The `/app/tasks/<id>` address remains available for sharing or opening in a new tab.
- Report links open the report drawer over the current page, including reports outside the current report status filter. Closing it returns focus to the link. The links retain their `/app/reports/<id>` address for sharing or opening in a new tab.
- Empty and no-match states use `EmptyState`. The shared RecordList and RecordListItem define the phone surface and row action in Storybook.

## Care schedules

Each cat and colony profile has a **Care schedule**. A team member can create a rule with a task title, available assignee, first due date, and an interval in days or weeks. Use separate rules for separate visits, such as morning and evening feeding. Tasks have a date but no time; the schedule does not send notifications.

The care rule drawer puts cat and colony context in the scrolling body. Only its title and main actions stay fixed. A colony rule shows its colony; a cat rule shows the cat and its current colony.

Rules create ordinary tasks linked to the cat or colony. The Worker checks for due occurrences every five minutes and also checks when a member loads or refreshes workspace data. Tasks are created through the next UTC date so they are available before their due date in any time zone. A saved occurrence key prevents duplicates if checks overlap or are retried. Missed occurrences are created on later checks, up to 90 per rule per check. The configured Worker cron must be deployed for checks to run when nobody opens the app.

Wrangler does not run the cron automatically in local development. The local app checks schedules on workspace load and refresh; use `/cdn-cgi/local/scheduled` on the local Worker to invoke the scheduled handler manually.

The creator, assignee, or an administrator can edit, pause, and resume a rule. Editing a task does not edit its rule. Editing or pausing a rule does not change tasks already created; resuming skips dates before the current UTC date. If an assignee becomes inactive or unavailable for new assignments, the rule shows a warning so the team can choose an available assignee. When [autopilot task assignment](autopilot.md) is enabled, it can reassign existing open tasks to an available member. The rule still needs an available assignee for future tasks.

## Storybook and verification

**Pages → My Tasks** renders the production page and workspace. Stories cover the existing local dataset, focused task workflows, another assignee, no tasks, pagination, and long content. Fixture and integration notes stay in Docs and this file.

Apply `0025_task_completion_note.sql` before running the updated Worker against an existing D1 database. The focused browser suites include `tests/ui/my-tasks.spec.ts`, `tests/ui/task-completion.spec.ts`, and `tests/ui/task-associations.spec.ts`. Browser checks use `/Users/admin/.local/bin/eday-secure-chrome` with `chromiumSandbox: true` through the shared Playwright configuration.
