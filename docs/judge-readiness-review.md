# Judge Readiness Review

Review date: November 8, 2026. This is an evidence-based review of the checked-in demo, not a promise of production capability. All animals, messages, photos, locations, counts, and tracker activity described here are fictional hackathon fixtures.

## Requested judging rubric

These are provisional self-assessments, not judge scores. The five sections below are five review lenses, not five completed build-and-retest iterations.

| Criterion | Score / 10 | Evidence and next improvement |
| --- | ---: | --- |
| Functionality fits problem | 6 | The synthetic replay and care dashboard show the problem; connect the replay, intake, profiles and census to one persisted data model. |
| Originality | 7 | The combination of colony care, lost-cat maps and weather-aware safety is distinctive; validate search suggestions with rescue partners. |
| Codex and OpenAI use | 6 | Agents SDK workflows exist in the Worker; execute and evaluate them against synthetic cases in the deployed flow. |
| Feasibility and reasoning | 6 | The UI is practical and human review is considered; authenticated access, durable storage and real import processing remain necessary. |
| Presentation | 7 | The synthetic feed, profiles and runbook make the story visible; rehearse the complete demo and remove disconnected static numbers. |

Since this audit, a timed fictional chat replay, local review decisions, sample rollup download, demo persona controls and site preferences were added. These improve presentation, but do not close the end-to-end persistence, authorization or agent-ingestion gaps described below.

## Executive score

**6.6 / 10 for a hackathon demonstration; not production-ready.**

The product already tells a compelling, safety-aware South Florida rescue story. It has a polished mobile-capable UI, a real Google Maps basemap when configured, a bounded OpenAI Agents SDK workflow, static rich cat records, and a clear human-review posture. The main gap is that most business data is fixture-backed rather than persisted or actually transformed end-to-end: uploads, location pins, WhatsApp/SMS imports, approvals, and census changes are illustrated in the UI but not stored or reconciled in a database.

## Reality boundary

| Capability | What a judge can actually use today | What it is not |
| --- | --- | --- |
| Field map | A real Google Maps basemap when `GOOGLE_MAPS_BROWSER_KEY` is configured; interactive synthetic markers/radii and live broad-area weather cells from Open-Meteo. | A real colony/sighting database or an analysis of real Miami-Dade/Broward cat incidence. The cat markers and tracker are fictional, deliberately approximate fixtures. |
| New field report | A responsive form can submit text plus metadata to `/api/triage`; when the API is unavailable, the payload is stored in browser local storage. | A durable record with upload storage, real GPS capture, a queued sync worker, or a parsed WhatsApp/SMS attachment. The photo input and private-pin control are presentation/metadata only. |
| WhatsApp/SMS | The app displays and downloads fictional exported-chat and intentional-SMS fixtures. | Live WhatsApp automation, webhook ingestion, or a parser that converts either fixture into persisted reports. This is intentional: live-chat automation is out of scope and disallowed by the challenge. |
| Agent triage | With an `OPENAI_API_KEY`, the Worker uses the OpenAI Agents SDK to assess a submitted text report with a bounded synthetic colony-context tool. Without a key, it uses a deterministic safe demo fallback. | A diagnosis, automatic merge, automatic case closure, or a real rescue-data lookup. |
| Cat profiles/census | Rich fictional profiles, a colony-health table, visit labels, and suggested duplicate evidence appear in the UI. | A source-of-truth census. Approve, merge, and status buttons do not persist changes. |
| Lost-cat navigator | A bounded agent/fallback ranks three **synthetic** probability areas, requests clarification, and includes weather-informed safety guidance. | A real-time tracker service, computer-vision identity match, image understanding of an uploaded file, or a claim that the cat has been located. |
| Role/privacy modes | Internal/sponsor/public map-radius presentation and public coordinate rounding are visible. | Authentication, authorization, audit logs, or server-side field-level access control. |

## Five-round review

### Round 1 — Judge-visible challenge coverage: 7.5 / 10

**Strong evidence**

- Overview surfaces injury, pregnancy, kitten uncertainty, TNR, feedings, and assignments on one screen.
- The fixture history includes messages, photos, and approximate shared-location language.
- Reports show four duplicate-match dimensions and use review-first language.
- Cat profiles include identifiers, medical/TNR context, history, and colony relationships.

**Why it does not score higher**

The “message/photo/location updates the right colony and cat with nobody retyping” journey is narrated and replayed, but not yet executed from import through persistent census mutation. The reviewer should describe this as a **working triage demonstration plus fixture replay**, not a complete ingestion system.

**Highest-value improvement**

Implement one deterministic, local end-to-end import path for the included WhatsApp export: parse its text, map its included fixture photo references, produce review candidates, and update an in-memory/D1 demo census after a simulated coordinator approval.

### Round 2 — Agentic workflow quality: 7.0 / 10

**Strong evidence**

- `worker/triage-agent.js` uses the OpenAI Agents SDK with explicit tools and bounded schemas for the lost-cat and community-signal helpers.
- The triage agent has explicit constraints against revealing precise data or taking irreversible action.
- Lost-cat planning separates last seen, home range, cover, and live-tag signals; it also adds broad-area weather safety context.
- Deterministic fallbacks make the demo resilient when no API key is configured.

**Why it does not score higher**

