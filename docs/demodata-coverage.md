# Synthetic demo-data coverage

Everything listed here is invented for the DevDay demo. It is not sourced from a rescue, WhatsApp, a map scrape, a location history, or a real animal. Do not replace the fixtures with real messages, photos, names, phone numbers, or precise colony coordinates during the demonstration.

## Areas and story coverage

| Broad demo area | Fixture/story use | What it demonstrates |
| --- | --- | --- |
| Little Havana / Flagler Yard | Poppy, a fictional calico with a possible front-paw injury | Urgent vet-review path and a message/photo/area association. |
| Little River | Marmalade, an orange tabby with a white chin and left-ear nick | Pregnancy flag, feeder visit, and potential duplicate evidence that stays human-reviewed. |
| North Miami | Uncertain kitten/count examples | Range/count uncertainty; the system preserves an unconfirmed observation. |
| Fort Lauderdale / Riverwalk | Tux, a fictional missing black-and-white cat | Last-seen report and bounded search planning. |
| Miami Beach | Synthetic feeding update and search-task/weather scenarios | Beach/heat/traffic/public-access safety considerations. |
| Hialeah | Fictitious limping observation | Injury review in a separate broad area. |
| Homestead | Fictitious feeding/colony update | Broader South Miami-Dade coverage. |
| Hollywood / Broward | Possible orange-cat sighting | Unmatched/possible-duplicate report that does not auto-merge. |

The app intentionally maps those labels to approximate demonstration anchors. They are not a claim that cats are more common in those places, and they must not be used to guide real trapping, field searches, or public outreach.

## Fixture pack

| Asset | Format | Intended demonstration |
| --- | --- | --- |
| `public/demo-data/mangrove-mews-whatsapp-export.txt` | Export-shaped text | Deliberate WhatsApp Export import; never live-chat automation. |
| `public/demo-data/sms-relay.ndjson` | Intentional relay records | SMS-relay intake and source traceability. |
| `public/demo-data/synthetic-intake-batch.json` | Stream/replay batch | A sequence of fictional reports across the listed areas. |
| `public/demo-data/synthetic-followup-shift.json` | Expanded stream/replay batch | 28 fictional morning follow-ups: 14 WhatsApp-style records and 14 intentional SMS-relay records across the eight listed broad areas. Stable fixture and record IDs make replay idempotent. |
| `public/demo-assets/poppy-calico-limp.png` | Generated fictional cat image | Injury-review scenario. |
| `public/demo-assets/marmalade-orange-tabby.png` | Generated fictional cat image | Potential duplicate / markings scenario. |
| `public/demo-assets/tux-missing-search.png` | Generated fictional cat image | Missing-cat planning scenario. |

The image assets are only illustrative. They cannot identify animals, prove a duplicate, supply medical advice, or validate a sighting. Private-photo upload makes a browser re-encoded copy for the local demo; it does not turn the public fixture image into a real private record.

## Intentional limits

- The only allowed demo locations are broad fictional areas. Coordinates, radii, tracker pings, colony membership, feeders, schedules, and claimed count density are fabricated.
- The public census API deliberately omits individual identities, feeder information, raw sources, attachments, live tags, and precise locations. It exposes only broad fictional aggregate activity.
- The Skipper tracker is a labeled animation, not GPS or live telemetry.
- Weather is a broad planning input when available; it does not infer an animal's movement or location.
- OpenAI output is optional and bounded. The default deterministic mode is suitable for a repeatable demo; neither mode may make a merge, sensitive status change, or field decision without a person.
- Community-signal text is deliberate, redacted input only. The app must not scrape social networks, automate messaging platforms, or import real members of the public.
