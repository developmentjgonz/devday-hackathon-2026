# Team management

The protected `/app/team` page lets an active administrator review account requests, search accounts, and filter by access status. The page uses the shared workspace header, table, controls, cards, and drawer. Pending requests appear in a review callout. A request can be approved as a member; active and suspended accounts can have their role or access changed.

The administrator-only `/api/users` routes read and update D1. Writes require the configured origin and compare the role and status displayed to the administrator with the current database values. A stale change is rejected. The server also prevents self-edits and checks the actor and the number of active administrators in the same update, so concurrent changes cannot remove the last active administrator. Approval records the approving administrator and time. Existing sessions read current account status and role on each protected request.

The Team link is shown only to administrators. Members who visit the page directly see an access message, and the API enforces the same restriction. Search and pagination operate on the returned account list. The interface handles loading, empty results, failed requests, long content, narrow screens, and keyboard focus after closing the drawer.

After an access change, the workspace reloads its member list so assignment controls can use the current active accounts.

The current local signup flow creates pending requests. Invitations, declined requests, account deletion, profile editing, and production sign-in are not implemented.

`Pages → Team` in Storybook uses isolated fictional accounts and an in-memory store. It includes request, loading, error, empty, member-access, pagination, and long-content examples. `Display → User avatar` and `Display → Data table → Page scroll` document the shared visual components.

Run `npm run test:auth` for the account API and access rules, and `npx playwright test tests/ui/team.spec.ts` for the page workflows in light and dark themes.
