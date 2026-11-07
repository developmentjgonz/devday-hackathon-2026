# Architecture

Status: the local React frontend has separate public and workspace shells with placeholder content. Storybook is the separate local component workspace. A dedicated Cloudflare Worker serves the deployed frontend with a D1 health endpoint.

Product-specific folders still reserve responsibilities. Product features, API endpoints, database tables, authentication, and AI integrations have not been designed.

## System

The frontend uses Vite, React, TypeScript, React Router in Data Mode, Tailwind CSS v4, and shadcn/ui. The installed shadcn components use Base UI primitives. A Cloudflare Worker serves `dist/` and `/api/health`, with a dedicated D1 binding. R2 remains a future storage direction; no bucket is provisioned.

`src/router.tsx` defines frontend routes with `createBrowserRouter`. `src/main.tsx` renders its `RouterProvider`. The root `App` component owns shared route behavior: the skip link, focus on the main region after a path change, and scroll restoration. Layouts own their separate headers and navigation. See [the routing decision](decisions/0001-react-router.md) and [the layout decision](decisions/0002-public-and-workspace-layouts.md).

| Route | Layout | Current content |
| --- | --- | --- |
| `/` | `SiteLayout` | Landing placeholder with links to the workspace |
| `/app` | `AppLayout` | Overview placeholder |
| `/app/*` when unmatched | `AppLayout` | Not-found page with a link to `/app` |
| Other unmatched paths | `SiteLayout` | Not-found page with a link to `/` |

The root route has an error boundary with reload and home actions. Page components set their document title. No authentication guard or product feature routes are implemented. `/app` is a route boundary, not an access-control boundary.

Browser requests go through the Worker for protected application operations. Worker instances must not be relied on for persistent state. API secrets stay on the server.

## Code boundaries

- `src/features/<area>/pages/` owns feature page content. Landing and overview are the first implemented areas. Feature components, hooks, and local types stay in their feature folder as they are introduced. Colony, cat, and report folders remain reserved.
- `src/components/` owns UI reused across feature areas. `src/lib/` owns frontend infrastructure such as the API client.
- `src/components/layout/` owns `SiteLayout`, `AppLayout`, the app sidebar, and the skip link. `src/components/brand.tsx` and `src/components/page-header.tsx` provide shared composition. Keep the public and app layouts separate instead of using mode flags on one layout.
- `src/pages/` owns cross-feature not-found and route-error pages.
- `src/components/ui/` contains the installed shadcn component source and colocated `*.stories.tsx` examples. `.storybook/` owns Storybook configuration. The custom gallery has been removed.
- `src/styles/tokens.css` owns shared theme values. `src/styles/globals.css` imports the theme and connects its semantic values to Tailwind utilities. Layouts use these semantic values rather than separate color definitions.
- `worker/routes/` is reserved for HTTP requests and responses. `worker/services/` is reserved for application operations, including AI calls if introduced. `worker/db/` is reserved for database queries.
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

`worker/index.js` serves the static app and a read-only D1 connectivity check. `wrangler.jsonc` names the project's Worker, asset binding, and database. It contains resource identifiers, not credentials. No product data model has been created. See [infrastructure.md](infrastructure.md).

## Separate builds

`npm run build` produces the app in `dist/`. `npm run build-storybook` produces the component workspace in `storybook-static/`. Story files are type-checked, but they are not imported by the app entry point. Storybook and its documentation addon are development dependencies.

React Doctor is a development dependency for manual reviews with `npm exec -- react-doctor`. It has no script, build, hook, or CI integration.
