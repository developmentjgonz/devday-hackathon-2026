# Mews — Team JS

Mews is Team JS's project for the [DevDay Exchange Community Hackathon](https://deepstation.ai/hackathons/vtl7ctbeihnikitvjwl3941h). We have chosen the **Mangrove Mews cat colony tracking challenge**.

Mangrove Mews helps a small rescue turn intentional field reports, exported chat history, photos, and approximate locations into an operating picture that a coordinator can act on the same day.

**Status:** This branch contains a local, persisted, synthetic-only demo. `npm run dev:full` runs the React workspace through a loopback-only adapter with SQLite and local private-photo storage. The Worker is structured for Cloudflare D1/R2, but a remote deployment is not claimed or required for the demo. It uses fictional cats, messages, photos, and deliberately approximate locations only.

## What is implemented

- A responsive Workspace for Founder/Admin, Coordinator, and Volunteer roles, with server-backed local demo sign-in and route permissions.
- Intentional web, SMS-relay, and WhatsApp **Export chat** intake. The raw synthetic messages are parsed into traceable reports and a stored canonical census; the app never automates a live WhatsApp chat.
- Human-controlled duplicate review: candidate evidence is scored, but a person selects the canonical cat and records the merge rationale.
- Today’s operations board groups open urgent reviews and shows missing feeding confirmations, care cases, and uncertain intake. A configurable 0.75 routing threshold holds weak colony matches for clarification; assigned volunteers reply and managers verify counts without replacing source evidence.
- A private, stored-census Miami-Dade/Broward field map with Google Maps support, layer/radius controls, approximate anchors, hazards, and a fallback preview if Maps is unavailable.
- A clearly labeled fictional tracker animation, planning weather, feeding schedules, durable browser outbox/retry, and fictional chat/SMS/photo fixtures for the demo.
- Private-photo upload and review for fictional demo images: the browser re-encodes selected images to strip metadata before upload, and access is role/uploader scoped in the local demo.
- A bounded Agents SDK triage/search experience. It is deterministic by default; an API key is opt-in for local testing. It recommends rather than merges records, changes sensitive statuses, or claims to locate an animal.
- Persistent missing-cat cases with manager-confirmed status changes, saved agent/search plans, timestamped field feedback, immediate unsafe-zone exclusion, and an internal map layer. Task dispatch still requires a human access/safety review.
- Community-signal review UI that accepts only deliberate, redacted text; it does not scrape social platforms, fetch arbitrary URLs, or automatically create animal records.
- Actual OpenAI image comparison with two photo inputs, saved visible-feature evidence, caching, and a separate human decision. It never merges cats automatically.
- Global record search, a personal My shift agenda, care appointments, bounded supply pledges, and acknowledged daily handoffs.
- A 72-report multilingual weekend scenario spanning 18 fictional colonies and 31 additional named cats, plus two duplicate candidates and an alternate generated Marmalade photo.

## Deployment status

The checked demo path is local: `npm run dev:full` uses a loopback-only Vite adapter, Node's SQLite support, and filesystem-backed private-photo objects. It seeds four synthetic accounts and applies the repository migrations locally. It is not a production deployment.

The Worker code and migrations are designed for D1/R2-style bindings, but remote D1/R2 configuration, production identity, persistent secrets, ingestion webhooks, monitoring, and a deployed URL must be completed and reviewed before any field use. See [infrastructure.md](docs/infrastructure.md) for the intended infrastructure shape; do not treat it as a record of a live deployment.

## Project guide

- [Project brief](PROJECT_BRIEF.md): the problem, intended users, and proposed scope.
- [Architecture](docs/architecture.md): directory boundaries and the agreed technology direction.
- [Roadmap](docs/roadmap.md): planned work and current progress.
- [Decision records](docs/decisions/README.md): significant choices and their reasons.
- [Component library](docs/component-library.md): where components and theme tokens live, and how to extend the gallery.
- [Infrastructure](docs/infrastructure.md): dedicated Cloudflare resources, deployment, and health checks.
- [Local skills](.agents/skills/README.md): installed guidance and source revisions.
- [Feature map](.agents/skills/verify-mews/references/features/README.md): implemented user-visible behavior and verification notes.
- [Demo runbook](docs/demo-runbook.md): a guided judge-ready walkthrough with the synthetic chats and SMS relays.
- [Feature pass 6](docs/feature-pass-6.md): current rating, new review/search workflows, and local verification evidence.
- [Feature pass 7](docs/feature-pass-7.md): real image analysis, five practical field tools, the expanded scenario, and current verification.
- [Current regrade — pass 8](docs/feature-pass-8-regrade.md): 8.6/10 local-demo estimate, replay integrity, simpler workday navigation, and 50 passing tests.
- [Hosted demo setup](docs/hosted-demo-setup.md): the isolated D1/R2 deployment path and the current account-permission blocker.

## Directory boundaries

| Directory | Responsibility |
| --- | --- |
| `src/` | React frontend, with related UI grouped under `features/` |
| `worker/` | Cloudflare API routes, application services, and database queries |
| `shared/` | Validation schemas and types shared across the API boundary |
| `migrations/` | Versioned D1 database schema changes |
| `public/` | Public static frontend assets |
| `tests/` | Unit, integration, and user-journey tests, plus fictional fixtures |
| `docs/` | Architecture, plans, and decision records |
| `.agents/skills/` | Agent instructions and their supporting references |

Empty implementation folders contain `.gitkeep` so Git can preserve the reviewed structure. Replace each marker when its folder receives a real file.

## Local development

Use Node.js 24 or newer (the local persisted demo uses `node:sqlite`; see `.nvmrc`). This pass was verified on Node 26.5.0.

```sh
npm ci
npm run dev:full
```

Open [the local app](http://127.0.0.1:5197/).

Start the component workspace separately:

```sh
npm run storybook
```

Open [Storybook](http://127.0.0.1:6006/) to browse components, change their controls, and read their generated documentation. Stories use temporary sample state.

```sh
npm run build       # Type-check and build production assets
npm run typecheck   # Type-check without bundling
npm run preview     # Serve the production build on port 4197
npm run build-storybook # Build the separate component workspace
```

## Configuration

Copy `.dev.vars.example` to `.dev.vars` for local Worker development. Do not commit `.dev.vars`.

```sh
cp -n .dev.vars.example .dev.vars
```

For `npm run dev`, copy `.env.example` to `.env.local` and add the same browser-restricted Maps key. The Vite server supplies it through the local `/api/config` endpoint; it is not added to the static bundle.

```sh
cp -n .env.example .env.local
```

`OPENAI_API_KEY` is only consulted when `MEWS_ENABLE_OPENAI=1` enables the server-side triage path. Without both, the triage route remains available in deterministic demo mode.

With the key configured in the ignored local file, start live agent mode with `MEWS_ENABLE_OPENAI=1 npm run dev:full`. An authenticated synthetic phone submission was verified with a persisted `agent` assessment. Existing imports keep their original mode; duplicate replays do not call the model again.

`GOOGLE_MAPS_BROWSER_KEY` enables the Google Maps basemap. It is a browser key (not a secret), but must be limited by HTTP referrer and enabled only for the Maps JavaScript API. Exact rescue data must never be embedded in public JavaScript.

The frontend uses React, TypeScript, Vite, Tailwind CSS v4, shadcn/ui with Base UI primitives, and the OpenAI Agents SDK. The fictional demo images are public assets only for the hackathon. In production, volunteer uploads belong in access-controlled R2 storage.
