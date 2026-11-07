# Architecture

Status: the React frontend is a Hello shell, Storybook is the separate local component workspace, and a dedicated Cloudflare Worker serves the deployed shell with a D1 health endpoint.

Product-specific folders still reserve responsibilities. Product features, API endpoints, database tables, authentication, and AI integrations have not been designed.

## System

The frontend uses Vite, React, TypeScript, Tailwind CSS v4, and shadcn/ui. The installed shadcn components use Base UI primitives. A Cloudflare Worker serves `dist/` and `/api/health`, with a dedicated D1 binding. R2 remains a future storage direction; no bucket is provisioned.

Browser requests go through the Worker for protected application operations. Worker instances must not be relied on for persistent state. API secrets stay on the server.

## Code boundaries

- `src/features/<area>/` owns UI specific to colonies, cats, or reports. Feature components, hooks, and local types stay together as they are introduced.
- `src/components/` owns UI reused across feature areas. `src/lib/` owns frontend infrastructure such as the API client.
- `src/components/ui/` contains the installed shadcn component source and colocated `*.stories.tsx` examples. `.storybook/` owns Storybook configuration. The custom gallery has been removed.
- `src/styles/tokens.css` owns the stock theme values. `src/styles/globals.css` imports the theme and connects its semantic values to Tailwind utilities. The final visual identity has not been chosen.
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
