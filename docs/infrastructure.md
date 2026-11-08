# Cloudflare infrastructure

Dedicated resources were created for this project in the user's existing paid Cloudflare account. The current migrations are applied to remote D1 and the private R2 upload bucket is provisioned. Local and live data are separate. Fictional seeds are for local development only; do not apply them to remote D1. See [local accounts](local-accounts.md) and [Google sign-in](google-sign-in.md).

| Resource | Name | Management |
| --- | --- | --- |
| Worker and static app assets | `devday-js-2026` | [Cloudflare dashboard](https://dash.cloudflare.com/d4501cb4c3a0ec6b4b67b051d83d3a30/workers/services/view/devday-js-2026/production) |
| D1 database | `devday-js-2026-db` | [Cloudflare dashboard](https://dash.cloudflare.com/d4501cb4c3a0ec6b4b67b051d83d3a30/workers/d1/databases/5e49e8ba-625a-4954-9ebc-10d7f3100b90) |
| Private R2 uploads | `devday-js-2026-uploads` | Cloudflare R2 dashboard |

## Live URLs

| Endpoint | URL |
| --- | --- |
| App | [devday-js-2026.deal-finder.workers.dev](https://devday-js-2026.deal-finder.workers.dev/) |
| API health | [devday-js-2026.deal-finder.workers.dev/api/health](https://devday-js-2026.deal-finder.workers.dev/api/health) |

Both endpoints are public. Cloudflare dashboard links require an account with access to the resources. The app uses the Worker's `workers.dev` address; no custom domain is configured in `wrangler.jsonc`.

## Source and configuration

- `worker/index.ts`: Hono API route groups and static asset fallback; `worker/routes/health.ts` checks D1.
- `wrangler.jsonc`: Worker name, account, static assets, the D1 `DB` binding, and the private R2 `UPLOADS` binding.
- `dist/`: compiled app assets; generated and ignored by Git.

Resource identifiers in the configuration are not API credentials. Wrangler uses the developer's existing Cloudflare login. Keep credentials out of the repository.

## Current behavior

The Worker serves the app and its public and authenticated API routes. `GET /api/health` executes `SELECT 1 AS ok` through the database binding and returns a no-cache JSON response indicating connectivity. Database failures return 503, unsupported health methods return 405, and unknown `/api` paths return JSON 404.

The live Google sign-in and administrator account were verified in Chrome. A disposable colony, cat, report, and task remained available after refresh; the test records were then removed. Google OAuth is in testing mode and only listed test users can sign in.

On November 7, 2026, both live URLs returned HTTP 200. The health response was:

```json
{"ok":true,"service":"devday-js-2026","database":"connected"}
```

## GitHub Actions deployment

The [Build and deploy to Cloudflare workflow](https://github.com/developmentjgonz/devday-hackathon-2026/actions/workflows/cloudflare.yml) is defined in [`.github/workflows/cloudflare.yml`](../.github/workflows/cloudflare.yml).

| Trigger | Checks | Deploys to the live Worker |
| --- | --- | --- |
| Push to `main` | Yes | No |
| Push to `release` | Yes | Yes, after checks pass |
| Pull request to `main` or `release` | Yes | No |
| Manual run | Yes | Only when the selected branch is `release` |

Checks install dependencies, build the app and Storybook, and validate the Worker bundle with a Wrangler dry run. CI uses Node.js 22 and Wrangler 4.158.0. Storybook is built for validation; its output is not deployed.

Deployment uses the repository's `CLOUDFLARE_API_TOKEN` Actions secret. Resource identifiers and bindings come from [`wrangler.jsonc`](../wrangler.jsonc). After deployment, the workflow checks the app URL and requires the health response shown above.

The [verified release run](https://github.com/developmentjgonz/devday-hackathon-2026/actions/runs/42438124376) deployed commit [`6110353`](https://github.com/developmentjgonz/devday-hackathon-2026/commit/61103537adece588ad8c018099cae6540808bdd0).

The release workflow does not apply D1 migrations. Before deploying code that requires a new schema, review and apply the required migrations to the intended database with `npx wrangler d1 migrations apply DB --remote`. Do not apply the local seed files to the live database.

## Build and deploy

From an authenticated Cloudflare development environment:

```sh
npm ci
npm run build
npx --yes wrangler@4.158.0 whoami
npx --yes wrangler@4.158.0 deploy
```

The `whoami` command checks the active Cloudflare login before deployment. Manual deployment publishes the current local build; it does not use the workflow's `release` branch condition.

For local Worker, asset, and D1 binding development after building the app, use `npx --yes wrangler@4.158.0 dev`. The separate Vite server serves only the frontend; it does not provide the Worker health API. Storybook is a separate local workspace and is not part of this deployment.
