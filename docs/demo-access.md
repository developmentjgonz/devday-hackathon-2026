# Demo sign-in

An active administrator can open **Configuration** and enable or disable demo sign-in. When it is enabled, anyone who can reach the site can use a designated fictional member account to view and change workspace data. Turning it off immediately ends demo sessions.

Demo sign-in is separate from Google sign-in and local test sign-in. Regular demo members cannot become administrators or sign in as Google users. Pending and suspended accounts cannot enter the workspace. The public local signup endpoint remains disabled.

The separate demo administrator requires a strong access code stored in the Worker secret `DEMO_ADMIN_CODE`. Login attempts are rate limited. This account can view administrator screens and manage demo members, but it cannot change real team accounts. It does not count as a real administrator for account recovery or last-administrator checks. Turning demo sign-in off ends its sessions too. To rotate the code, first turn demo sign-in off, replace the secret with a new random code of at least 32 URL-safe characters, then turn demo sign-in back on.

The setting starts off. After the fictional accounts exist, an operator can apply `seeds/demo-accounts.sql` to the intended database to mark them for demo sign-in, and `seeds/demo-administrator.sql` to create the separate demo administrator. These files do not change real users or enable access. Review the target database before running them.
