# Implementation and Demo Review

Review date: November 8, 2026. All data and credentials discussed here are for the local synthetic hackathon demo only.

## Formal verification record

The following was observed locally on November 8, 2026 by the implementation owner; it is a verification record, not a production certification.

| Check | Observed result | Boundary |
| --- | --- | --- |
| Build and unit suite | `npm run build` passed; `npm test` passed with 13 tests. | It does not exercise a remote deployment or every browser/device. |
| Google map | A real Google Maps Miami Beach basemap loaded, with the labelled simulated Skipper marker and broad weather cells. | Rescue markers/radii are fictional and approximate; a Maps key, billing/quota, and referrer restrictions are still required. |
| Intake/census/dedupe | The original 12-message shift was delivered; one human duplicate merge reduced the active count from 4 to 3 before the live shift added further fixture records. | This proves only local synthetic persistence and human review, not real chat ingestion or identity evidence. |
| Private photo | A fictional JPEG was uploaded and approved in the local protected photo flow. | No real photos, vision match, malware scanning, retention enforcement, or production storage were verified. |
| Lost-cat/task path | A Miami Beach query found Tux in the local data, returned three heuristic zones, and prepared/dispatched a synthetic task to the volunteer. | Zones are suggestions, not tracked movement or a located animal. |

Not verified: a remote Worker/D1/R2 deployment, any real OpenAI API/agent execution, live WhatsApp/SMS/Facebook integration, real vision matching, or production privacy/security controls.

## Executive summary

The repository now has a credible local, persisted demonstration path rather than only static UI fixtures:

- `npm run dev:full` enables a loopback-only Vite middleware adapter.
- The adapter applies the repository migrations to local SQLite and stores local private-photo objects in its file adapter.
- The Care workspace can sign in to the local Worker routes, parse the shipped synthetic WhatsApp text export or SMS NDJSON relay, persist source traces/observations/review candidates, materialize a canonical census, and record a human dedupe decision.
- The map, weather context, tracker animation, lost-cat planner, sponsor-safe public census, schedules, photo review, field-search tasks, outcomes CSV, Community Signals reviews, Cat profiles & visits, and Photo match review all retain explicit fictional/safety boundaries.

This is still a hackathon/local-demo implementation. It is not a Cloudflare production deployment, a real rescue-data system, a live WhatsApp/SMS integration, a medical tool, or proof that OpenAI agent mode is enabled.

## Local runtime, exactly

Run from the repository root:

```sh
npm ci
npm run build
npm run dev:full
```

