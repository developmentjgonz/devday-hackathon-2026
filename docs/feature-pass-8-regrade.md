# Feature pass 8 — reliable intake and a clearer workday

Reviewed November 8, 2026. This scorecard assesses the working local synthetic demo. The hackathon requires fictional data; using it does not reduce the scores.

## Current grade: 8.6 / 10

These are subjective engineering estimates against the supplied rubric, not official judge scores. Presentation readiness is scored below; a live speaker's delivery has not been observed.

| Criterion | Score | Evidence and remaining gap |
| --- | ---: | --- |
| Functionality fits the problem | 9.0 | A phone report, photo reference, and broad shared area become source-linked observations and a stored census. Colony totals, TNR state, care reviews, feeding logs, profiles, and human-approved duplicate decisions are connected. The fictional brief identifies the rescue's coordination burden and missed urgent cases. A real rescue pilot remains untested. |
| Originality and innovation | 8.5 | Combines multilingual chat evidence, uncertainty review, visual comparison, private missing-cat plans, weather context, and daily volunteer work. Search areas and movement radii still use planning heuristics. |
| Codex and OpenAI use | 9.0 | Codex-built implementation uses the Agents SDK for bounded triage/search and actual image-input comparison, with persisted evidence and human decisions. Source identity is checked before inference to avoid repeated calls on replay. Two live image examples are demonstrations, not an accuracy benchmark. |
| Feasibility and reasoning | 8.0 | Persistent local database, scoped sessions, durable browser outboxes, atomic source claims, preserved human decisions, and 50 passing tests. Hosted storage still needs successful D1/R2 authorization and verification; ongoing costs and field operation need a pilot. |
| Presentation readiness | 8.5 | A varied four-language scenario, streaming chats with images, a real Google basemap, visible tracker controls, and a repeatable demo story. The number of screens still calls for a focused walkthrough. Actual live delivery is unscored. |

The equal-weight mean is **8.6**. The earlier 8.4 estimate predates the image comparison, field tools, expanded scenario, and this integrity/UX pass.

## Changes implemented

### Reports survive bulk import and chat replay without duplication

Registered fixture sources now have an identity independent of their bulk/stream transport wrapper. Exact repeats retain the original source, assessment mode, trace, review, census evidence, and feeding visit. Conflicting edits return a clear `SOURCE_CONFLICT`; a separate follow-up report is required. Concurrent imports claim a source before inference, and unfinished claims can be retried.

The migration preserves historical evidence and human decisions. It does not silently erase older duplicate rows. Managers can inspect the read-only `/api/private/intake/source-duplicates` inventory. Previously stored fixture evidence is adopted lazily after its original payload is verified.

Model urgency is separate from original source flags. It can escalate a care review but cannot erase source-reported injury, pregnancy, kittens, or a feeder gap. Invalid dates and timestamps without a timezone are rejected before persistence. The raw parser no longer assigns a Miami Beach kitten report to a contradictory North Miami colony merely because of a keyword.

### The workday is easier to navigate

- Navigation groups pages into Workday, Cats & map, Coordination, and Demo & admin. Links retain their existing deep-link routes.
- Volunteers land on My shift and see their own assigned-work notifications. Team review notifications are reserved for managers.
- Read acknowledgements persist separately for each account. A failed resource displays an unknown/partial count instead of a misleading zero.
- Sign-out/account changes immediately clear notification and map state and invalidate older requests. Restricted deep links explain the account needed and resume after authorized sign-in.
- The mobile drawer supports Escape, focus containment, a skip link, and an inactive closed sidebar.

### Care and map evidence is clearer

- Cat profiles surface pending urgent-care sources and link managers directly to the matching review. A care flag is kept distinct from a diagnosis.
- Injury, pregnancy, kitten, and feeder-gap grouping uses source flags first, with English, Spanish, Portuguese, and Haitian Creole text fallbacks.
- Field map has Pause/Resume simulated tracker and Follow/Stop following Skipper controls. Reduced-motion settings pause the simulation; hidden tabs stop its interval.
- Mobile layer controls have separate, readable touch targets. A selected record displays the radius for the chosen audience.
- Public preview omits private case plans and tracker controls. Records awaiting a colony assignment are reported as unplaced rather than assigned invented locations.

## Verification observed

