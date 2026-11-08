# Mangrove Mews demo runbook

This is a six-to-seven-minute, judge-ready demonstration of a **fictional** South Florida community-cat rescue. Every cat, person, message, phone number, photo, colony, census value, tracker event, and map anchor is invented for the hackathon. Map anchors deliberately approximate neighborhoods; they are not real rescue, feeder, trap, hiding-spot, or animal locations.

For a precise account of what is implemented, simulated, and still needed, read [Judge Readiness Review](judge-readiness-review.md).

## Before the demo

```sh
npm ci
npm run build
npm run dev
```

Open [http://127.0.0.1:5197/](http://127.0.0.1:5197/).

The account icon at the top opens the demo sign-in, profile, notifications, and preferences. Use any of `admin@mangrovemews.demo`, `volunteer@mangrovemews.demo`, `sponsor@mangrovemews.demo`, or `public@mangrovemews.demo` with password `demo-only`. These credentials only select a browser-local demo persona; they are not authentication or access control.

To show messages arriving over time, scroll to **Replay a synthetic field shift** on Overview, select **Start live replay**, and watch the fictional photo, message, and location entries appear. The queue and feeding-visit indicator advance as the replay runs. Confirm or reject the Marmalade duplicate, then download the sample rollup. Reloading retains replay progress in this browser. This replay is a scripted local simulation; it does not import a chat, invoke the agent, or update the separate static colony tables.

Optional local configuration:

- `GOOGLE_MAPS_BROWSER_KEY` enables the real Google Maps basemap. Restrict it by HTTP referrer and enable only the Maps JavaScript API. A local synthetic map preview remains functional without it.
- `OPENAI_API_KEY` enables the server-side Agents SDK paths for triage and lost-cat planning. Without it, the same screens use deterministic, clearly bounded demo fallbacks.

Do not use real messages, photos, people, or locations in the demo.

## Six-minute judge flow

### 1. Start with the operating picture — 45 seconds

On **Overview**, point out the current census, fixed/TNR numbers, urgent queue, and assigned work. The intended outcome is that a coordinator sees injury, possible pregnancy, kittens, overdue/needed feedings, and TNR pressure in one place rather than in an unread group chat.

Say: “This is the same-day operating picture—not a passive archive.”

### 2. Establish safe inputs — 45 seconds

Open **Demo source history** at the bottom of the page. It shows the fictional WhatsApp export and intentional SMS-relay scenario: photos, approximate shared-location wording, and a duplicate-photo story.

Say: “We support a volunteer-provided WhatsApp Export and intentional relay—not automated access to a live WhatsApp chat. These are hackathon fixtures, not live imports.”

Do not say the app parses these files into persistent records today; it displays them and makes the desired workflow reviewable.

### 3. Replay the intended evidence path — 45 seconds

Use **Replay demo batch** in the “Judge-ready workflow proof” panel. Call out the three stages:

1. Intentional messages, photos, and approximate pins are supplied.
2. The agent suggests a colony/cat/urgency relationship and retains the evidence.
3. A person reviews it before any census, duplicate, medical, or status change.

Then point to the feeder visit, TNR-pending, medical-review, and sponsor-safe rollup. This makes the acceptance criteria visible without claiming that the replay writes to a production database.

### 4. Show one mobile report and one review-first duplicate — 75 seconds

Click **New field report**. Switch between Web report, SMS relay, and WhatsApp export modes. Type this fictional content:

```text
DEMO: orange tabby with white chin appears possibly pregnant; fed 7; maybe three kittens nearby.
```

Set the count, select **Feeding confirmed**, select **This may be urgent**, attach a *fictional* image if desired, attach the private-pin UI, and save. The Worker calls `/api/triage` when available; otherwise the browser deliberately saves the payload only to its offline demo queue.

Next open **Reports** and select Marmalade. Explain the visual, markings, place/time, and colony-context scores. Choose neither “merge automatically” nor a definitive identity: the interface must keep the records separate until a rescue person approves a merge.

### 5. Show the map, radius semantics, and Miami Beach — 75 seconds

Open **Field map**. Toggle colonies, sightings, urgent care, hazards, missing searches, feeding visits, and weather. Select an urgent item and change the audience mode from **Internal** to **Sponsor** to **Public**.

Explain the distinction:

- Internal and sponsor views show synthetic operational radii in this demo; actual production exposure must be authorized server-side.
- Public mode rounds a coordinate and widens the displayed radius to at least 500 m.
- The Google basemap is real when configured; every cat/colony/hazard marker remains fictional and approximate.
- Miami-Dade, Broward, South Dade, and Miami Beach anchors demonstrate area coverage, not real sighting density.
- Weather cells are live, broad-area safety context from Open-Meteo. They affect volunteer safety decisions, never a claim about where a cat is.

With sightings enabled, point out **Skipper**, whose internal-only marker shifts every six seconds. Call it a fictional tracker simulation, not a device integration.

### 6. Show the individual record and missing-cat plan — 90 seconds

Open **Cats & colonies** and select Poppy or Marmalade. Show the profile fields: identity markers, ear-tip/TNR, vaccination context, care state, colony relationship, current status, and chronological history. Emphasize that record status, adoption, missing, deceased, and duplicate changes require human review.

Open **Lost cat navigator**. Use Tux’s default fictional report. Include last-seen time, description/markings, optional reference-photo count, and live-tag state; then choose **Find likely search areas**.

The result is a ranked set of probability zones—not a claimed cat location. It separates last seen, cover, and home range, asks a clarification when useful, and reminds volunteers about public access, traffic, canals, construction, heat, and flooding. Change the area to **Miami Beach** to demonstrate an alternate safe-cover plan.

Say: “The agent can recommend what to check and why; a coordinator assigns the task, and nobody is sent onto private or unsafe property.”

## Acceptance-criteria evidence table

| Judge expectation | Where to show it | Accurate statement |
| --- | --- | --- |
| Phone report with message/photo/location routes to a colony/cat | New field report, fixture history, reports, workflow proof | Demonstrated as a triage/review workflow with fictional evidence. Uploads/pins are not yet persisted or parsed. |
| Colony state shows census, fixed, TNR, vet need, and last feeder | Overview and Cats & colonies table | Static synthetic census data shown as an operating dashboard. |
| Same cat is counted once | Marmalade report and evidence scores | A multi-evidence duplicate **suggestion**; only a human can merge. |
| Urgent cases stand out | Overview and Reports | Injury, pregnancy, and uncertain kittens are shown as immediate review priorities. |
| Exported-chat/SMS batch becomes a census | Fixture history and workflow proof | The intended, review-first pipeline is demonstrated; a persistent parser/importer remains a next step. |
| Agent maintains census and produces sponsor/city report | Triage route, workflow proof, map/census UI | Bounded agent suggestions and a sponsor-safe rollup are demonstrated; production persistence/export is not yet implemented. |
| Map, cat profile/history, feeder-visit log | Field map, Cat profiles, colony table, workflow proof | All are present with synthetic/approximate data. |

## Judge talking points

- “We chose a human-in-the-loop design: the agent can prioritize, explain, and suggest; people approve identities and consequential status changes.”
- “We explicitly avoid prohibited live WhatsApp automation. The product is designed around exported chats and intentional reports.”
- “Location is treated as confidence plus access level, not as an absolute fact. Public audiences receive a widened, rounded area.”
- “The demo has genuine Google Maps and broad weather context, but it deliberately does not pretend fictional records are real rescue intelligence.”

## Recovery plan

- **No Google Maps key/network:** use the built-in synthetic fallback map; all layer/radius interactions still work.
- **No OpenAI key/network:** use the deterministic triage and search-plan fallback. Explain that the same safe output contract remains visible.
- **No weather result:** the map leaves weather cells empty; do not claim a forecast.
- **If asked about production:** use the review document’s “Reality boundary” and describe D1/R2/auth/importer work as next steps rather than presenting it as done.

## Fixtures

- [`public/demo-data/mangrove-mews-whatsapp-export.txt`](../public/demo-data/mangrove-mews-whatsapp-export.txt) — fictional, user-export-style chat fixture.
- [`public/demo-data/sms-relay.ndjson`](../public/demo-data/sms-relay.ndjson) — fictional intentional-SMS fixture.
- `public/demo-assets/` — fictional AI-generated cat images for the demo only.
