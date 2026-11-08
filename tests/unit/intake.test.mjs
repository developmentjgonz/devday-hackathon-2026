import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { importSyntheticFixture, prepareSyntheticImport, validateSyntheticFixtureBatch } from "../../worker/intake.js";

const fixture = {
  schemaVersion: 1, synthetic: true, batchId: "fixture-test-1", sourceKind: "sms_relay",
  provenance: "Synthetic fictional test fixture.",
  records: [
    { id: "sms-1", volunteerAlias: "Demo volunteer", receivedAt: "2026-11-07T18:00:00-05:00", broadArea: "Little River", text: "Orange tabby may be pregnant. Fed 7.", attachments: [{ kind: "image", fixturePath: "/demo-assets/marmalade-orange-tabby.png" }], proposedColonyKey: "COL-02", proposedCatKey: "CAT-02", colonyConfidence: .9, count: { low: 7, high: 7, confidence: .9 }, feedingConfirmed: true, flags: ["pregnancy"], duplicateGroup: "DEMO-DUP" },
    { id: "sms-2", volunteerAlias: "Demo volunteer", receivedAt: "2026-11-07T18:02:00-05:00", broadArea: "North Miami", text: "Maybe three kittens heard safely from public access.", attachments: [], proposedColonyKey: "COL-07", colonyConfidence: .54, count: { low: 0, high: 3, confidence: .54 }, flags: ["kittens", "uncertain_count"] },
  ],
};

test("synthetic fixture produces traceable human-review updates", () => {
  const prepared = prepareSyntheticImport(fixture, { now: "2026-11-07T20:00:00.000Z" });
  assert.equal(prepared.messages.length, 2);
  assert.equal(prepared.messages[0].urgency, "urgent");
  assert.ok(prepared.messages[0].review.some((review) => review.kind === "possible_duplicate"));
  assert.ok(prepared.messages[1].review.some((review) => review.kind === "uncertain_count"));
  assert.equal(prepared.summary.feederVisits, 1);
  assert.ok(prepared.messages[0].traceId.startsWith("fixture-test-1:sms-1"));
});

test("live-looking or precise fixture input is rejected", () => {
  assert.throws(() => validateSyntheticFixtureBatch({ ...fixture, synthetic: false }));
  assert.throws(() => validateSyntheticFixtureBatch({ ...fixture, records: [{ ...fixture.records[0], latitude: 25.77 }] }));
  assert.throws(() => validateSyntheticFixtureBatch({ ...fixture, records: [{ ...fixture.records[0], text: "Call 305-555-1212" }] }));
});

test("prepared fixture persists through an actual SQLite D1-shaped atomic binding", async () => {
  const sqlite = new DatabaseSync(":memory:");
  for (const file of readdirSync(new URL("../../migrations/", import.meta.url)).filter(file => file.endsWith(".sql")).sort()) sqlite.exec(readFileSync(new URL(`../../migrations/${file}`, import.meta.url), "utf8"));
  const db = { prepare(sql) { return { bind(...args) { const query = sqlite.prepare(sql); return { first: async () => query.get(...args) ?? null, all: async () => ({ results: query.all(...args) }), run: async () => ({ meta: { changes: Number(query.run(...args).changes) } }) }; } }; }, async batch(items) { sqlite.exec("BEGIN"); try { const result = []; for (const item of items) result.push(await item.run()); sqlite.exec("COMMIT"); return result; } catch (error) { sqlite.exec("ROLLBACK"); throw error; } } };
  const result = await importSyntheticFixture({ db, fixture, now: "2026-11-07T20:00:00.000Z" });
  assert.equal(result.persisted, true);
  assert.ok(result.statementCount > 5);
  assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM intake_source_messages").get().n, 2);
  assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM intake_source_identities WHERE state='stored'").get().n, 2);
  sqlite.close();
});

test("source timestamps reject impossible calendar dates, locale strings, missing offsets and NaN", () => {
  for (const value of ["2026-02-29T12:00:00Z", "2026-04-31T12:00:00Z", "2026-13-01T12:00:00Z", "2026-11-08T24:00:00Z", "2026-11-08T12:60:00Z", "2026-11-08T12:00:00", "11/08/2026 12:00 PM", "NaN", "2026-11-08T12:00:00+14:30", 1794134400000]) {
    assert.throws(() => validateSyntheticFixtureBatch({ ...fixture, records: [{ ...fixture.records[0], receivedAt: value }] }), /receivedAt/);
  }
  const valid = validateSyntheticFixtureBatch({ ...fixture, records: [{ ...fixture.records[0], receivedAt: "2024-02-29T12:30:15.12-05:00" }] });
  assert.equal(valid.records[0].receivedAt, "2024-02-29T17:30:15.120Z");
});
