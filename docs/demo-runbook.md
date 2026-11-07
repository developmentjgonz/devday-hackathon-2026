# Mangrove Mews demo runbook

This runbook is a seven-minute, judge-ready story for the Mangrove Mews challenge. Every person, cat, photo, chat, phone number, and map coordinate in the project is fictional. Map points are deliberately approximate neighborhood anchors—not real colony, feeder, trap, or hiding-site locations.

## Before the demo

```sh
npm ci
npm run build
npm run dev
```

Open `http://127.0.0.1:5197/`.

For the best map demonstration, set `GOOGLE_MAPS_BROWSER_KEY` in a local Worker environment and deploy through the existing Cloudflare workflow. Without a Maps key, the same layer interactions work on a transparent local map preview.

## Demo flow

1. **Start at Overview.** Show the same-day priorities: a limping calico, a possible pregnancy, and an uncertain kitten count. Point out that an operating coordinator gets urgent decisions and assignments before an overwhelming message stream.
2. **Open Demo source history.** Expand “WhatsApp export + SMS relay.” The messages include fictional attached cat photos and intentionally shared approximate locations. Explain that the app accepts WhatsApp’s user-driven Export chat format—never automated live-chat access.
3. **Open Field map.** Toggle colony coverage, urgent care, hazards, searches, and feeding visits. Switch from Internal to Sponsor to Public to explain data visibility: exact locations remain for verified rescue members, sponsor coordinates are rounded around 500 m, and public views do not expose colony or feeder details.
4. **Select Poppy vet review.** Show that the urgent card exposes a *synthetic approximate anchor* and a private, human-review-only state. The system is permitted to prioritize work; it cannot publish the point or change medical status by itself.
5. **Open Review reports.** Select “Calico with limp,” then “Marmalade.” Demonstrate the four evidence scores: visual, markings, time/place, and colony context. The language deliberately says “suggestion only”; the coordinator must approve any merge.
6. **Replay the fixture proof.** Use “Replay demo batch” below the review queue. It makes the fictional message → agent suggestion → human-reviewed census path explicit: Poppy routes to a suggested colony from photo plus approximate pin, two Marmalade photos remain a review-first duplicate, and injury, pregnancy, and kittens enter the same-day queue. Show the feeder visit, TNR-pending, medical-resolution, and sponsor-safe rollup.
7. **Submit a report.** Choose WhatsApp export or SMS relay, type: `DEMO: orange tabby with white chin appears possibly pregnant; fed 7; maybe three kittens nearby.` Set cat count, turn on “This may be urgent,” attach a private pin, and save.
8. **Explain the agent.** With `OPENAI_API_KEY`, the backend uses the OpenAI Agents SDK to produce urgency, evidence, a requested clarification, and recommended coordinator tasks. With no key, safe demo triage reproduces the workflow. Neither mode auto-merges cats, marks a cat missing/adopted, closes an urgent case, returns feeder contacts, or provides exact locations.
9. **Open Cats & colonies.** Select any fictional cat to show a proper profile: identity markers, colony relationships, TNR/vaccination/medical history, sightings, photos, and the privacy-aware current-location signal. Emphasize that status changes and duplicate merges remain coordinator decisions.
10. **Open Lost cat navigator.** Use Tux’s fictional report, or select the Miami Beach area, then add last-seen time, markings, reference photos, and whether a live tag is attached. The OpenAI agent uses bounded cat-record and safe-search-context tools to return a *probability-ranked* search plan—never a claim that it has located a cat. Its map zones and search guidance are reviewed by a coordinator before a task is assigned.
11. **Open My field tasks.** Show the assignable, verified-volunteer search task rather than a public precise-location broadcast.
12. **Return to Overview and open Community signals desk.** Load the redacted sample, confirm authorization, and stage it. Explain that the separate agent extracts a possible missing-cat or colony lead only from an approved source, removes contacts and exact home locations, keeps a broad area, and requires coordinator approval. It does not scrape Facebook groups or fetch the linked post. For a production connector, obtain each platform’s written authorization/API access or a moderator-provided export first.
13. **Open Cats & colonies and choose Skipper.** Show the “live demo tag” profile, then open Field map with Sightings enabled. The Skipper marker moves every six seconds in the internal demo view; it is fictional and does not create an automatic task or expose a real tracker.

## Fixtures

- [`public/demo-data/mangrove-mews-whatsapp-export.txt`](../public/demo-data/mangrove-mews-whatsapp-export.txt) is the fictional WhatsApp export demonstration.
- [`public/demo-data/sms-relay.ndjson`](../public/demo-data/sms-relay.ndjson) is the fictional intentional SMS relay fixture.
- `public/demo-assets/` contains the three fictional, AI-generated cat photos used in the history and review cards.

## Judge talking points

- Reports go from mobile intake to a reviewable colony/cat suggestion without anyone retyping them.
- The app clearly surfaces census, sterilization/TNR needs, vet needs, and last feeding state.
- Matching is multi-evidence and review-first—not an irreversible automated decision.
- Urgent injury, pregnancy, kittens, feeder gaps, weather, and traffic risks are explicitly triaged.
- The system is mindful of real South Florida field realities (heat, flood/hurricane exposure, canals, traffic, cover, and commercial-service areas) without claiming synthetic demo data is real animal intelligence.
- The missing-cat workflow treats an observed location, last-seen location, colony home range, and optional live tag as distinct signals with distinct confidence/radius; the narrower a radius is, the more restricted its audience is.
