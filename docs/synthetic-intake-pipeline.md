# Synthetic intake pipeline

`worker/intake.js` is a fixture-only import service for the hackathon demo. It does not fetch, scrape, or automate live WhatsApp; it accepts only an explicit `synthetic: true` batch with made-up content and approximate, allow-listed areas.

## Integration exports

```js
import { importSyntheticFixture, prepareSyntheticImport } from "./intake.js";

// Coordinator-only route; fixture comes from a bundled file or an authenticated upload.
const result = await importSyntheticFixture({ db: env.DB, fixture });
return Response.json(result);
```

- `validateSyntheticFixtureBatch(fixture)` validates source type, fixture disclosure, broad area, local demo attachments, and rejects coordinates, contacts, and street addresses.
- `prepareSyntheticImport(fixture, { now })` produces deterministic trace IDs, triage/review suggestions, census/feeding events, and a sponsor-safe rollup without writing anything.
- `persistSyntheticImport(env.DB, prepared)` writes the migration-backed D1 records.
- `importSyntheticFixture({ db, fixture, now })` combines preparation and optional persistence.
- `sponsorSafeRollup(prepared)` returns only aggregate metadata; it excludes aliases, source text, photos, exact locations, and routes.

Apply `migrations/0001_synthetic_intake_census.sql` before enabling a route. The included [`synthetic-intake-batch.json`](../public/demo-data/synthetic-intake-batch.json) is the only supported demonstration source. Production needs verified roles, R2 controls, retention/deletion policy, audit logging, rate limits, and a separate reviewed data-protection design.

## Current integration and limitations

The **Shared intake workspace** signs in using a server-provisioned account, submits the 12-record JSON fixture to the protected Worker route, and reads its source messages, review queue, and feeding visits back from D1. A coordinator can record a duplicate decision and export a date-filtered aggregate CSV. Feeding assignments can be created, reassigned, completed, and shown overdue through protected endpoints. Re-importing the same batch is rejected, preserving prior review decisions.

The standalone **Import trace + offline retry desk** parses the supplied `.txt` export and SMS NDJSON for triage, but its local outbox does not yet transform those raw files into the D1 JSON batch. Offline retries receive a triage response, not a persisted census mutation. The D1 importer currently accepts a pre-structured fixture whose identity, colony, attachment and flags are supplied in the fixture; it does not run visual matching or the OpenAI agent. Review decisions do not yet merge cat records. The original dashboard, profile cards, and notifications remain separate demo fixtures.

The `/api/private/photos` endpoint requires a `PHOTOS` R2 binding, a migrated D1 database, a server session and CSRF token. Objects are private, size-limited, signature-checked and pending coordinator review, but image metadata is not removed, image decoding and malware scanning are not implemented, and no upload/review screen is wired. Do not use real photos. To use R2, create a private bucket and configure a Worker binding named `PHOTOS`; do not enable public bucket access.

Authentication must be configured as described in [auth-setup.md](auth-setup.md). Apply the four numbered migrations to an isolated local D1 database before attempting this workspace. The Vite-only server does not run Worker routes; use the configured Cloudflare Worker runtime. Do not use real rescue data until production access control, privacy, upload processing and operational safeguards have been independently reviewed.

Run the local pipeline checks with Node 22.12+:

```sh
node --test tests/unit/intake.test.mjs tests/unit/worker-pipeline.test.mjs
npm run build
```
