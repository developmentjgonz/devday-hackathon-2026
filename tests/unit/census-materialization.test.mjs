import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { prepareSyntheticImport, persistSyntheticImport } from "../../worker/intake.js";
import { applyHumanDedupeDecision, getCanonicalWorkspace, materializeCanonicalCensus, seedCanonicalCatsFromObservations } from "../../worker/census.js";

function d1() {
  const sqlite = new DatabaseSync(":memory:");
  for (const migration of ["0001_synthetic_intake_census.sql", "0002_auth.sql", "0005_canonical_census_and_dedupe.sql", "0006_ingestion_assessments.sql", "0007_care_cases.sql", "0010_intake_confirmations.sql", "0014_source_identity.sql"]) sqlite.exec(readFileSync(new URL(`../../migrations/${migration}`, import.meta.url), "utf8"));
  return {
    prepare(sql) { return { bind(...args) { const prepared = sqlite.prepare(sql); return { async run() { const result = prepared.run(...args); return { meta: { changes: Number(result.changes) } }; }, async first() { return prepared.get(...args) ?? null; }, async all() { return { results: prepared.all(...args) }; } }; } }; },
    async batch(statements) { sqlite.exec("BEGIN"); try { const result = []; for (const statement of statements) result.push(await statement.run()); sqlite.exec("COMMIT"); return result; } catch (error) { sqlite.exec("ROLLBACK"); throw error; } },
  };
}

test("canonical census uses independent aggregates and returns the protected workspace DTO", async () => {
  const db = d1(); const fixture = JSON.parse(readFileSync(new URL("../../public/demo-data/synthetic-intake-batch.json", import.meta.url), "utf8"));
  const prepared = prepareSyntheticImport(fixture, { now: "2026-11-08T00:00:00.000Z" }); await persistSyntheticImport(db, prepared); await seedCanonicalCatsFromObservations(db, { at: "2026-11-08T00:00:01.000Z" });
  const workspace = await materializeCanonicalCensus(db, { materializedAt: "2026-11-08T00:00:02.000Z" }); const littleRiver = workspace.colonies.find((row) => row.colony_key === "COL-02");
  assert.deepEqual(Object.keys(littleRiver).sort(), ["broad_area", "cat_count", "colony_key", "count_confidence", "count_reported_at", "fixed_count", "last_fed_at", "last_feeder", "needs_vet", "reported_count_high", "reported_count_low", "tnr_pending", "tnr_unknown"]);
  assert.equal(littleRiver.cat_count, 1, "two Marmalade reports remain one canonical cat candidate"); assert.equal(littleRiver.needs_vet, 1, "open urgent review is counted once, not multiplied by feed/duplicate joins"); assert.equal(littleRiver.last_feeder, "Joel M.");
  assert.equal(workspace.cats.find((cat) => cat.cat_key === "CAT-11").fixed, true); assert.equal(workspace.cats.find((cat) => cat.cat_key === "CAT-02").fixed, null);
  const publicView = await getCanonicalWorkspace(db, { publicView: true }); assert.equal(publicView.colonies.find((row) => row.colony_key === "COL-02").last_feeder, null);
});

test("dedupe decision is human-tied to its source observation and refuses chains", async () => {
  const db = d1(); const fixture = JSON.parse(readFileSync(new URL("../../public/demo-data/synthetic-intake-batch.json", import.meta.url), "utf8"));
  await persistSyntheticImport(db, prepareSyntheticImport(fixture, { now: "2026-11-08T00:00:00.000Z" })); await seedCanonicalCatsFromObservations(db, { at: "2026-11-08T00:00:01.000Z" });
  await db.prepare("INSERT INTO users (id,email,password_hash,role,created_at,updated_at) VALUES (1,'coord@example.test','hash','coordinator',1,1)").bind().run();
  const review = await db.prepare("SELECT id FROM intake_review_queue WHERE review_kind='possible_duplicate' LIMIT 1").bind().first();
  await assert.rejects(() => applyHumanDedupeDecision(db, { reviewId: review.id, reviewerId: 1, sourceCatKey: "CAT-04", targetCatKey: "CAT-02", decision: "confirmed", reasoning: "wrong source" }));
  const result = await applyHumanDedupeDecision(db, { reviewId: review.id, reviewerId: 1, sourceCatKey: "CAT-02", targetCatKey: "CAT-04", decision: "confirmed", reasoning: "Fictional marks and photo evidence reviewed by coordinator." });
  assert.equal(result.decision, "confirmed");
  await assert.rejects(() => applyHumanDedupeDecision(db, { reviewId: review.id, reviewerId: 1, sourceCatKey: "CAT-02", targetCatKey: "CAT-04", decision: "confirmed", reasoning: "replay" }));
});
