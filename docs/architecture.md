# Architecture

Status: the local React frontend has separate public and workspace shells with placeholder rescue content, local test sign-in, and server sessions. Storybook is the separate local component workspace. A dedicated Cloudflare Worker serves the last deployed frontend with a D1 health endpoint. The account work has not been deployed.

Rescue-specific folders still reserve responsibilities. Account tables and endpoints are implemented locally. Rescue features, their database tables, Google sign-in, and AI integrations remain open.

## System

The frontend uses Vite, React, TypeScript, React Router in Data Mode, Tailwind CSS v4, and shadcn/ui. The installed shadcn components use Base UI primitives. The local backend uses Hono and strict TypeScript on Cloudflare Workers, with Zod for input validation and D1 for account data. The deployed Worker serves `dist/` and `/api/health`. R2 remains a future storage direction; no bucket is provisioned.

`src/router.tsx` defines frontend routes with `createBrowserRouter`. `src/main.tsx` renders its `RouterProvider`. The root `App` component owns shared route behavior: the skip link, focus on the main region after a path change, and scroll restoration. Layouts own their separate headers and navigation. See [the routing decision](decisions/0001-react-router.md) and [the layout decision](decisions/0002-public-and-workspace-layouts.md).

| Route | Layout | Current content |
| --- | --- | --- |
| `/` | `SiteLayout` | Landing placeholder with links to the workspace |
| `/community` | `SiteLayout` | Three sample volunteer openings and three sample news posts; fictional content in `src/features/community/data/sample-posts.ts`, with no live feed or publishing workflow |
| `/privacy` | `SiteLayout` | Privacy Policy page shell; policy text is not yet supplied |
| `/terms` | `SiteLayout` | Terms page shell; terms text is not yet supplied |
| `/sign-in` | `AccountLayout` | Local test account picker |
| `/sign-up` | `AccountLayout` | Local signup with optional phone; creates a pending member |
| `/account-status` | `AccountLayout` | Pending approval or suspended access |
| `/app` | `AppLayout` | Personal overview greeting |
| `/app/inbox` | `AppLayout` | Interactive local inbox with fictional reports; review, questions, duplicates, and linked care tasks remain in component memory. See [inbox scope](inbox.md). |
| `/app/*` when unmatched | `AppLayout` | Not-found page with a link to `/app` |
| Other unmatched paths | `SiteLayout` | Not-found page with a link to `/` |

The root route has loading and error boundaries. Page components set their document title. The `/app` loader requests `/api/workspace`, which checks the server session and requires an active account. Signed-out users return to `/sign-in`; pending or suspended users return to `/account-status`. Future protected APIs must perform their own server check.

Account users, provider identities, and hashed session tokens are stored in D1. Roles are separate from account status. Test sign-in requires an explicit server flag and an HTTP localhost address. Seed fixtures live outside migrations. See [the account decision](decisions/0003-local-accounts.md) and [local setup](local-accounts.md).

Browser requests go through the Worker for protected application operations. Worker instances must not be relied on for persistent state. API secrets stay on the server.

## Code boundaries

- `src/features/<area>/pages/` owns feature page content. Landing and overview are the first implemented areas. Feature components, hooks, and local types stay in their feature folder as they are introduced. Colony, cat, and report folders remain reserved.
- `src/components/` owns UI reused across feature areas. `src/lib/` owns frontend infrastructure such as the API client.
- `src/components/layout/` owns `SiteLayout`, `AppLayout`, the app sidebar, and the skip link. `src/components/brand.tsx` and `src/components/page-header.tsx` provide shared composition. Keep the public and app layouts separate instead of using mode flags on one layout.
- `src/pages/` owns cross-feature not-found, route-loading, and route-error pages.
- `src/components/ui/` contains the installed shadcn component source and colocated `*.stories.tsx` examples. `.storybook/` owns Storybook configuration. The custom gallery has been removed.
- `src/styles/tokens.css` owns shared theme values. `src/styles/globals.css` imports the theme and connects its semantic values to Tailwind utilities. Layouts use these semantic values rather than separate color definitions.
- `worker/index.ts` connects Hono route groups, API cache policy, method handling, error handling, and frontend asset fallback. Unknown API paths return JSON 404 responses instead of frontend HTML.
- `worker/routes/` owns HTTP requests and responses. Keep account operations and account SQL outside route handlers.
- `worker/middleware/` owns local sign-in, origin, active-account, JSON content-type, body-size, and schema checks. Protected routes receive the current user through typed Hono context.
- `worker/services/` owns account creation and session operations. `worker/db/` owns account and session queries. Queries use bound parameters and typed results; no ORM is installed.
- `worker/lib/` owns shared error handling. `worker/types.ts` defines Hono bindings and context variables. No request-specific data is stored in module variables.
- `shared/schemas/` owns runtime validation contracts used across the API boundary. `shared/types/` owns additional shared types; infer types from validation schemas when possible.
- `migrations/` owns ordered database changes. Application validation schemas and database schemas serve different purposes.
- `public/` holds assets safe for public delivery. User uploads and private colony data do not belong there.

## Documentation boundaries

- `PROJECT_BRIEF.md` describes the problem, users, scope, and open product questions.
- `docs/roadmap.md` tracks planned work and implementation status.
- `docs/decisions/` records significant technical choices when they are made.
- `.agents/skills/verify-mews/references/features/` describes implemented user behavior and ways to verify it. The component gallery is the first entry; the verification skill itself remains inactive.

## Runtime files

`index.html`, `src/main.tsx`, `src/App.tsx`, `package.json`, `package-lock.json`, `vite.config.ts`, and TypeScript configuration now support the frontend. `components.json` records shadcn's component paths, aliases, and default preset.

`worker/index.ts` serves static assets, account routes, a protected workspace endpoint, and the D1 health check. `wrangler.jsonc` names the Worker, asset binding, and database. It contains resource identifiers, not credentials. `migrations/0001_accounts.sql` defines the account schema; no rescue data model has been created. See [infrastructure.md](infrastructure.md).

`tsconfig.worker.json` checks all Worker and shared code with `strict` and `noUncheckedIndexedAccess`. `npm run cf:typegen` generates binding and runtime declarations from Wrangler configuration into the ignored `worker/worker-configuration.d.ts`. Development, type checks, and app builds run this command automatically. Use Workers runtime types in the backend, rather than browser DOM or Node.js globals. See the [backend decision](decisions/0004-hono-typescript-backend.md).

## Separate builds

`npm run build` produces the app in `dist/`. `npm run build-storybook` produces the component workspace in `storybook-static/`. Story files are type-checked, but they are not imported by the app entry point. Storybook and its documentation addon are development dependencies.

React Doctor is a development dependency for manual reviews with `npm exec -- react-doctor`. It has no script, build, hook, or CI integration.
