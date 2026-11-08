# Team management

The protected `/app/team` page lets an active administrator review account requests, search accounts, and filter by access status. The page uses the shared workspace header, table, controls, cards, and drawer. Pending requests appear in a review callout. A request can be approved as a member; active and suspended accounts can have their role or access changed.

Administrators can enable or disable **Available for tasks** for each person, including themselves. The setting is enabled by default and is separate from workspace access. Only active people with task assignments enabled appear in task and care rule assignee lists. Disabling it keeps existing tasks and care schedules assigned; a care schedule warns the team when its assignee is unavailable for new assignments.

The administrator-only `/api/users` routes read and update D1. Writes require the configured origin and compare the role, access status, and task assignment setting displayed to the administrator with the current database values. A stale change is rejected. An administrator cannot change their own role or access. The server checks the actor and the number of active administrators in the same update, so concurrent changes cannot remove the last active administrator. Approval records the approving administrator and time. Existing sessions read current account status and role on each protected request.

The Team link is shown only to administrators. Members who visit the page directly see an access message, and the API enforces the same restriction. Search and pagination operate on the returned account list. The interface handles loading, empty results, failed requests, long content, narrow screens, and keyboard focus after closing the drawer.

After an access or task assignment change, the workspace reloads its assignee list.

The current local signup flow creates pending requests. Invitations, declined requests, account deletion, profile editing, and production sign-in are not implemented.

`Pages → Team` in Storybook uses isolated fictional accounts and an in-memory store. It includes request, loading, error, empty, member-access, pagination, and long-content examples. `Display → User avatar` and `Display → Data table → Page scroll` document the shared visual components.

Run `npm run test:auth` for the account API and access rules, and `npx playwright test tests/ui/team.spec.ts` for the page workflows in light and dark themes.
