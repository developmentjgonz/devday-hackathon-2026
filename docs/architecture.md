# Architecture

Status: the React frontend foundation and component gallery are implemented locally. No hosted services are configured.

Product-specific folders still reserve responsibilities. Product features, API endpoints, database tables, authentication, and AI integrations have not been designed.

## System

The frontend uses Vite, React, TypeScript, Tailwind CSS v4, and shadcn/ui. The installed shadcn components use Base UI primitives. Cloudflare Workers, D1, and R2 remain the agreed direction for future API, database, and file-storage work.

Browser requests go through the Worker for protected application operations. Worker instances must not be relied on for persistent state. API secrets stay on the server.

## Code boundaries

- `src/features/<area>/` owns UI specific to colonies, cats, or reports. Feature components, hooks, and local types stay together as they are introduced.
- `src/components/` owns UI reused across feature areas. `src/lib/` owns frontend infrastructure such as the API client.
- `src/components/ui/` contains the installed shadcn component source. `src/features/component-gallery/` contains the gallery and its temporary examples.
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

`worker/index.ts` and `wrangler.jsonc` have not been added. They will be configured when API work is agreed.
