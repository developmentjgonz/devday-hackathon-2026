# Mews — Team JS

Mews is Team JS's project for the [DevDay Exchange Community Hackathon](https://deepstation.ai/hackathons/vtl7ctbeihnikitvjwl3941h). We have chosen the **Mangrove Mews cat colony tracking challenge**.

Mangrove Mews helps a small rescue turn intentional field reports, exported chat history, photos, and approximate locations into an operating picture that a coordinator can act on the same day.

**Status:** The feature branch now contains the responsive end-to-end demo: report intake, chat/SMS demo history, private map layers, urgent review, cat/colony records, missing-cat search tasks, and bounded OpenAI Agents SDK triage. It uses fictional cats, messages, photos, and deliberately approximate locations only.

## What is implemented

- Responsive coordinator, volunteer, and mobile-ready report experience (the three requested roles remain simple: Founder/Admin, Coordinator, Volunteer).
- Web, intentional SMS relay, and WhatsApp **Export chat** intake paths. The app never automates a live WhatsApp chat.
- A private Miami-Dade/Broward field map with Google Maps support, layer toggles, missing-search tasks, hazard records, and safety modes.
- A fallback map preview when a browser-restricted Google Maps key is not present.
- A review queue which treats duplicate matching as evidence-scored suggestions; a person must approve any merge or sensitive status change.
- An OpenAI Agents SDK triage agent that can recommend urgency, a colony candidate, clarification, and coordinator tasks. It is not allowed to reveal precise locations or take irreversible action.
- A bounded OpenAI Agents SDK lost-cat navigator that compares a report with fictional cat records and safe map-search context, then returns coordinator-reviewed probability zones and volunteer search guidance. It never claims to locate an animal or expose private routes.
- A Community Signals desk that parses only authorized, redacted public-listing text, moderator exports, consent-based feeds, or volunteer submissions into coordinator-review candidates. It never automates Facebook access, fetches an arbitrary source URL, or retains phone numbers and exact home locations.
- A clearly labeled fictional live-tracker simulation that moves one demo cat’s internal map marker every six seconds; it illustrates uncertainty radii without representing a real animal or device.
- Offline-safe web intake: if the API is unavailable, the report is stored in browser local storage for later retry.
- Synthetic WhatsApp and SMS fixture files plus fictional cat images for the live demo.

## Cloudflare deployment

| Service | URL or resource | Purpose |
| --- | --- | --- |
| Live app | [devday-js-2026.deal-finder.workers.dev](https://devday-js-2026.deal-finder.workers.dev/) | Cloudflare Worker serves the Hello shell and built frontend assets. |
| API health | [/api/health](https://devday-js-2026.deal-finder.workers.dev/api/health) | Checks the D1 connection with a read-only query. |
| Worker dashboard | [devday-js-2026](https://dash.cloudflare.com/d4501cb4c3a0ec6b4b67b051d83d3a30/workers/services/view/devday-js-2026/production) | Manage the Worker deployment. |
| D1 dashboard | [devday-js-2026-db](https://dash.cloudflare.com/d4501cb4c3a0ec6b4b67b051d83d3a30/workers/d1/databases/5e49e8ba-625a-4954-9ebc-10d7f3100b90) | Manage the database, bound to the Worker as `DB`. |
| Build and deployment runs | [GitHub Actions](https://github.com/developmentjgonz/devday-hackathon-2026/actions/workflows/cloudflare.yml) | View build checks and release deployment results. |

Cloudflare dashboard links require an account with access to these resources. The app and health URLs are public.

Pushes to `main` run checks. Pushes to `release` run checks and deploy to the live URL. Pull requests to either branch run checks only. See the [workflow](.github/workflows/cloudflare.yml), [Cloudflare configuration](wrangler.jsonc), and [infrastructure guide](docs/infrastructure.md) for setup and deployment details.

Storybook runs locally and is not deployed. D1 persistence, sign-in, verified membership, R2 uploads, and production ingestion webhooks are the next implementation phase.

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

Use Node.js 24 (see `.nvmrc`).

```sh
npm ci
npm run dev
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
cp .dev.vars.example .dev.vars
```

For `npm run dev`, copy `.env.example` to `.env.local` and add the same browser-restricted Maps key. The Vite server supplies it through the local `/api/config` endpoint; it is not added to the static bundle.

```sh
cp .env.example .env.local
```

`OPENAI_API_KEY` enables the server-side triage agent. Without it, the triage route remains available in a safe, deterministic demo mode.

`GOOGLE_MAPS_BROWSER_KEY` enables the Google Maps basemap. It is a browser key (not a secret), but must be limited by HTTP referrer and enabled only for the Maps JavaScript API. Exact rescue data must never be embedded in public JavaScript.

The frontend uses React, TypeScript, Vite, Tailwind CSS v4, shadcn/ui with Base UI primitives, and the OpenAI Agents SDK. The fictional demo images are public assets only for the hackathon. In production, volunteer uploads belong in access-controlled R2 storage.
