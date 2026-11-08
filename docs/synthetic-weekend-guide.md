# Weekend synthetic dispatch guide

Every animal, volunteer alias, colony, message, profile fact, photo and source event in this scenario is invented. Broad neighborhood names provide South Florida context; they do not locate real cats or colonies.

## Inventory

- **72 structured reports:** 36 WhatsApp-style messages and 36 SMS relays in four connected rounds.
- **18 fictional colonies** spanning Little Havana, Little River, North Miami, Fort Lauderdale, Miami Beach, Hialeah, Homestead, and Hollywood / Broward.
- **38 cat keys:** five existing cats, 31 new named cats, and separate Guava/Coco duplicate candidates awaiting human review.
- **Four photo attachments:** three on WhatsApp messages and one on SMS. Three reuse earlier fictional Poppy, Marmalade, and Tux photos; the SMS includes a newly generated alternate Marmalade view for advisory image comparison. New cats have no supplied photo.
- **Four languages:** English, Spanish, Portuguese, and Haitian Creole. Messages vary in length and style and include conversational bilingual transitions.
- **Stable source IDs:** the structured batch is `fixture-weekend-dispatch-2026-11-08-v1`; record IDs run `wa-w001`–`wa-w036` and `sms-w037`–`sms-w072`.

### Colony and cat inventory

Some cats appear in more than one colony. Candidate records remain separate until a coordinator confirms a duplicate decision.

| Colony key | Fictional label | Broad area | Proposed cats in this scenario |
| --- | --- | --- | --- |
| COL-04 | Flagler Yard | Little Havana | Poppy, Domino, Guava |
| COL-LH-COURT-DEMO | Mango Court | Little Havana | Guava, Pepper, Guava candidate |
| COL-02 | Laundry Commons | Little River | Marmalade, Coco, Coco candidate |
| COL-LR-SHADE-DEMO | Palm Shade | Little River | Biscuit, Luna |
| COL-07 | Canal Commons | North Miami | Miso, Nori |
| COL-NM-GARDEN-DEMO | Garden Steps | North Miami | Pebble, Zuri |
| COL-NM-OAK-DEMO | Oak Commons | North Miami | Willow, Juniper |
| COL-11 | Riverwalk Commons | Fort Lauderdale | Tux, Anchor |
| COL-FL-COURT-DEMO | Citrus Court | Fort Lauderdale | Tamarind, Kiwi |
| COL-MB-DEMO | Shade Bowl | Miami Beach | Skipper, Coral |
| COL-MB-PALM-DEMO | Palm Walk | Miami Beach | Sombra, Marina, Skipper |
| COL-MB-BREEZE-DEMO | Breeze Court | Miami Beach | Pearl, Echo |
| COL-HL-DEMO | Lime Commons | Hialeah | Coal, Chispa, Lime, Button |
| COL-HL-COURT-DEMO | Lime Court | Hialeah | Lime, Button |
| COL-HM-DEMO | Dry Commons | Homestead | Mango, Olive |
| COL-HM-MANGO-DEMO | Mango Shade | Homestead | Papaya, Fig |
| COL-HB-GROVE-DEMO | Grove Commons | Hollywood / Broward | Sunny, Velvet |
| COL-HB-PATIO-DEMO | Patio Commons | Hollywood / Broward | Mocha, Clover |

## Demo sequence

1. Sign in as an admin or coordinator and open **Chat imports & outbox**.
2. In **Live synthetic shift**, select **Weekend dispatch · 72 reports / 18 colonies**.
3. Choose **Fast rules · no model call** and **Accelerated · 0.2 seconds** to populate the pipeline quickly, or use the presentation pace to show messages arriving individually. The root Worker supports `analysisMode: "rules" | "agent"`; live agent delivery also requires the server key and mode to be enabled.
4. Select **Start / resume**. Each delivered message goes to the protected importer using its stable per-record batch ID. Pausing and resuming keeps its position during this mounted session; reloading and replaying retains existing backend records and their first assessment mode.
5. Open **Care workspace** to show urgent injury, pregnancy, illness, kittens, and feeder-gap reviews alongside the materialized census. A source report does not resolve a care case or confirm a sensitive status.
6. Open **Clarifications & routing** for Coco’s 0–2 range or Nori’s 0–3 range. Show the low route confidence, assigned clarification, volunteer evidence, and separate human verification.
7. Review Guava/Coco duplicate candidates. Different observers and partial descriptions are suggestions, not evidence to merge automatically.
8. Compare Guava, Skipper, Lime, or Button’s colony associations. Multiple colony links do not create a second cat record or force a home-colony change.
9. Inspect negative checks and later sightings for Zuri, Marina, and Anchor. A negative check does not prove absence, identify a cat, or mark it missing/reunited.
10. Use the human-managed scheduling and search tools for the offered evening feeding shift and flood/traffic access notes. A chat offer is not a completed visit; a weather or hazard note is not proof of a cat’s location.

## Files and parsing boundaries

- `public/demo-data/synthetic-weekend-shift.json` is the rich structured replay. Its `catCatalog` and `colonyCatalog` hold explicit fictional profile facts and labels. These catalogs are not model-generated identity evidence.
- `public/demo-data/synthetic-weekend-whatsapp.txt` is a 36-report WhatsApp-style export with three attachment labels.
- `public/demo-data/synthetic-weekend-sms.ndjson` is a 36-row intentional synthetic SMS relay with one image attachment.
- `worker/synthetic-cat-catalog.js` exports matching static `WEEKEND_CAT_META`, `WEEKEND_CAT_DETAILS`, and `WEEKEND_COLONIES` for Worker/census/map integration.

The raw parsers preserve messages, source traces, attached fixture images, and broad areas. They recognize only a small fixed vocabulary of demo identities. New names and expanded colony labels in the raw companion chats remain unmatched for human review; the structured replay supplies their explicit synthetic proposals. The text export must not be presented as proof of general multilingual identity extraction or a live platform integration.

All dates, counts, profile facts, inferred ranges, and confidence scores are fictional. Negative observations belong in source history and must not be promoted into verified last-seen times. No record instructs an automatic merge, adoption, missing/reunion decision, medical result, or real-world dispatch.
