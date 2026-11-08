# Production authentication setup

`worker/auth.js` is server-side infrastructure for real rescue access. It is not connected to the demo-role selector in the browser, which must never be treated as authorization.

## Before enabling routes

1. Apply `migrations/0002_auth.sql` to the intended D1 database.
2. Set `APP_ORIGIN` as a Worker secret to the one canonical HTTPS origin, for example `https://app.example.org`. Do not include a trailing slash. Requests that do not send this exact `Origin` fail closed for login and CSRF-protected mutations.
3. The Worker login route applies a D1-backed IP/account attempt limit and requires Cloudflare's `CF-Connecting-IP` header. Add edge-level abuse protection and monitoring before any production launch. The module does not provide public self-registration or default credentials.
4. Create the first administrator only through a one-time, access-controlled operational script that calls `provisionUser`. Never place a password in a migration, fixture, browser bundle, issue, or shell history.
5. Run periodic cleanup for expired/revoked rows in `user_sessions`.

## Route integration pattern

For a login endpoint, validate JSON/body sizes and apply rate limiting first. Then call `loginWithPassword(env, request, credentials)`. On success, return a `Response` with `sessionHeaders(session)`; on failure return a generic invalid-credentials response. Do not distinguish unknown email from incorrect password.

For an authenticated read route:

```js
const auth = await requireRole(request, env, ["admin", "coordinator", "volunteer"]);
if (!auth.ok) return auth.response;
// auth.session.user is the server-verified identity
```

For every state-changing route, require a role and CSRF check:

```js
const auth = await requireRole(request, env, ["admin", "coordinator"], { csrf: true });
if (!auth.ok) return auth.response;
```

The `mews_session` cookie is `HttpOnly; Secure; SameSite=Lax`. The separate `mews_csrf` cookie is readable by same-origin JavaScript only so it can be echoed as `X-CSRF-Token`; the server checks the request `Origin`, equality with that cookie, and the per-session server hash. Cookie-based requests must use `credentials: "same-origin"`.

## Security limits

- Only password hashes (PBKDF2-SHA-256 with a unique salt) and SHA-256 session/CSRF token hashes are stored.
- Session values are opaque 256-bit random tokens, expire after eight hours, and can be revoked server-side.
- The private intake, review, feeding, photo, and aggregate CSV endpoints require server-side role checks. The existing static demo screens and demo persona selector are separate; they do not enforce access to real information. Exact-location production APIs and verified membership are not implemented.
- A production deployment should add account recovery, MFA for administrators, login/IP rate limiting, security-event auditing, user disablement workflow, and a CSP.
