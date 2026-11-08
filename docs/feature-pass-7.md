# Feature pass 7 — image evidence and daily fieldwork

Implemented November 8, 2026. Rescue records, cat identities, photos, locations, messages, and outcomes remain deliberately synthetic, as the hackathon requires.

## What changed

**Actual image comparison** sends two selected photo inputs to the OpenAI Agents SDK using `gpt-5-mini`. It accepts exact allowlisted fixture images or approved private-photo records, reads the bytes server-side, and saves their hashes with the result. It reports coat, markings, face, ears, and overall visual similarity, with visible agreements, contradictions, and limitations. Scores are uncalibrated visual heuristics. Missing keys or provider failures produce no fabricated scores.

The comparison desk reuses saved results, rejects the same image bytes as a purported second observation, limits new calls, and records an explicit coordinator review. It never merges a cat or changes its status. The existing source-linked duplicate desk still controls actual human merges.

An additional AI-generated Marmalade photograph shows the intended same fictional cat from another angle. This is a synthetic positive example, not proof of real-world identification accuracy. Image inputs follow the [official OpenAI vision documentation](https://developers.openai.com/api/docs/guides/images-vision?api-mode=responses).

## Five useful features

| Feature | Where | Working behavior |
| --- | --- | --- |
| Global record search | Search records | Finds cat names/markings/status, colonies/broad areas, and source messages/traces; category/area filters; opens the corresponding profile, map selection, or review. |
| Personal agenda | My shift | Combines only this account's feeding visits, search assignments, appointments, open clarifications, and owned handoffs. Shows overdue confirmations and refreshes while open. |
| Care appointments | Field coordination → Care appointments | Managers schedule vet/TNR/follow-up logistics and assign a team member. The assigned volunteer can record arrival; managers document completion/cancellation. Due badges are in-app reminders and never imply a medical outcome. |
| Shared supply board | Field coordination → Supply requests | Team members request quantities of food/traps/carriers, pledge a bounded amount, and see what remains. A manager separately confirms delivery with evidence. |
| Daily handoff | Field coordination → Daily handoff | Linked cat/colony notes have priority and a responsible person. Read acknowledgements are per account and idempotent. Managers close with a resolution. |

Appointment, clarification, and unacknowledged owned-handoff attention items also feed the notification menu, linking to My shift. These are in-app notifications; no external messages are sent. Sponsors/public cannot access the private tools.

## More varied synthetic data

- Added **72 reports**: 36 WhatsApp-style and 36 SMS-relay records.
- The new scenario covers **18 fictional colonies** in Little Havana, Little River, North Miami, Miami Beach, Hialeah, Homestead, Fort Lauderdale, and Hollywood/Broward.
- Added **31 new named cats and two separate duplicate candidates**, with invented coat/marking, estimated DOB, breed, and explicitly unknown or synthetic care fields.
- English, Spanish, Portuguese, and Haitian Creole reports include feeding handoffs, pregnancy/injury/illness, uncertain kittens, migration across colonies, negative checks, and later sightings.
- The local prepared census contains **38 active/unmerged cat records across 18 colonies** after import and the earlier human merge. A fresh hosted seed contains **112 source reports**; the existing local demo retains additional earlier raw/phone reports.
- Live replay offers fast rules or live-agent mode, plus delivery pacing. Stable source IDs preserve prior records when replayed. Larger batch imports default to rules to avoid a long chain of model calls.
- All stored colonies now receive fictional map anchors, including the extra Miami Beach and Hollywood/Broward groups. These are demo placements, not researched real cat-density observations.

Negative search checks remain in history and update the latest report time; they do not become a new reported sighting. Profiles distinguish latest source report from an unverified reported sighting. No verified sighting is invented.

Raw companions preserve message/photo traces and supported broad areas. Their limited parser does not understand arbitrary new cat names or every colony label; unmatched leads remain for review. The structured replay supplies the explicit fictional identity/colony proposals. See [the weekend guide](synthetic-weekend-guide.md).

## Observed verification

- **32 tests passed**, including real SQLite state, API authorization/CSRF, source preservation, seed idempotence, human merge retention, supply bounds, appointment ownership, handoff acknowledgement, private search, and vision input/caching/failure handling.
- Production build, TypeScript, Storybook build, and pinned Wrangler Worker dry run passed.
- Two **live** OpenAI image requests completed and saved pixel-backed evidence. Marmalade versus the alternate Marmalade view returned `review_possible_match` with overall visual similarity 0.86. Marmalade versus Poppy returned `different_visible_features` with overall similarity 0.25. These are example model outputs, not accuracy measurements.
- Live local API checks imported 72 reports without retyping, searched Guava, populated field coordination, showed assigned volunteer work, recorded a supply pledge/handoff acknowledgement, and denied sponsor access to private shift data.
- Browser checks opened the saved image result, recorded a human evidence review without a merge, followed a Guava search result to its multi-colony profile, and displayed the appointment, supply, and handoff tabs.

## Hosted D1/R2 status

**Prepared, not deployed.** The feature branch has an isolated deployment workflow and a repeatable synthetic seed. Its resource names are separate from the team's release. The seed retains human decisions on replay and refreshes census snapshots against the actual remote records rather than replacing them with fixture totals.

The real [deployment attempt](https://github.com/developmentjgonz/devday-hackathon-2026/actions/runs/42488625588) authenticated to Cloudflare Workers but failed on the first D1-management request with `10000: Authentication error`. No dedicated database, R2 bucket, or demo Worker was created by that attempt. R2 access has not been verified.

The Cloudflare account owner must check/replace the repository's `CLOUDFLARE_API_TOKEN` with a token authorized for the configured account's D1 and R2 management, as well as Worker deployment. See [hosted setup](hosted-demo-setup.md). A user-owned alternative hosting path was reviewed, but it was not used because this custom Worker/asset/migration combination was not a verified drop-in integration.

Hosted sign-in is prepared with separate salted verifiers for newly generated 256-bit demo access codes. This avoids Cloudflare's PBKDF2 iteration limit while preserving the existing local password hashes. It is a private synthetic-demo access mechanism, not a general production identity provider.

The existing local OpenAI/Maps keys remain local. Automatic approval review rejected uploading them into this collaborator-owned repository because that destination was not explicitly authorized. A specific permission question is pending. Hosted AI and Google Maps need that approval and configuration after storage authorization is fixed; local integrations continue to work.

## New demo sequence

1. Open the local app and sign in as admin/coordinator. The local-only password remains `SyntheticMiami2026!` for the four `@mangrovemews.demo` role accounts.
2. **Chat imports & outbox** → choose **Weekend dispatch · 72 reports**, fast rules, and fast delivery. Start/resume. Previously imported messages reopen their existing record; duplicate replays do not erase reviews or generate another model charge.
3. **Care workspace** → refresh. Show the 18-colony census and grouped urgent queue.
4. **Search records** → search **Guava**. Open the main cat profile and show its two colony associations and timestamped source history. The separate candidate remains separate until human review.
5. **AI image comparison** → select original Marmalade and alternate Marmalade, acknowledge synthetic inputs, and compare. The saved result reopens without another model request. Show visible evidence, limitations, and the coordinator review. Compare Marmalade/Poppy to demonstrate contradictory features. Do not call either score a probability of identity.
6. **Field coordination → Care appointments** → inspect Poppy's prepared follow-up transport. To demonstrate a new booking, choose a cat, broad area, future time, and team member; enter an invented clinic label/title. Record arrival as that volunteer; complete logistics as manager. Medical/TNR outcomes are documented separately.
7. **Supply requests** → show six requested dry-food bags, two pledged, four unpledged. A volunteer can set their total pledge within the remaining quantity. Manager delivery needs a separate evidence note.
8. **Daily handoff** → inspect the urgent Beach/Tux note, its owner, and acknowledgement count. Record a read acknowledgement; it does not resolve the note. A manager closes with a resolution.
9. Sign in as volunteer and open **My shift**. Show only assigned work and use its shortcuts to the relevant desk. Open Notifications for due appointment/clarification/handoff attention items.
10. **Field map** → show all stored colony groups, the simulated Skipper tracker, weather context, and private active-case search zones. These remain fictional planning anchors; no real animal telemetry or movement validation is claimed.
