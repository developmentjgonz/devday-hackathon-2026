# Roadmap

This is a local-demo roadmap. A checked item means the relevant code is present in this branch; it does not imply a production deployment, a real-data pilot, or a hackathon submission.

## Completed in the local synthetic demo

- [x] React/TypeScript Workspace and a local loopback runtime (`npm run dev:full`) backed by SQLite and local object storage.
- [x] Simple Founder/Admin, Coordinator, and Volunteer session roles with protected local API routes.
- [x] Deliberate phone/web intake, WhatsApp-export and SMS-relay fixture import, raw-source traceability, and a durable browser outbox retry path.
- [x] Canonical census materialization for cats, colonies, reports, feeder activity, and TNR/vet indicators.
- [x] Human-confirmed duplicate review with evidence context; no automated merge or sensitive-status decision.
- [x] Stored-census field map, approximate visibility/radius modes, fictional tracker animation, planning weather, and Google Maps fallback behavior.
- [x] Private fictional-image upload/list/review path with client-side re-encoding and scoped local access.
- [x] Feeding schedule/visit surfaces and bounded deterministic-first agent triage/evaluation.
- [x] Synthetic fixture pack and a judge walkthrough that state the demo's data and privacy limitations.

## Completed Workspace integrations

- [x] Stored-census lost-cat navigator with Miami Beach, Hialeah, Homestead, and Hollywood / Broward options; it gives bounded, reviewable probability/search suggestions rather than a location claim.
- [x] Persistent field-search tasks with safety/weather guardrails, volunteer assignment, completion evidence, and an unsafe-block path.
- [x] Persisted outcome reports that distinguish documented medical resolution from a TNR outcome and export a protected CSV.
- [x] A separate Photo match review surface; matching can recommend candidates but requires human confirmation before records change.
- [x] Community-signal review leads stored for coordinator review without automatic creation of cats, sightings, or downstream field tasks.
- [x] Current demo runbook, data inventory, and formal local verification record.
- [x] Today’s operations: grouped open urgent reviews, overdue feeding confirmations, care cases, and uncertain/unmatched reports.
- [x] Configurable confidence-gated colony assignment, assigned volunteer clarifications, and separate human-verified counts with source evidence preserved.
- [x] Persistent missing-cat cases, manager-confirmed missing/reunion events, saved live-agent plans, timestamped field feedback, stale-plan handling, and immediate unsafe-zone exclusion.
- [x] Internal-only saved missing-case search layer on Field map; public/sponsor views omit private case plans.
- [x] Actual image-input comparison using the OpenAI Agents SDK, saved evidence/hashes, bounded calls, and a human-only evidence review.
- [x] Global private search, personal My shift agenda, appointments, supply requests/pledges, and acknowledged daily handoffs.
- [x] Additional 72-report/four-language synthetic scenario, 18 fictional colonies, new cat-profile catalog, and a generated alternate Marmalade view.
- [x] Isolated D1/R2 deployment workflow, idempotent hosted seed, and Cloudflare-compatible high-entropy synthetic-demo access codes. Deployment was attempted and remains blocked by D1 authorization.
- [x] Bulk/chat source identity, conflict detection, atomic pre-inference claims, legacy evidence preservation, and no duplicate assessments/feeding logs on replay.
- [x] Grouped role-aware navigation, personal volunteer notifications, persistent per-account read state, and stale-request invalidation at account changes.
- [x] Four-language urgent-source grouping, profile-to-care-review links, strict source timestamps, and contradictory broad-area routing checks.
- [x] Simulated tracker pause/follow and reduced-motion controls, readable mobile map layers, and displayed audience-specific radii.

## Before any real pilot or deployment

- [ ] Configure and verify remote D1/R2 bindings; do not describe them as deployed until a separate deployment check succeeds.
- [ ] Replace local demo accounts with reviewed production identity, role lifecycle, audit logging, rate controls, and incident procedures.
- [ ] Establish consent, retention/deletion, image/EXIF, location precision, safety, and abuse-handling policies with the rescue.
- [ ] Validate map/provider billing and referrer restrictions; keep exact colony locations and personal information out of public assets.
- [ ] Evaluate opt-in AI behavior with representative, consented data and failure cases; retain human approval for merges, sensitive statuses, and field task escalation.
- [ ] Run and record the final build, unit tests, access checks, and demo rehearsal before a submission or release.
