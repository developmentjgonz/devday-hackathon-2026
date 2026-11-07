# Cloudflare infrastructure

Dedicated resources were created for this project in the user's existing paid Cloudflare account. No application tables or product schema have been created.

| Resource | Name | Management |
| --- | --- | --- |
| Worker and static app assets | `devday-js-2026` | [Cloudflare dashboard](https://dash.cloudflare.com/d4501cb4c3a0ec6b4b67b051d83d3a30/workers/services/view/devday-js-2026/production) |
| D1 database | `devday-js-2026-db` | [Cloudflare dashboard](https://dash.cloudflare.com/d4501cb4c3a0ec6b4b67b051d83d3a30/workers/d1/databases/5e49e8ba-625a-4954-9ebc-10d7f3100b90) |

App: https://devday-js-2026.deal-finder.workers.dev/

Health: https://devday-js-2026.deal-finder.workers.dev/api/health

## Source and configuration

- `worker/index.js`: static asset routing and `/api/health`.
- `wrangler.jsonc`: Worker name, account, static assets, and the D1 `DB` binding.
- `dist/`: compiled app assets; generated and ignored by Git.

Resource identifiers in the configuration are not API credentials. Wrangler uses the developer's existing Cloudflare login. Keep credentials out of the repository.

## Current behavior

The root displays only Hello. `GET /api/health` executes `SELECT 1 AS ok` through the database binding and returns a no-cache JSON response indicating connectivity. Database failures return 503, unsupported health methods return 405, and unknown `/api` paths return JSON 404. The route does not read product records or accept writes.

The deployment was checked in Chrome, its HTML/JS/CSS matched the local `dist/` output, and the health request succeeded against the remote D1 binding. A schema inspection confirmed no application tables.

## Build and deploy

From an authenticated Cloudflare development environment:

```sh
npm ci
npm run build
npx wrangler deploy
```

For local Worker, asset, and D1 binding development after building the app, use `npx wrangler dev`. The separate Vite server serves only the frontend; it does not provide the Worker health API. Storybook is a separate local workspace and is not part of this deployment.
