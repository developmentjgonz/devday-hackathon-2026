# Local accounts

Use Node.js 24. Run `npm ci`, then `npm run dev`. The development command applies local D1 migrations, adds missing test users, and starts Vite and the Worker.

Open [local sign-in](http://127.0.0.1:5197/sign-in). Use this exact `127.0.0.1` address: the server checks the configured app origin. The API runs on port 8797. Database files stay in `.wrangler/state/`, which Git ignores.

## Seeded users

All details are fictional. No passwords are needed.

| Name | Email | Role | Status |
| --- | --- | --- | --- |
| Alex Morgan | `admin@mews.test` | Administrator | Active |
| Sam Rivera | `member@mews.test` | Member | Active |
| Jordan Lee | `pending@mews.test` | Member | Pending |
| Taylor Reed | `suspended@mews.test` | Member | Suspended |

Select **Sign in** beside an account. Active users can enter `/app`. Pending and suspended users can see their status and sign out, but cannot read the protected workspace API.

Select **Create a test user** to try signup. Name and email are required; phone is optional. The server always assigns the member role and pending status. Signup cannot grant administrator access or sign in to an existing account.

New users persist and appear on the sign-in page after sign-out. Re-running the seed adds missing fixtures without changing saved profiles or statuses.

The administrator role is reserved for full application access. Additional roles and rescue permissions remain open. Administrator management screens are not included.

## Test approval

Approve the pending fixture in the local database:

```sh
npx wrangler d1 execute DB --local --command "UPDATE users SET status = 'active', approved_by = 'local-admin', approved_at = unixepoch() WHERE id = 'local-pending'"
```

Select **Check access** on the account status page. To restore the pending fixture:

```sh
npx wrangler d1 execute DB --local --command "UPDATE users SET status = 'pending', approved_by = NULL, approved_at = NULL WHERE id = 'local-pending'"
```

Use a new user's exact local ID to test their approval. Keep `--local` on these commands.

## Implementation

- `migrations/0001_accounts.sql`: users, provider identities, and sessions.
- `seeds/local.sql`: fictional fixtures, outside production migrations.
- `worker/routes/auth.ts`: Hono routes for local sign-in, signup, session lookup, and sign-out.
- `worker/middleware/auth.ts`: local-only, same-origin, and active-account checks.
- `worker/middleware/validation.ts` and `shared/schemas/auth.ts`: JSON size limits and Zod input validation.
- `worker/services/`: account creation and server session operations.
- `worker/db/`: typed D1 queries for accounts and sessions.
- `src/features/auth/`: account pages and route loaders.
- `/api/workspace`: protected workspace entry. Future private endpoints must use the same server check.

Sessions expire after 12 hours. D1 stores token hashes; the browser receives an HttpOnly, SameSite cookie. HTTPS responses also use Secure cookies. Protected requests read the current user, so approval, suspension, and role changes take effect within an existing session.

Test sign-in requires `LOCAL_TEST_SIGN_IN=true` and an HTTP localhost request. The development command supplies the flag; deployment configuration does not. Public hostnames cannot expose local sign-in even if the flag is set by mistake. Mutations must come from `APP_ORIGIN`.

Google sign-in, public production signup, invitations, administrator screens, and production administrator setup are deferred. A future Google provider can connect through `sign_in_identities` while retaining the same users and approval checks.

## Other commands

```sh
npm run local:setup  # Apply local migrations and seed missing accounts
npm run test:auth    # Check signup, sessions, and access rules
npm run build       # Check TypeScript and production build
```

For a production-build preview, start the API with the preview origin:

```sh
npx wrangler dev --local --ip 127.0.0.1 --port 8797 --var LOCAL_TEST_SIGN_IN:true --var APP_ORIGIN:http://127.0.0.1:4197
```

In a second terminal, run `npm run build` and `npm run preview`.