The triage path is text/metadata only; uploaded images are never sent to a vision model. Tool data is static and synthetic. The current agent outputs recommendations but has no review-queue state, assignment writer, evaluation set, observability, or cost/rate protections.

**Highest-value improvement**

Add an explicit `create_review_candidate` tool that writes a validated, reversible D1 record only after the agent returns structured evidence; keep all final merge/status actions human-only. Add 10–20 fictional evaluation reports with expected urgency and duplicate outcomes.

### Round 3 — Data integrity and rescue safety: 8.0 / 10

**Strong evidence**

- Synthetic-only/approximate-location disclosure is consistent across fixtures and UI.
- The Worker validates request shape and size; the community path redacts common emails, phone numbers, and street-address patterns before model use.
- Public map display widens radii, and the product repeatedly says human approval is required for merging and sensitive status changes.
- Search guidance warns against traffic, canals, construction, heat, flooding, restricted property, and chasing cats.

**Why it does not score higher**

Privacy/role controls are visual conventions rather than server-enforced policy. There is no login, verified-volunteer workflow, real consent record, retention job, upload scanning, or immutable action audit. Regex redaction should not be treated as sufficient production PII protection.

**Highest-value improvement**

Require authenticated roles at the Worker, move exact coordinates and private contacts to protected tables, return different server-side DTOs per role, and write an audit event for every reveal, export, approval, and state change.

### Round 4 — South Florida map and field usability: 7.0 / 10

**Strong evidence**

- Google Maps is a genuine map basemap when the restricted browser key is configured.
- The map covers Miami-Dade, Broward, South Dade, and Miami Beach with layers, radii, and a mobile fallback.
- Weather cells use a real external weather forecast and update periodically; the app correctly frames them as safety planning rather than animal-location evidence.
- A fictional internal-only tag simulation demonstrates how tighter confidence radius could look.

**Why it does not score higher**

The app does not use real/authorized rescue observations or a defensible public dataset to claim where cats are most often seen. “Hiding spots” are described as generic safe-cover guidance, not a validated geospatial model. The moving tag is a UI simulation, not a tracker integration.

**Highest-value improvement**

Add an opt-in, low-resolution OpenStreetMap feature layer that ranks only public-access cover types (vegetation, service alleys, parking structures, canal-adjacent risk) and keeps the result as a coordinator-reviewed task suggestion. Document the data license and never use it to expose a colony.

### Round 5 — Shipping and operations readiness: 3.5 / 10

**Strong evidence**

- Vite/React build, Worker routes, fixture assets, and basic fallback behavior give the project a runnable demo path.
- The Google Maps key is retrieved from a configuration endpoint rather than embedded in source.

**Why it does not score higher**

No production persistence, auth, upload storage, inbound SMS provider, WhatsApp-export parser, background jobs, automated tests, monitoring, error tracking, rate limits, backups, migrations for product data, or deployment verification is present. Existing `docs/architecture.md` and `docs/roadmap.md` predate the current feature set and should not be treated as the current system design.

**Highest-value improvement**

Before any real-rescue pilot, establish D1 migrations, R2 private uploads, role-based auth, test fixtures/evaluations, a privacy threat model, and an incident/retention policy; then run a small, consented pilot with synthetic shadow mode first.

## Ten feature ideas, ranked

1. **Fixture importer with review records (P0):** parse the supplied WhatsApp export and SMS NDJSON into D1 `report_candidate` rows, preserving the original content and creating no cat/colony mutation until approved.
2. **Coordinator approval ledger (P0):** approve/reject/merge/status-change actions with actor, timestamp, before/after values, and reason; make merge/adoption/missing/deceased impossible without it.
3. **Private upload pipeline (P0):** upload to access-controlled R2, strip EXIF on a copy, show a privacy warning, generate thumbnails, and retain only according to policy.
4. **Role enforcement (P0):** Founder/Admin, Coordinator, and Volunteer login; server-side DTO filtering for exact pins, contacts, photos, and exports.
5. **Offline outbox (P1):** IndexedDB queue with visible sync status, retry, conflict treatment, and coordinator review rather than only local-storage fallback.
6. **Photo-match review packet (P1):** vision-derived but explainable candidate comparisons (face/marking/body/ear-tip/place-time) with side-by-side images; never auto-merge.
7. **Hiding-spot task generator (P1):** low-resolution OpenStreetMap-derived public-access cover/risk hints, weather aware and coordinator-assigned; include source attribution and expiry.
8. **Feeding and census reconciliation (P1):** compare reported count to rolling colony baseline, request confirmation for uncertainty, and produce a follow-up task rather than silently changing census.
9. **Sponsor/city export (P2):** date-range, neighborhood-aggregated PDF/CSV with TNR pending and medical cases resolved; enforce aggregation/suppression rules before export.
10. **Agent evaluation and safety dashboard (P2):** a curated fictional test set, expected labels, regression thresholds, tool-call logs, fallback rate, and reviewer-overturn rate.

## Reviewer language to use

Say: “This is a privacy-aware, synthetic end-to-end **demo workflow**. The OpenAI Agents SDK produces bounded suggestions; people approve any consequential record change.”

Do not say: “The app currently imports WhatsApp, stores photos/GPS, has real cat sighting intelligence, or can locate a lost cat.” Those capabilities are not implemented in the checked-in application.
