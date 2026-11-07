# Architecture

Status: agreed directory structure and technology direction. No application runtime or hosted services are configured yet.

The folders reserve responsibilities. Specific features, API endpoints, database tables, authentication, and AI integrations have not been designed.

## System

The frontend will use Vite, React, and TypeScript. A Cloudflare Worker will provide the API. Persistent structured records will live in D1, and uploaded files will live in R2.

Browser requests go through the Worker for protected application operations. Worker instances must not be relied on for persistent state. API secrets stay on the server.

## Code boundaries

- `src/features/<area>/` owns UI specific to colonies, cats, or reports. Feature components, hooks, and local types stay together as they are introduced.
- `src/components/` owns UI reused across feature areas. `src/lib/` owns frontend infrastructure such as the API client.
- `worker/routes/` is reserved for HTTP requests and responses. `worker/services/` is reserved for application operations, including AI calls if introduced. `worker/db/` is reserved for database queries.
- `shared/schemas/` owns runtime validation contracts used across the API boundary. `shared/types/` owns additional shared types; infer types from validation schemas when possible.
- `migrations/` owns ordered database changes. Application validation schemas and database schemas serve different purposes.
- `public/` holds assets safe for public delivery. User uploads and private colony data do not belong there.

## Documentation boundaries

- `PROJECT_BRIEF.md` describes the problem, users, scope, and open product questions.
- `docs/roadmap.md` tracks planned work and implementation status.
- `docs/decisions/` records significant technical choices when they are made.
- `.agents/skills/verify-mews/references/features/` will describe implemented user behavior and ways to verify it. It starts with a reserved index, not claims about functionality that exists.

## Runtime files to introduce at initialization

Vite initialization will add `index.html`, `src/main.tsx`, `src/App.tsx`, `package.json`, `package-lock.json`, `vite.config.ts`, and TypeScript configuration. Worker setup will add `worker/index.ts` and `wrangler.jsonc` with actual project settings.

The reviewed folders are reserved now. Dependencies and runtime files will be added in the next setup steps rather than represented by empty configurations.
