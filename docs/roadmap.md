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

## Before any real pilot or deployment

- [ ] Configure and verify remote D1/R2 bindings; do not describe them as deployed until a separate deployment check succeeds.
- [ ] Replace local demo accounts with reviewed production identity, role lifecycle, audit logging, rate controls, and incident procedures.
- [ ] Establish consent, retention/deletion, image/EXIF, location precision, safety, and abuse-handling policies with the rescue.
- [ ] Validate map/provider billing and referrer restrictions; keep exact colony locations and personal information out of public assets.
- [ ] Evaluate opt-in AI behavior with representative, consented data and failure cases; retain human approval for merges, sensitive statuses, and field task escalation.
- [ ] Run and record the final build, unit tests, access checks, and demo rehearsal before a submission or release.
