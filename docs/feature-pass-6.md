# Feature pass 6 — shared operations and human confirmation

Status: implemented and verified locally on November 8, 2026, including browser interaction and live OpenAI search planning. This is a synthetic hackathon demonstration, not a hosted deployment or real-rescue validation. All rescue reports, people, cat photos, map anchors, and outcomes are fictional; Google Maps and available broad weather context are external provider data.

## What this pass adds

The current Workspace starts with **Today’s operations**, a private, refreshing field-care board above Team census. It reads the protected local API rather than inventing values:

- An urgent queue includes only observations with an **open `urgent_care` review**. It groups source reports by canonical/proposed cat, colony/broad area, and category so repeated reports do not inflate a cat count.
- Injury, pregnancy, kittens, and feeder-gap labels are priority categories. The labeler recognizes common English, Spanish, and Portuguese cues in the fictional redacted text, but a label alone never promotes an item into the urgent queue.
- The board shows overdue and next feeding assignments, latest uncertain/unmatched observations, and open medical care cases. If a protected data source is unavailable, its count is displayed as unknown rather than zero.
- The board refreshes every 30 seconds while open and reacts to the app’s data-change event. Clicking an observation stores its ID in session storage and opens the protected **Clarifications & routing** desk.
- Sponsor mode uses the sponsor-safe census/outcome resources and displays aggregate summaries. It does not request private intake, feeder assignments, or care-case detail, and does not display individual cat evidence or locations. Unsigned visitors are directed to Team census sign-in.

The new confidence-gated intake review keeps original source evidence separate from later verification. The default automatic colony-routing threshold is **0.75**. Automatic/unmatched suggestions can be re-evaluated; a human confirmation remains intact. A manager can ask a targeted clarification, the assigned volunteer can reply with fictional evidence, and a manager can confirm a colony and verified count. The source message and its reported count are preserved rather than overwritten.

Missing-case handling is similarly review-first: a pending case needs a manager confirmation before the linked cat is marked missing. A bounded search plan is stored with its computation mode and the feedback it used. Volunteers can record seen/not-seen/unsafe evidence with a timestamp. New feedback marks a plan stale, and an unsafe zone is immediately withheld before another model call. A coordinator can rebuild the plan and prepare a field task through the existing access/safety checklist. Only a manager's explicit reunion confirmation changes the case outcome and restores the linked cat's active status.

The **Field map** has a seventh layer, **Active missing-cat search plans**, showing stored zones for active cases to the internal team. Sponsors and public viewers cannot see these private case plans. All radii and zone scores remain illustrative heuristics, not calibrated probabilities or measured movement.

## Suggested judge walkthrough

1. Sign in with a local synthetic team account and start at **Care workspace**. Point out that Today’s operations shows only live local protected data, not static fixture totals.
2. Select an uncertain item from **Needs clarification**. The app opens **Clarifications & routing** focused on its observation.
3. As a coordinator/admin, request one focused clarification from the assigned volunteer. As the volunteer, record a fictional reply and evidence. Return as the coordinator/admin to confirm a colony and verified count with required evidence.
4. Explain that the original report remains available, while the verification record is a separate human decision. The 0.75 route threshold is configurable but never overrides a human confirmation.
5. Open **Missing-cat cases**, create a fictional case linked to a canonical cat, and select its fixture photo, broad area, and past last-seen time. It starts pending; the linked cat is unchanged. Enter a reason and acknowledge human review, then select **Confirm missing case**.
6. Select **Generate and save search plan**. Read its mode badge. Record a fictional unsafe-access observation against one zone. Show that the zone disappears and field-task preparation is disabled on the stale plan. Select **Update search plan with feedback** and compare the remaining unverified zones on **Field map**. Only a human reunion confirmation changes the case outcome.
7. Return to Today’s operations: the board is an operational shortcut, not a replacement for review. Source reports remain separate until a coordinator records the appropriate human decision.

## Verification record

Observed during this documentation pass:

- `npm run build` completed successfully, including TypeScript checking.
- `npm test` completed successfully: **16 passing tests**, 0 failures.
- The pinned Wrangler 4.158.0 dry run bundled the Worker successfully; it did not deploy it.
- The test suite includes confidence routing/source preservation, manager threshold re-evaluation without overwriting human confirmation, volunteer clarification ownership, missing-case human confirmation/reunion behavior, canonical census aggregation, search-task safety/ownership, and synthetic intake persistence.
- Browser + local API: a report originally saying **maybe three kittens** retained its original **0–3 / 54%** source range. An assigned volunteer's reply was recorded; admin confirmation added **3–3 / 95%** as separate verification and resolved the clarification. Urgent care reviews were not closed by the count confirmation.
- Browser: a Tux case moved from pending to active only after a reason and human acknowledgement. A real OpenAI request returned and stored an **agent** search plan. An unsafe-zone report immediately hid that zone and made the old plan stale. A second live agent run stored an updated plan with two remaining zones.
- Browser: the two stored Tux search zones appeared on the internal Field map and were absent from the public preview. Today’s operations reflected the updated local records.
- Mobile: the operations board was inspected at a 320 px viewport with no horizontal page overflow. Desktop DOM width was checked at 1280 px; full desktop visual inspection was limited by the browser panel's native screenshot size.

Not verified: a remote Worker/D1/R2 deployment, live messaging-platform integrations, real image recognition, tracker telemetry, a full physical-device matrix, or production privacy/security controls. The active local demo retains the prepared Tux case so the user can inspect it; reunion behavior was exercised in API tests rather than closing that prepared case in the UI.

## Engineering estimates, not novelty checks

These are subjective local-demo estimates, not benchmarks, judge scores, or external validation.

| Criterion | Estimate / 10 | Why |
| --- | ---: | --- |
| Challenge fit | 9.0 | The operations board, enforced routing threshold, preserved uncertainty, volunteer clarification, and human-confirmed missing-case lifecycle strengthen same-day coordination. |
| Originality | 8.0 | It combines human-confirmed colony/count routing with a safety-gated field-search and review-first missing-case path. |
| Codex / OpenAI use | 8.5 | Live Agents SDK search planning used stored candidates, broad weather/scenario context, and field feedback; deterministic controls withheld unsafe zones. Image matching and calibrated movement inference remain unimplemented. |
| Feasibility | 8.0 | Local SQLite/file-backed persistence, role boundaries, fixture parsers, and tests make the demonstration repeatable; production infrastructure remains unverified. |
| Presentation | 8.5 | The top operations board makes priorities and handoffs visible without hiding uncertainty or human approvals. |
| **Mean** | **8.4** | Revised after this pass, from a pre-pass estimate of 8.2. |

## Remaining boundaries

- All data is synthetic and locations are broad, fictional demonstration areas.
- Google Maps and weather may be real providers when configured, but markers, radii, tracker movement, search zones, and hazard records are synthetic planning visuals.
- No live WhatsApp/SMS/Facebook automation, real person data, precise rescue location, real medical advice, or automatic merge/adoption/missing/deceased decision is included. An intentional export and scripted relay remain the demo intake paths.
- A production pilot would still require deployed D1/R2, reviewed identity/audit/retention controls, consent, monitoring, incident response, and evaluated consented-data AI behavior.
