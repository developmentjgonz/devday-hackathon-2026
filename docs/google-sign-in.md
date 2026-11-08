# Google sign-in

The live workspace uses Google OpenID Connect and the existing D1 session and approval model. The first Google account whose verified, Google-authoritative email matches `GOOGLE_ADMIN_EMAIL` becomes an active administrator if there is no administrator yet. Every other new Google identity starts pending. Existing users are matched by Google's stable subject ID; accounts are not linked by email alone. Suspended and pending accounts cannot read the workspace API.

The OAuth flow uses a signed, short-lived HttpOnly state cookie, PKCE, nonce, and a server-side code exchange. The Worker verifies the ID token signature, issuer, audience, expiry, nonce, and verified email against Google's public keys. Google access and ID tokens are not retained. The app creates its existing 12-hour, server-side session after sign-in.

## Google Cloud configuration

Use a dedicated Google Cloud project and configure Google Auth Platform for an external app. The support address is displayed on the Google consent screen. Google restricts it to the signed-in Google account or a Google Group that account manages. Add the following web application redirect URI to the OAuth client:

```text
https://devday-js-2026.deal-finder.workers.dev/api/auth/google/callback
```

For an app still in testing, follow Google Cloud's current test-user and verification rules before inviting people. The app requests only `openid`, `email`, and `profile`. The privacy and terms pages must be completed before a public release.

## Cloudflare configuration

Apply migrations to the intended remote D1 database and create the private R2 bucket named in `wrangler.jsonc`. Add these Worker secrets using Wrangler's interactive prompt or the Cloudflare dashboard; never commit the values:

- `GOOGLE_CLIENT_ID`: the OAuth client ID.
- `GOOGLE_CLIENT_SECRET`: the OAuth client secret.
- `GOOGLE_REDIRECT_URI`: the exact callback URI shown above.
- `GOOGLE_ADMIN_EMAIL`: the first administrator's Google-authoritative email.

For example, `npx wrangler secret put GOOGLE_CLIENT_SECRET` prompts for a value without requiring it in a shell command. Configure all four before deploying the release branch. Google sign-in is hidden when configuration is incomplete. A local HTTP callback is allowed only on localhost; live callback URIs must use HTTPS.

The live database currently contains the fictional demo records requested for the hackathon. Local and live databases are separate. Do not apply local seed files to live data without reviewing the target and the contents. An administrator can turn [demo sign-in](demo-access.md) on or off; Google sign-in remains separate.

Verify a release by signing in as the designated administrator, creating a colony, cat, report with a small attachment, and task, and checking them after refresh. Then check a second Google account remains pending until approved. Remove any disposable verification records through supported product workflows when available; do not assume refreshing resets live data.