Open [http://127.0.0.1:5197/](http://127.0.0.1:5197/). The adapter rejects non-loopback API callers and persists state below the local development area. Restarting the local process does not necessarily reset prior synthetic imports, sessions, or private-photo metadata. The user who runs the demo should therefore start from a known local state and avoid using real information.

The local adapter seeds these accounts only when they do not already exist:

| Local role | Email | Password | Important boundary |
| --- | --- | --- | --- |
| Admin | `admin@mangrovemews.demo` | `SyntheticMiami2026!` | Local synthetic database only |
| Coordinator | `coordinator@mangrovemews.demo` | `SyntheticMiami2026!` | Local synthetic database only |
| Volunteer | `volunteer@mangrovemews.demo` | `SyntheticMiami2026!` | Local synthetic database only |
| Sponsor | `sponsor@mangrovemews.demo` | `SyntheticMiami2026!` | Local synthetic database only |

Do not call these production passwords or publish this local runtime. Team role is set by the server session.

## Synthetic fixture pack

The canonical supported sources are deliberately synthetic and scoped:

| File | Format | Purpose | What the parser enforces |
| --- | --- | --- | --- |
| `public/demo-data/mangrove-mews-whatsapp-export.txt` | WhatsApp-style text export | Fictional feeder observations, broad areas, and local image labels | A clear synthetic/demo disclosure, parseable export lines, approved broad areas, no contact data, and demo-only attachments |
| `public/demo-data/sms-relay.ndjson` | JSON Lines relay | Fictional intentional SMS reports | Synthetic/demo marker, valid JSON Lines, approved broad areas, no contacts, and local demo assets only |
| `public/demo-data/synthetic-intake-batch.json` | Structured fixture | Original 12-report live synthetic shift and importer/evaluation scenario | `synthetic: true`, provenance disclosure, 1–100 records, no coordinate/address/contact fields, approved broad areas, and `/demo-assets/` attachments only |
| `public/demo-data/synthetic-followup-shift.json` | Structured fixture | Expanded 28-report morning: 14 WhatsApp-style + 14 SMS-relay follow-ups | Same synthetic-only constraints; stable fixture/record IDs make replay idempotent |
| `public/demo-assets/` | Local static images | Fictional cat evidence used by fixtures | Demo assets only; not a real private-photo store |

The raw parsers do not automate WhatsApp or poll a live chat. They are fixture parsers behind authenticated admin/coordinator routes. They preserve a source trace, but they must not be fed real private chats, real contact details, exact locations, or real rescue photos.

## Step-by-step full demo

### A. Sign in and load the canonical care workspace

1. Start `npm run dev:full` and open the local URL.
2. Choose **Care workspace** in the sidebar.
3. Sign in as the local coordinator account.
4. Verify the visible server-session email/role and the “Private Worker + D1 · synthetic-only” language.
5. Explain that this is persisted local demo state, not an external deployment.

### B. Parse and persist a raw fictional source

1. Under **Intentional raw import**, choose **Load WhatsApp fixture**.
2. Inspect the loaded text: it identifies itself as a fictional/synthetic demo and uses only approximate areas.
3. Leave its source kind as WhatsApp Export; accept the generated batch ID or choose a new fixture-only ID.
4. Select **Import synthetic raw export**.
5. Use **Refresh** and show the canonical census, source-linked reports, review queue, colony card, and cat profile history.
6. Repeat with the SMS fixture or choose **Replay both fixtures** for the same story in one flow.

Describe the data path accurately: raw fixture → parser validation → source trace and observation → deterministic or optionally agent-assisted triage assessment → review candidates → materialized local canonical census.

### C. Demonstrate the duplicate guard

1. Find Marmalade’s possible-duplicate review.
2. Choose **Choose canonical cats**.
3. Select two different records and write a short human reason.
4. Choose either **Confirm human-reviewed merge** or **Keep records separate**.
5. Refresh the canonical profile/census and point to the resulting local audit/review state.

Important: the program must never be described as automatically merging records. The parsing and triage stages only create suggestions/review candidates.

### D. Demonstrate a streaming fixture and browser outbox

1. Open **Chat imports & outbox**.
2. In **Live synthetic shift**, select Start/Resume while the coordinator session is active. Each displayed message is drawn from the structured fixture and submitted through the local protected synthetic-import route.
3. In **Offline source outbox**, load a fictional fixture, queue it, and observe the browser-local queue item.
4. To exercise retry, intentionally take the browser offline before **Send now**. It should remain queued with a retry error in local storage.
5. Restore connectivity and select **Send now**. The adapter should store a new source batch or return the existing batch safely on a duplicate submission.

The outbox is browser local storage, not a production service-worker sync system. It only retries the fictional raw source through the authenticated local route.

### E. Demonstrate map/tracker/weather truthfully

1. Open **Field map** after importing at least one fixture.
2. Toggle stored colonies, the synthetic Skipper tracker, and broad weather context.
3. Switch role/session to sponsor to show the sponsor-oriented scope; switch back to an internal role for the local internal view.
4. Explain that stored colony counts are driven by the local canonical census, while displayed cat/colony anchor coordinates are still deliberately approximate fictional map records.

The Google basemap is real only if a valid `GOOGLE_MAPS_BROWSER_KEY` is configured. It requires proper HTTP-referrer restriction, enabled Maps JavaScript API, and any applicable Google billing/quota. The tracker is a fictional animation that moves on an interval. Weather uses broad live planning context if available; it is not evidence of a cat’s location.

### F. Demonstrate private-photo review

1. Open **Private photo review** as local admin or coordinator.
2. Select **Prepare demo photo**. This uses the included fictional cat fixture, not a real upload.
3. Explain that the client prepares an output JPEG with a capped dimension before upload, which removes embedded metadata in the uploaded copy.
4. Upload it to the local private-photo endpoint, refresh the private list, and approve or reject it.
5. Change to volunteer to show the reduced local photo scope; change to sponsor to show that private-photo access is not available.

This feature is not a complete production photo-safety solution. It does not demonstrate malware scanning, retention/deletion controls, consent intake, image-model safety review, or real-person/privacy compliance. Never use real photos for the hackathon demo.

### G. Demonstrate schedule, lost cat, and agent boundaries

1. In **Feeding schedule**, create a synthetic assignment as coordinator, then complete/reassign it. Volunteer interaction should be limited to their assigned work.
2. In **Lost cat navigator**, use Tux and explain that output zones are ranked probabilities and safe public-access guidance—not location claims or a tracker integration.
3. In **Agent evaluation**, run the eight synthetic urgency cases. Read the returned mode column.
4. If the mode is deterministic/demo/fallback, say that the local run did not use a model. If agent mode is configured explicitly, say it is bounded to synthetic context/tools and still cannot approve a merge or medical action.

## Five improvement-loop ratings

These are subjective engineering estimates, not judge scores, benchmarks, or a production-readiness claim. Each value is out of 10 and reflects the **local synthetic demo** after that pass. The OpenAI path is opt-in/deterministic-first and no vision workflow is implemented, so no category is scored as complete.

| Pass | Fit | Originality | Codex / OpenAI | Feasibility | Presentation | Concrete change/evidence |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| 1 — Source data and census | 7.5 | 6.5 | 6.0 | 7.0 | 6.5 | Synthetic WhatsApp/SMS parsers, traceable observations, canonical Team census, and importer fixtures turned a batch into persisted local records. |
| 2 — Roles and human dedupe | 8.0 | 7.0 | 6.5 | 7.5 | 7.0 | Local server sessions/CSRF, role-scoped routes, human duplicate reasoning, and no automatic merge/sensitive-status action. |
| 3 — Photos and offline reports | 8.0 | 7.5 | 6.5 | 7.5 | 8.0 | Private fictional JPEG re-encode/upload/review, dedicated Photo match review, plus browser-local raw and phone-report retry queues. |
| 4 — Search and care outcomes | 8.5 | 8.0 | 7.0 | 8.0 | 8.0 | Stored-census lost-cat planner, guarded field tasks, Cat profiles & visits, care outcomes with explicit medical/TNR result and CSV. |
| 5 — Final demo and documentation | 8.5 | 8.0 | 7.0 | 8.0 | 8.5 | 12-report and 28-report stable replays, public aggregate census, six-layer map, formal local verification, and a truthful runbook/data inventory. |

Remaining gaps are intentional or pre-pilot: remote D1/R2 deployment, production identity/audit/retention, real consented data, provider integrations, real vision/telemetry, robust background sync, and evaluation/observability for opt-in agent calls.

## Functional gaps and demo cautions

1. **No production deployment claim:** The local SQLite/file adapter is intentionally not D1/R2/Cloudflare production. Existing hosted/deployment references elsewhere in the repository may be stale and must not be used as demo proof.
2. **No live WhatsApp/SMS:** Raw import supports only explicit synthetic files. Do not claim webhook intake, live export ingestion, or authorized platform automation.
3. **Agent mode is optional:** The local adapter exposes an OpenAI key only when explicitly enabled. Deterministic triage is the default and is the honest mode to demonstrate unless the response identifies agent mode.
4. **Map semantics matter:** A real Google basemap, real weather response, and a simulated tracker can appear together. Only the basemap/weather are external data; rescue records/coordinates/tracker pings are fictional fixtures.
5. **Private photo processing is incomplete:** Browser JPEG re-encoding is useful for the demo but not sufficient production security. Do not upload real images.
6. **Browser-local outbox limits:** Queued source text persists only in browser storage and retries only while the page/runtime is available. It is not a mobile native offline sync feature.
7. **Local browser limits remain:** The phone-report outbox retains at most 50 fictional reports in browser storage and retries while the app is open for the original signed-in account. It is not service-worker or native offline sync.

## QA findings for the implementation owner

These are source-review observations to verify/fix; they are not claims of runtime reproduction.

- **Resolved since the original review — private photo bytes.** The private-photo reader now receives the session and returns no photo to a volunteer who is not the uploader; list metadata is likewise scoped. This is a local authorization control, not a production security sign-off.
- **Resolved since the original review — documentation drift.** `README.md`, architecture, roadmap, and the runbook now distinguish the local SQLite/file-backed demo from a remote D1/R2 deployment.
- **P2 — UI wording drift.** The private-photo empty-state wording refers to a “Vite-only demo server” not providing protected storage. Under `dev:full`, the local adapter does provide protected local endpoints. Consider making the message distinguish `npm run dev` from `npm run dev:full`.
- **P2 — Clean-state workflow.** The adapter intentionally keeps SQLite and local photo files between restarts, but there is no documented one-command reset. Add a safe, scoped developer reset command and include it in the demo preparation checklist.
- **P2 — Canonical-data consistency.** Outcome Reports and Field Search Tasks now have protected local routes. Add a regression test for the joined flow from raw intake through canonical census, task, and documented outcome.
