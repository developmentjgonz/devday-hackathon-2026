# Architecture

## Current runtime boundary

The checked demo is a local, synthetic-only application. `npm run dev:full` starts Vite on loopback and installs `dev/local-api.mjs` as the local API adapter. That adapter runs the Worker handlers against Node SQLite and local filesystem-backed private-photo objects, applies the repository migrations, and seeds only the synthetic accounts described in the demo runbook.

Node 24 or newer is required for the local persisted path because it uses modern `node:sqlite` APIs; this pass ran on Node 26.5.0. The Cloudflare Worker, D1 migrations, and R2-shaped object API are deployment targets, not evidence of a remote deployment. Remote D1/R2 bindings, production identity, secrets, retention, and monitoring have not been configured or reviewed here.

## System

```text
React Workspace (browser)
  ├─ phone/raw intake, fixture replay, durable browser outbox
  ├─ field map, schedules, private-photo review, agent views
  └─ protected /api/private/* requests with CSRF and session cookie
                         │
                         ▼
local Vite adapter (dev/local-api.mjs, loopback only)
  └─ Worker request handlers
       ├─ Node SQLite local database
       └─ local filesystem private-photo objects

future deployment target: Cloudflare Worker → D1 + R2
```

`src/main.tsx` mounts `src/Workspace.tsx`, which is the current application shell. The older `src/App.tsx` is not the authoritative judge-demo entry point.

## Application flow

1. A signed-in team member submits deliberate phone/web intake, an exported synthetic WhatsApp transcript, or an intentional SMS relay. Live WhatsApp is never automated.
2. `worker/raw-intake.js` accepts only declared synthetic fixtures in the demo and rejects contact data and unsupported areas. It records raw-source traceability.
3. Worker intake/census services materialize reports, candidate colony/cat relationships, feeder activity, and a canonical census in SQLite. A human resolves a potential duplicate before a merge.
4. The Workspace reads the stored census for the coordinator view, schedules, map anchors, and review surfaces. The browser outbox keeps an explicit intake item locally and retries only after connectivity returns.
5. Private-photo upload re-encodes a selected fictional image in the browser before upload. The local API stores bytes separately from metadata; list and preview access are session/role scoped, and review is reserved for authorized roles.

## Primary code boundaries

| Area | Current responsibility |
| --- | --- |
| `src/Workspace.tsx` | Application shell and navigation for the current demo surfaces. |
| `src/components/SharedIntake.tsx` | Sign-in, phone/fixture import, traceability, Team census, and human dedupe. |
| `src/components/DurableOutbox.tsx` | Browser-local offline retry queue for deliberate raw intake. |
| `src/components/ConnectedFieldMap.tsx` | Stored-census map presentation, visibility/radius modes, weather, and the explicitly simulated tracker. |
| `src/components/PrivatePhotos.tsx` | Fictional-image preparation, upload, listing, and coordinator/admin review UI. |
| `src/components/FieldSchedule.tsx` | Feeding visits and schedule presentation. |
| `src/components/AgentEvaluation.tsx` | Bounded triage/search evaluation; deterministic unless opt-in AI configuration is supplied. |
| `src/components/CommunitySignals.tsx` | Deliberate, redacted community-signal review UI; it does not scrape sources or auto-create records. |
| `src/components/CatDirectory.tsx`, `PhotoMatchReview.tsx` | Private canonical cat profiles/feeder-log presentation and separate, human-gated fictional photo-match decisions. |
| `worker/index.js` | API routing, sessions, CSRF checks, access checks, and local/remote binding boundary. |
| `worker/raw-intake.js` | Synthetic export/SMS validation and parsing. |
| `worker/intake.js`, `worker/census.js` | Ingestion, canonical census materialization, and dedupe support. |
| `worker/photos.js` | Private-object metadata and scoped bytes access. |
| `worker/reports.js`, `worker/search-*.js` | Care outcomes and field-search domain services as they are integrated into the Workspace. |
| `migrations/` | Ordered relational schema changes, including canonical census, assessments, care cases, and search tasks. |

## Data, privacy, and AI boundaries

- Fixtures, sample chats, photos, accounts, locations, tracker points, and cat records are fictional. The map uses approximate anchors, not real colony coordinates or observed sighting density.
- Exact rescue coordinates and team contact data are not suitable for public assets or browser configuration. Public/sponsor/internal map modes are presentation safeguards for the demo, not a substitute for an independently reviewed authorization model.
- A Google Maps browser key is optional and must be restricted by HTTP referrer with Maps JavaScript API billing/quota configured. The loader follows the [Google Maps JavaScript API loading guidance](https://developers.google.com/maps/documentation/javascript/load-maps-js-api); missing or rejected keys fall back to the app's non-Google preview.
- Weather can inform planning; the tracker is simulated; neither provides animal-location evidence.
- OpenAI use is opt-in for local testing. Without an enabled server key the app uses deterministic results. The bounded workflows use the [OpenAI Agents SDK](https://developers.openai.com/api/docs/guides/agents/sdk); an agent may suggest, score, or summarize but must not merge cats, change sensitive outcomes, expose precise routes, or assert an animal's location. A live authenticated synthetic phone report was verified through the local server with a stored agent assessment.
- A future real-data deployment needs verified membership, production session security, audit/retention policies, consent workflow, image safety review, incident response, and external privacy/security review.

## Builds and documentation

`npm run build` type-checks and creates the frontend bundle. `npm run test` executes the repository unit test command. Storybook is a separate local component workspace and is not the app runtime.

The practical walkthrough is [demo-runbook.md](demo-runbook.md). The exact fictional coverage and photo constraints are in [demodata-coverage.md](demodata-coverage.md).
