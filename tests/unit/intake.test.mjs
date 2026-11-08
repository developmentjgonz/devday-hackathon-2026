import assert from "node:assert/strict";
import test from "node:test";
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

test("prepared fixture can persist using a D1-shaped batch binding", async () => {
  const calls = [];
  const db = { prepare(sql) { return { bind(...values) { return { sql, values, run: async () => calls.push({ sql, values }) }; } }; }, async batch(statements) { for (const statement of statements) await statement.run(); } };
  const result = await importSyntheticFixture({ db, fixture, now: "2026-11-07T20:00:00.000Z" });
  assert.equal(result.persisted, true);
  assert.ok(result.statementCount > 5);
  assert.equal(calls.length, result.statementCount);
});
