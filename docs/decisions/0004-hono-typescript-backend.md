# 0004: Hono and TypeScript for the Worker backend

Date: 2026-11-07

Status: Accepted

## Context

The backend used JavaScript, manual URL checks, and handwritten profile validation. Account routes also contained SQL. The user requested Hono, TypeScript, and clearer code organization before adding more APIs.

## Decision

Use Hono on the existing Cloudflare Worker. Keep D1 and the current account schema. Use Zod schemas in `shared/schemas/` for validated inputs and inferred input types.

Separate HTTP routes, reusable middleware, application services, and database queries. Use typed Hono bindings and context for the current user. Keep API errors as JSON, API responses uncached, unknown API routes separate from frontend asset fallback, and unsupported methods as 405 responses with an Allow header. Hono handles HEAD requests for GET routes.

Generate Cloudflare types with Wrangler. Check all Worker and shared code with a dedicated strict TypeScript configuration as part of the normal build. Keep generated runtime declarations out of Git.

Keep the account integration tests. They send requests through the Hono app and run the actual account SQL against an in-memory SQLite database. Also check the Worker bundle and run a local Workers smoke test to cover runtime integration.

## Consequences

New APIs have a clear place for routing, access checks, validation, application operations, and SQL. The frontend can import validation contracts when needed. These changes do not add production sign-in or deploy the app. The backend uses the same Worker and D1 resources.