| Check | Result |
| --- | --- |
| Unit/integration suite | **50 tests passed**, including real SQLite persistence, cross-mode replay in both directions, mixed imports, source conflicts, concurrent/expired claims, source/agent separation, timestamp validation, area consistency, role navigation, and notification ownership. |
| Production frontend | `npm run build` passed TypeScript and Vite bundling. |
| Worker packaging | Pinned Wrangler 4.158.0 `deploy --dry-run` passed. This checks packaging, not hosted storage. |
| GitHub Actions retry | [Run 42513883485](https://github.com/developmentjgonz/devday-hackathon-2026/actions/runs/42513883485) repeated the build, all 50 tests, Storybook, and Worker packaging successfully on Node 24.22.2. Dedicated deployment then failed at D1 listing with `10000: Authentication error`; no demo resources were created. |
| Existing local data replay | A 72-report bulk repeat and a one-record chat repeat imported zero new sources. Counts remained **124 source messages, 73 review rows, and 40 feeder-log rows**. These are local historical row counts, not counts of urgent cats. |
| Browser chat replay | Paused after **37 sources checked: 0 new, 37 retained**. Images appeared in the chat history. |
| Mobile workday | Volunteer saw one relevant personal notification instead of the manager's review backlog. Mark-read persisted after reload. |
| Profile → review | Poppy's pending care sources opened the matching Little Havana source review. |
| Map | Real Google Maps Miami Beach basemap loaded. Pause/follow, public-view restrictions, and reduced-motion pause were checked. |
| Layout/access | Narrow mobile navigation and restricted deep-link return were checked; a 1280 px DOM layout had no horizontal overflow. Physical-device coverage remains incomplete. |

The prepared local census contains **38 active/unmerged cats across 18 fictional colonies**. The reusable fixture packs contain 112 sources, including the 72-report weekend scenario. Existing local rehearsal reports explain the larger local history.

The local server was restarted after the interrupted session. The browser was refreshed and the real Google Maps basemap, weather layer, and Follow Skipper control were verified again. The local site remains available at [127.0.0.1:5197](http://127.0.0.1:5197/).

## Five-minute core demo

1. **Care workspace:** sign in as coordinator using the local account in the [runbook](demo-runbook.md). Describe the real coordination problem and disclose that all rescue evidence is fictional.
2. **New field report:** submit the prefilled fictional text/photo/area/count/feeding/urgency report. Open its stored trace and urgent queue entry; nothing is retyped by a coordinator.
3. **Chat imports & outbox:** choose Weekend dispatch · 72 reports, fast rules, and short pacing. Start, show photos arriving, then pause. On an already seeded database, explain the retained count; replay must not inflate the census. Use the runbook's archive procedure before the demo if you need a fresh-import story.
4. **Care workspace → Cat profiles & visits:** show colony totals/TNR/last feeding, Poppy's care warning, the timestamped history, and feeder log. Show the prior Marmalade merge or the pending candidate; only a coordinator confirms a merge.
5. **AI image comparison:** reopen the saved Marmalade/alternate-view evidence. Explain the visible feature scores and human review. Use the saved result for predictable timing; requesting a new comparison uses the configured model.
6. **Field map:** show Miami Beach, weather, Skipper, Pause, and Follow. Switch to Public to demonstrate broader areas and omitted private plans. Call the movement simulation and uncertainty radii illustrative.
7. **Missing-cat cases / Lost cat navigator:** reopen Tux's saved plan and field feedback. Show how an unsafe zone is excluded and a coordinator reviews a task before assignment.
8. **Volunteer / Sponsor:** briefly show My shift and the personal notification menu, then the date-filtered outcomes report. Longer appointment, supplies, handoff, outbox, and photo-storage demonstrations are in the [full runbook](demo-runbook.md) and [pass 7 guide](feature-pass-7.md).

## What would raise the score next

1. Verify the dedicated hosted Worker, D1 persistence, private R2 upload/read, and role access from a second device. See [hosted setup](hosted-demo-setup.md) for the latest attempt and account requirement.
2. Evaluate image matching on a larger labelled fictional test set, including lookalikes and poor images. Two examples cannot establish identity accuracy.
3. Validate search suggestions with rescue expertise and evaluate failure cases. No calibrated cat-location probability or physical tracker integration is claimed.
4. Complete a physical-phone rehearsal, offline recovery, and a timed presentation. Browser-local retries require the app to remain open; live SMS/WhatsApp/Facebook ingestion is not connected.
5. Measure operational burden and model cost with a rescue pilot before adding further screens. Arbitrary chat language, consented real evidence, and production identity need separate work beyond the synthetic demo.
