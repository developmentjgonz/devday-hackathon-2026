# Demo sign-in

An active administrator can open **Configuration** and enable or disable demo sign-in. When it is enabled, anyone who can reach the site can use a designated fictional member account to view and change workspace data. Turning it off immediately ends demo sessions.

Demo sign-in is separate from Google sign-in and local test sign-in. Demo accounts cannot sign in as Google users or become administrators. Pending and suspended accounts cannot enter the workspace. The public local signup endpoint remains disabled.

The setting starts off. After the fictional accounts exist, an operator can apply `seeds/demo-accounts.sql` to the intended database to mark them for demo sign-in. The file selects only the known fictional member accounts; it does not change real users, create accounts, or enable access. Review the target database before running it.
