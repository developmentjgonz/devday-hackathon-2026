# Raw fixture intake and canonical census

These services are intentionally separate from API routing.

```js
import { parseSyntheticWhatsAppExport, parseSyntheticSmsRelay } from "./raw-intake.js";
import { importSyntheticFixture } from "./intake.js";
import { seedCanonicalCatsFromObservations, materializeCanonicalCensus, applyHumanDedupeDecision } from "./census.js";

const fixture = parseSyntheticWhatsAppExport({ text, batchId, provenance });
await importSyntheticFixture({ db: env.DB, fixture });
await seedCanonicalCatsFromObservations(env.DB);
const snapshot = await materializeCanonicalCensus(env.DB);
```

`parseSyntheticWhatsAppExport` accepts only exports that explicitly disclose their synthetic/demo status. `parseSyntheticSmsRelay` accepts only explicitly demo-tagged JSON Lines. Both reject contacts, exact-location fields, external attachments, and unapproved broad areas.

Duplicate decisions require a coordinator route to call `applyHumanDedupeDecision` with an **open** `possible_duplicate` review, authenticated `reviewerId`, distinct canonical cat keys, a decision (`confirmed` or `kept_separate`), and a brief reason. A confirmed decision updates the canonical source record and creates a permanent `dedupe_merge_audit` record. Nothing in parsing, importing, triage, or materialization ever merges cat records.

Apply `migrations/0005_canonical_census_and_dedupe.sql` after the prior migrations. `getObservationTrace` returns a coordinator-safe source chain without raw attachments, contact information, or precise locations.
