# Mangrove Mews demo runbook

This is a six-to-seven-minute, judge-ready demonstration of a **fictional** South Florida community-cat rescue. Every cat, person, message, phone number, photo, colony, census value, tracker event, and map anchor is invented for the hackathon. Map anchors deliberately approximate neighborhoods; they are not real rescue, feeder, trap, hiding-spot, or animal locations.

For a precise account of what is implemented, simulated, and still needed, read [Judge Readiness Review](judge-readiness-review.md).

## Before the demo

```sh
npm ci
npm run build
npm run dev:full
```

Open [http://127.0.0.1:5197/](http://127.0.0.1:5197/).

Sign in from **Care workspace** with one of the local accounts below. The server session controls the local private routes and the current Workspace is the judge-demo surface.

To show messages arriving over time, open **Chat imports & outbox**, then use **Live synthetic shift**. After an authenticated admin or coordinator starts it, each made-up fixture message is persisted through the local synthetic-import route. It is deliberately scripted and contains no real chat, device, or person data.

`dev:full` starts the loopback-only local adapter at the same URL. It applies the repository migrations to a persistent local SQLite file and gives the UI real local Worker routes, sessions, private-photo storage, canonical census materialization, raw-fixture imports, review decisions, and feeding assignments. It is not a Cloudflare deployment and it must not be exposed beyond `127.0.0.1`.

Use one of these **local-only synthetic accounts** in the Care workspace:

| Role | Email | Password | Demo use |
| --- | --- | --- | --- |
| Admin | `admin@mangrovemews.demo` | `SyntheticMiami2026!` | Import, review, photo approval, scheduling |
| Coordinator | `coordinator@mangrovemews.demo` | `SyntheticMiami2026!` | Import, review, photo approval, scheduling |
| Volunteer | `volunteer@mangrovemews.demo` | `SyntheticMiami2026!` | Read approved workspace data, own private photos, complete assigned feeding |
| Sponsor | `sponsor@mangrovemews.demo` | `SyntheticMiami2026!` | Sponsor-safe canonical census and aggregate reporting only |

These accounts exist only in the local adapter’s synthetic database. They are not production credentials.

Optional local configuration:

- `GOOGLE_MAPS_BROWSER_KEY` enables the real Google Maps basemap. Restrict it by HTTP referrer and enable only the Maps JavaScript API; Google billing and quota requirements still apply. Never place a server/API secret in the client. A local synthetic map preview remains functional without the key.
- `OPENAI_API_KEY` enables the server-side Agents SDK paths only when local OpenAI is explicitly enabled by the runtime. `dev:full` defaults to deterministic synthetic triage, even if a local key file exists. Without agent mode, the same bounded, clearly labeled fallback workflow remains available.

Do not use real messages, photos, people, or locations in the demo.

## Six-minute judge flow

### Optional: start a fresh rehearsal without deleting prior work

The website currently contains persisted demonstration records. Replaying the same source preserves earlier imports and human decisions. To demonstrate the original **4 records → 3 active cats** merge again, first finish any pending outbox deliveries, stop the local dev process with Ctrl+C in its terminal, then run these commands from the repository root:

```sh
mews_archive_dir="$(mktemp -d .wrangler/demo-backup.XXXXXX)"
mv .wrangler/local-demo "$mews_archive_dir/"
npm run dev:full
```

This archives the local synthetic database and photo files together; it does not delete them. Sign in again, then import the original WhatsApp and SMS fixtures. For the merge, explicitly select **Marmalade candidate (CAT-02-ALT)** as source and **Marmalade (CAT-02)** as target. Do not select an unrelated cat. If those two records have already been merged, use the archived/fresh rehearsal procedure instead of making another merge.

The archive remains beneath `.wrangler/demo-backup.*`. Restore it only while the server is stopped, after archiving the new rehearsal directory separately. This procedure is for this isolated fictional local runtime only.

### 1. Sign in to the local care workspace — 45 seconds

On **Care workspace**, sign in as `coordinator@mangrovemews.demo` with the local-only password above. The status message should identify the server account and role. Explain that the full local demo writes only made-up records to the loopback SQLite adapter.

Say: “This is a local persistence demo, not a production deployment and not a real rescue database.”

### 2. Send one phone field report — 45 seconds

Open **New field report** while still signed in. The prefilled fictional report includes its message, selected demo cat photo, broad shared area, cat count, feeding confirmation, and urgent-welfare toggle. Submit it, then use **Care workspace** and **Refresh** to show the resulting source trace, census update, and open review without coordinator retyping.

Say: “This is the mobile-sized intentional report flow. In the hackathon build it accepts only a selected fictional fixture photo and broad demo area; it does not request a real camera, GPS position, or real animal data.”

### 3. Establish safe raw inputs — 45 seconds

In **Shared intake & canonical census**, select **Load WhatsApp fixture**. Show the raw, fiction-labeled export. Then select **Load SMS fixture** to show the intentional NDJSON relay option. Both inputs are deliberately made-up and have only broad areas plus local demo-asset references.

Say: “We support a volunteer-provided WhatsApp Export and intentional relay—not automated access to a live WhatsApp chat. These are synthetic-only hackathon fixtures, not live imports.”

In the full local workspace, do say that the raw fixture parsers persist source-linked synthetic records into the local canonical census. Do **not** say that the app ingests real WhatsApp/SMS traffic: it only accepts explicit, synthetic fixtures and rejects contacts, exact locations, external attachments, and unapproved broad areas.

### 4. Persist one fixture and show the team census — 60 seconds

Choose a fresh batch ID, then select **Import synthetic raw export**. On success, use **Refresh** and show the **Team census** cards, individual records, source-linked report trace IDs, urgent review count, TNR state, and last feeder/visit timestamp. To make this faster in a clean local database, use **Replay both fixtures**.

Call out the persisted chain:

1. A raw fictional export is parsed only after it passes synthetic/provenance, contact, broad-area, and attachment checks.
2. Each message receives a source trace, observation, triage result, and review candidates.
3. The canonical census is materialized from those observations; human decisions remain required for a duplicate merge.

Then point to feeder visit, TNR-pending, medical-review, and source-linked profile history. This is persisted in the local adapter only.

### 5. Show the human duplicate gate — 60 seconds

Locate the Marmalade **possible duplicate** review in the source-linked intake area. Choose **Choose canonical cats**, select the two relevant canonical records, provide brief human reasoning, then either confirm the synthetic merge or keep the records separate.

Explain that the confirmation creates a local dedupe audit row and updates the canonical relationship only after an admin/coordinator decision. No parser or agent can merge cats on its own.

For a scripted delivery version, **Chat imports & outbox** also has **Live synthetic shift**. Start with **Original 12-report demo**, then select **Expanded 28-report morning** to deliver its 14 WhatsApp-style and 14 SMS-relay follow-ups across the eight fictional South Florida areas. Each record uses a stable fixture/batch identity, so replay retains the original backend record rather than duplicating it.

### 6. Show the map, radius semantics, and Miami Beach — 75 seconds

Open **Field map**. Toggle stored colonies, the Skipper demo-tracker/sighting layer, and weather. Select a record and change the audience mode from **Internal** to **Sponsor** to **Public**.

Explain the distinction:

- Internal and sponsor views show synthetic operational radii in this demo; actual production exposure must be authorized server-side.
- Public mode rounds a coordinate and widens the displayed radius to at least 500 m.
- The Google basemap is real when configured; every cat/colony/hazard marker remains fictional and approximate.
- Miami-Dade, Broward, South Dade, and Miami Beach anchors demonstrate fixture coverage, not real sighting density.
- Weather cells are live, broad-area safety context from Open-Meteo. They affect volunteer safety decisions, never a claim about where a cat is.

With sightings enabled, point out **Skipper**, whose internal-only marker shifts every six seconds. Call it a fictional tracker simulation, not a device integration.

### 7. Show the individual record and missing-cat plan — 90 seconds

Open **Cat profiles & visits**. Show Poppy or Marmalade’s canonical profile facts (coat, markings, estimated DOB, microchip, TNR/fixed, medical/vaccination context, colony, and tracker state where applicable), chronological history, and the feeder-visit log. Emphasize that a report proposal is not a sensitive status decision and a duplicate change needs human review.

Open **Photo match review** for the side-by-side fictional evidence packet. The evidence scores are prompts for a human decision—not a vision identity claim—and an admin/coordinator must either document reasoning to merge or keep the records separate.

Open **Lost cat navigator**. Use Tux’s default fictional report, or choose Miami Beach, Hialeah, Homestead, or Hollywood / Broward from the broad-area selector. Supply last-seen time and description/markings, then choose **Find likely search areas**.

The result is a ranked set of probability zones—not a claimed cat location. It asks a clarification when useful and reminds volunteers about public access, traffic, canals, construction, heat, and flooding. The larger Field map contains the separate fictional tracker demonstration.

Say: “The agent can recommend what to check and why; a coordinator assigns the task, and nobody is sent onto private or unsafe property.”

### 8. Demonstrate an offline retry safely — 45 seconds

In **Chat imports & outbox**, load either included fictional fixture in **Offline source outbox**, queue it, and leave it as `queued`. For a manual retry test, use the browser’s offline control while clicking **Send now**; the record should stay in local storage with an error. Restore network and use **Send now** again (or trigger the browser `online` event) to persist it through the authenticated raw-import route.

The chat-source outbox is browser-local and its retry behavior depends on the browser/network state. Separately, the **New field report** outbox retains up to 50 failed fictional phone reports in local storage, retries while the app remains open, and releases them only to the original signed-in team account. Do not claim either is a service-worker/background sync or a native mobile offline implementation.

### 9. Demonstrate photo privacy review — 45 seconds

Open **Private photo review** while signed in as an admin or coordinator. Use **Prepare demo photo**; it is the shipped fictional cat image. The browser re-encodes it as a JPEG with a capped dimension before upload, then sends only the prepared bytes to the protected local endpoint. Upload it, refresh the private list, and approve or reject it.

State the boundary: “This is private local evidence storage for the demo. Client re-encoding reduces embedded metadata in the uploaded copy, but this is not a production malware scan, retention policy, or real-photography workflow.” Volunteers can see only their own stored photo metadata/bytes in the local route; sponsors cannot open the photo desk.

### 10. Show field coordination, outcomes, and role visibility — 60 seconds

Open **Feeding schedule**. As an admin/coordinator, schedule a visit against a stored colony, assign a local team member, then complete or reassign it. As a volunteer, show only the assigned work and confirm completion. As sponsor, show the sponsor-safe census/aggregate path instead of intake text or private photo data.

Open **Field-search tasks**. Start with the draft from Lost cat navigator or create a task; a coordinator must check legal public access, no floodwater/drains, no traffic entry, and human-verified risk before dispatch. Complete with timestamped evidence or block the task as unsafe.

Open **Care outcomes & reports**. Create a fictional medical or TNR case, then document a specific outcome and evidence. Show the separate medical-resolution/TNR counts and the authenticated CSV link. These metrics change only after a coordinator/admin documents the outcome.

### 11. End with agent boundaries — 35 seconds

Open **Agent evaluation** and run the eight fictional urgency cases. The UI reports whether the returned urgency matches its fixed expected label and whether the deterministic fallback or agent mode ran. A pass is not a medical diagnosis or an identity match.

Optionally show **Community signals** with its redacted sample. The page intentionally does not fetch the URL, scrape a platform, or create a real case. It produces a review-first, broad-area suggestion only.

## Acceptance-criteria evidence table

| Judge expectation | Where to show it | Accurate statement |
| --- | --- | --- |
| Phone message/photo/broad location routes to a colony/cat | New field report → Care workspace | The signed-in local route persists the selected fictional text/photo/broad area/count/feeding/urgency source trace and proposes a colony/cat or review. It does not accept real messages, exact pins, camera/GPS capture, or external attachments. |
| Colony state shows census, fixed/TNR, vet need, and last feeder | Canonical census after import | Materialized from the local synthetic records and feeder visits. It is not real rescue data. |
| Same cat is counted once | Marmalade possible-duplicate review | A coordinator/admin selects two canonical records and records a human decision/audit. Parsers and agents never merge automatically. |
| Urgent cases stand out | Intake review queue, Live synthetic shift, canonical census | Injury, pregnancy, kittens, feeder gaps, and missing/search cues generate review candidates in the fictional fixture. |
| Exported-chat/SMS batch becomes a census | Raw import/replay both fixtures + census refresh | The full local adapter parses and persists raw fictional WhatsApp `.txt` and SMS `.ndjson` fixtures. It is not a live WhatsApp/SMS connector. |
| Agent assists census/reports | Triage evaluation + lost-cat navigator + outcomes CSV | Default local triage/search is deterministic. Agent mode is optional and bounded; care metrics require a documented human outcome. |
| Map, cat profile/history, feeder-visit log | Field map, canonical profile, Feeding schedule | Stored counts and histories are locally persisted; map anchor positions and tracker movement remain fictional/approximate. |

## Judge talking points

- “We chose a human-in-the-loop design: the agent can prioritize, explain, and suggest; people approve identities and consequential status changes.”
- “We explicitly avoid prohibited live WhatsApp automation. The product is designed around exported chats and intentional reports.”
- “Location is treated as confidence plus access level, not as an absolute fact. Public audiences receive a widened, rounded area.”
- “The demo has genuine Google Maps and broad weather context, but it deliberately does not pretend fictional records are real rescue intelligence.”

## Recovery plan

- **No Google Maps key/network:** use the built-in synthetic fallback map; all layer/radius interactions still work. Do not imply a Google basemap is present when it is not.
- **No OpenAI key/network:** `dev:full` is intentionally deterministic by default. Run the triage evaluation in fallback mode and say so; do not imply a model call occurred.
- **No weather result:** the map leaves weather cells empty; do not claim a forecast.
- **No local session/adapter:** confirm the process was started with `npm run dev:full`, not `npm run dev`, then sign in through Care workspace. The static Vite-only mode does not provide authenticated private routes.
- **If asked about production:** use the implementation review’s limitations section. The local SQLite/file adapter is not a Cloudflare deployment, real rescue-data pilot, or production authorization design.

## Fixtures

- [`public/demo-data/mangrove-mews-whatsapp-export.txt`](../public/demo-data/mangrove-mews-whatsapp-export.txt) — fictional, user-export-style chat fixture.
- [`public/demo-data/sms-relay.ndjson`](../public/demo-data/sms-relay.ndjson) — fictional intentional-SMS fixture.
- `public/demo-assets/` — fictional AI-generated cat images for the demo only.
