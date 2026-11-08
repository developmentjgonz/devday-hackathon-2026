import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { setTracingDisabled } from "@openai/agents";
import { importSyntheticFixture, prepareSyntheticImport } from "../../worker/intake.js";
import worker from "../../worker/index.js";
import { provisionUser } from "../../worker/auth.js";

setTracingDisabled(true);
const fixture = file => JSON.parse(readFileSync(new URL(`../../public/demo-data/${file}`, import.meta.url), "utf8"));
const weekend = fixture("synthetic-weekend-shift.json");
const original = fixture("synthetic-intake-batch.json");
function setup({ legacy = false } = {}) {
  const sqlite = new DatabaseSync(":memory:");
  const files = readdirSync(new URL("../../migrations/", import.meta.url)).filter(file => file.endsWith(".sql")).sort();
  for (const file of files.filter(file => !legacy || file < "0014")) sqlite.exec(readFileSync(new URL(`../../migrations/${file}`, import.meta.url), "utf8"));
  let transaction = Promise.resolve();
  const db = {
    prepare(sql) {
      function bind(...args) { const query = sqlite.prepare(sql); return {
        run: async () => { const out = query.run(...args); return { meta: { changes: Number(out.changes) } }; },
        first: async () => query.get(...args) ?? null,
        all: async () => query.columns().length ? { results: query.all(...args) } : { results: [], meta: { changes: Number(query.run(...args).changes) } },
      }; }
      return { bind, run: () => bind().run(), first: () => bind().first(), all: () => bind().all() };
    },
    batch(items) {
      const task = transaction.then(async () => {
        sqlite.exec("BEGIN IMMEDIATE");
        try { const result = []; for (const item of items) result.push(await item.all()); sqlite.exec("COMMIT"); return result; }
        catch (error) { sqlite.exec("ROLLBACK"); throw error; }
      });
      transaction = task.catch(() => {});
      return task;
    },
  };
  return { sqlite, db, migrate: () => sqlite.exec(readFileSync(new URL("../../migrations/0014_source_identity.sql", import.meta.url), "utf8")) };
}
const count = (sqlite, table, where = "") => sqlite.prepare(`SELECT COUNT(*) AS n FROM ${table} ${where}`).get().n;
const streamed = (pack, record) => ({ ...pack, batchId: `${pack.batchId}-${record.id}`, records: [record] });
function totals(sqlite) { return { messages: count(sqlite, "intake_source_messages"), observations: count(sqlite, "intake_observations"), feeds: count(sqlite, "feeder_visit_log"), urgent: count(sqlite, "intake_review_queue", "WHERE review_kind='urgent_care'"), reviews: count(sqlite, "intake_review_queue") }; }
const expected = prepareSyntheticImport(weekend);

test("bulk then chat replay stores each of 72 sources once and makes no duplicate model calls", async () => {
  const { db, sqlite } = setup(); let calls = 0;
  const assessRecord = async () => { calls += 1; return { mode: "unit-agent", urgency: "routine", summary: "Synthetic test assessment." }; };
  const bulk = await importSyntheticFixture({ db, fixture: weekend, assessRecord });
  assert.equal(bulk.reportsImported, 72); assert.equal(bulk.reportsSkipped, 0); assert.equal(calls, 72);
  const before = totals(sqlite);
  assert.equal(before.feeds, expected.summary.feederVisits);
  assert.equal(before.urgent, expected.summary.urgentReviews);
  const reviewed = sqlite.prepare("SELECT id FROM intake_review_queue LIMIT 1").get().id;
  sqlite.prepare("UPDATE intake_review_queue SET status='dismissed' WHERE id=?").run(reviewed);
  for (const record of weekend.records) {
    const replay = await importSyntheticFixture({ db, fixture: streamed(weekend, record), assessRecord });
    assert.equal(replay.reportsImported, 0); assert.equal(replay.reportsSkipped, 1);
    assert.equal(replay.traceIds[0], `${weekend.batchId}:${record.id}`);
  }
  assert.equal(calls, 72, "existing source identity is checked before inference");
  assert.deepEqual(totals(sqlite), before);
  assert.equal(count(sqlite, "intake_import_batches"), 1, "duplicate transport wrappers do not create empty batches");
  assert.equal(sqlite.prepare("SELECT status FROM intake_review_queue WHERE id=?").get(reviewed).status, "dismissed");
  sqlite.close();
});

test("stream then bulk, partial mixed batches and source conflicts preserve counts and original evidence", async () => {
  const { db, sqlite } = setup(); let calls = 0;
  const assessRecord = async () => { calls += 1; return { mode: "unit-agent", urgency: "routine" }; };
  for (const record of weekend.records.slice(0, 3)) await importSyntheticFixture({ db, fixture: streamed(weekend, record), assessRecord });
  const mixed = await importSyntheticFixture({ db, fixture: weekend, assessRecord });
  assert.equal(mixed.reportsRequested, 72); assert.equal(mixed.reportsImported, 69); assert.equal(mixed.reportsSkipped, 3);
  assert.equal(calls, 72); assert.equal(count(sqlite, "intake_source_messages"), 72);
  assert.equal(count(sqlite, "feeder_visit_log"), expected.summary.feederVisits);
  assert.equal(count(sqlite, "intake_review_queue", "WHERE review_kind='urgent_care'"), expected.summary.urgentReviews);
  const duplicate = await importSyntheticFixture({ db, fixture: weekend, assessRecord });
  assert.equal(duplicate.reportsImported, 0); assert.equal(duplicate.reportsSkipped, 72); assert.equal(calls, 72);
  const changed = structuredClone(streamed(weekend, weekend.records[0])); changed.records[0].text += " Changed evidence.";
  await assert.rejects(() => importSyntheticFixture({ db, fixture: changed, assessRecord }), error => error.status === 409 && error.code === "SOURCE_CONFLICT");
  assert.equal(calls, 72); assert.equal(count(sqlite, "intake_source_messages"), 72);
  assert.ok(!sqlite.prepare("SELECT body_redacted FROM intake_source_messages ORDER BY id LIMIT 1").get().body_redacted.includes("Changed evidence"));
  const wrongId = { ...weekend, records: [{ ...weekend.records[0], id: "wa-w999" }] };
  await assert.rejects(() => importSyntheticFixture({ db, fixture: wrongId, assessRecord }), /not registered/);
  await assert.rejects(() => importSyntheticFixture({ db, fixture: { ...weekend, batchId: weekend.batchId + "-made-up", records: [weekend.records[0]] }, assessRecord }), /suffix/);
  sqlite.close();
});

test("identical local source IDs in unrelated fixture namespaces remain separate", async () => {
  const { db, sqlite } = setup();
  const a = { ...weekend, batchId: "independent-demo-a", records: [weekend.records[0]] };
  const b = { ...a, batchId: "independent-demo-b" };
  await importSyntheticFixture({ db, fixture: a }); await importSyntheticFixture({ db, fixture: b });
  assert.equal(count(sqlite, "intake_source_messages"), 2);
  assert.equal(count(sqlite, "intake_source_identities"), 2);
  sqlite.close();
});

test("all 72 chat-delivered sources are reused by a later bulk import", async () => {
  const { db, sqlite } = setup(); let calls = 0;
  const assessRecord = async () => { calls += 1; return { mode: "unit-agent", urgency: "routine" }; };
  for (const record of weekend.records) await importSyntheticFixture({ db, fixture: streamed(weekend, record), assessRecord });
  const before = totals(sqlite);
  const bulk = await importSyntheticFixture({ db, fixture: weekend, assessRecord });
  assert.equal(bulk.reportsImported, 0); assert.equal(bulk.reportsSkipped, 72); assert.equal(calls, 72);
  assert.deepEqual(totals(sqlite), before);
  assert.equal(count(sqlite, "intake_source_messages"), 72);
  assert.equal(count(sqlite, "intake_import_batches"), 72);
  assert.ok(bulk.traceIds.every(trace => trace.startsWith(weekend.batchId + "-")));
  sqlite.close();
});

test("source claims serialize concurrent inference and release failed attempts for a safe retry", async () => {
  const { db, sqlite } = setup(); const pack = streamed(weekend, weekend.records[0]);
  let release, started;
  const gate = new Promise(resolve => { release = resolve; });
  const entered = new Promise(resolve => { started = resolve; }); let calls = 0;
  const running = importSyntheticFixture({ db, fixture: pack, assessRecord: async () => { calls += 1; started(); await gate; return { mode: "unit-agent", urgency: "routine" }; } });
  await entered;
  await assert.rejects(() => importSyntheticFixture({ db, fixture: pack, assessRecord: async () => { calls += 1; } }), error => error.code === "IMPORT_IN_PROGRESS");
  assert.equal(calls, 1); assert.equal(count(sqlite, "intake_source_messages"), 0);
  release(); await running;
  assert.equal(count(sqlite, "intake_source_messages"), 1);
  const next = streamed(weekend, weekend.records[1]);
  await assert.rejects(() => importSyntheticFixture({ db, fixture: next, assessRecord: async () => { throw new Error("unit provider failure"); } }), /unit provider failure/);
  assert.equal(count(sqlite, "intake_source_identities", "WHERE state='pending'"), 0);
  const retried = await importSyntheticFixture({ db, fixture: next });
  assert.equal(retried.reportsImported, 1);
  sqlite.close();
});

test("an expired claim can be recovered and the old owner cannot append duplicate evidence", async () => {
  const { db, sqlite } = setup(); const pack = streamed(weekend, weekend.records[0]);
  let release, started;
  const gate = new Promise(resolve => { release = resolve; });
  const entered = new Promise(resolve => { started = resolve; });
  const oldOwner = importSyntheticFixture({ db, fixture: pack, assessRecord: async () => { started(); await gate; return { mode: "old-unit-agent", urgency: "routine" }; } });
  await entered;
  sqlite.prepare("UPDATE intake_source_identities SET claim_until='2000-01-01T00:00:00.000Z' WHERE state='pending'").run();
  const recovered = await importSyntheticFixture({ db, fixture: pack, assessRecord: async () => ({ mode: "recovered-unit-agent", urgency: "routine" }) });
  assert.equal(recovered.reportsImported, 1);
  release(); const late = await oldOwner;
  assert.equal(late.reportsImported, 0); assert.equal(late.reportsSkipped, 1);
  assert.equal(count(sqlite, "intake_source_messages"), 1);
  assert.equal(count(sqlite, "intake_observations"), 1);
  assert.equal(sqlite.prepare("SELECT mode FROM intake_assessments").get().mode, "recovered-unit-agent");
  sqlite.close();
});

function addLegacy(sqlite, pack, record, { derivedUrgency = false } = {}) {
  const source = prepareSyntheticImport({ ...pack, records: [record] }).messages[0];
  sqlite.prepare("INSERT INTO intake_import_batches(id,source_kind,provenance,record_count,created_at) VALUES(?,?,?,?,?)").run(pack.batchId, pack.sourceKind, pack.provenance, 1, "2026-11-08T10:00:00Z");
  sqlite.prepare("INSERT INTO intake_source_messages(id,batch_id,source_message_id,trace_id,source_kind,volunteer_alias,body_redacted,broad_area,attachment_manifest_json,received_at,raw_fixture_json) VALUES(?,?,?,?,?,?,?,?,?,?,?)").run(source.messageId, pack.batchId, source.id, source.traceId, source.sourceKind, source.volunteerAlias, source.text, source.broadArea, JSON.stringify(source.attachments), record.receivedAt, JSON.stringify({ synthetic: true, flags: [...source.flags, ...(derivedUrgency ? ["agent_urgent"] : [])] }));
  sqlite.prepare("INSERT INTO intake_observations(id,source_message_id,proposed_cat_key,proposed_colony_key,colony_confidence,duplicate_group,urgency,created_at,assigned_colony_key,assignment_state,source_count_low,source_count_high,source_count_confidence,source_feeding_confirmed) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)").run(source.observationId, source.messageId, source.proposedCatKey, source.proposedColonyKey, source.colonyConfidence, source.duplicateGroup, source.urgency, "2026-11-08T10:00:00Z", source.assignedColonyKey, "confirmed", source.count?.low ?? null, source.count?.high ?? null, source.count?.confidence ?? null, source.feedingConfirmed ? 1 : 0);
  for (const review of source.review) sqlite.prepare("INSERT INTO intake_review_queue(id,observation_id,review_kind,status,explanation,created_at) VALUES(?,?,?,'dismissed',?,?)").run(review.id, source.observationId, review.kind, review.explanation, "2026-11-08T10:00:00Z");
  return source;
}

test("legacy migration preserves both historical copies and decisions, reports collisions, and adopts original source identity without inference", async () => {
  const { db, sqlite, migrate } = setup({ legacy: true }); const record = original.records[1];
  const bulk = addLegacy(sqlite, original, record, { derivedUrgency: true });
  addLegacy(sqlite, { ...original, batchId: "live-shift-v1-" + record.id }, record, { derivedUrgency: true });
  const before = totals(sqlite); migrate();
  assert.deepEqual(totals(sqlite), before);
  const inventory = sqlite.prepare("SELECT * FROM legacy_fixture_source_duplicates").all();
  assert.equal(inventory.length, 1); assert.equal(inventory[0].stored_copies, 2);
  let calls = 0;
  const replay = await importSyntheticFixture({ db, fixture: streamed(original, record), assessRecord: async () => { calls += 1; } });
  assert.equal(replay.reportsImported, 0); assert.equal(replay.reportsSkipped, 1); assert.equal(calls, 0);
  assert.deepEqual(totals(sqlite), before);
  assert.equal(sqlite.prepare("SELECT state FROM intake_source_identities").get().state, "stored");
  assert.equal(sqlite.prepare("SELECT assignment_state FROM intake_observations WHERE id=?").get(bulk.observationId).assignment_state, "confirmed");
  assert.equal(count(sqlite, "intake_review_queue", "WHERE status='dismissed'"), before.reviews);
  const changed = structuredClone(streamed(original, record)); changed.records[0].count.high += 1;
  await assert.rejects(() => importSyntheticFixture({ db, fixture: changed }), error => error.code === "SOURCE_CONFLICT");
  sqlite.close();
});

test("model urgency escalates a separate observation/review without changing fingerprinted source evidence", async () => {
  const { db, sqlite } = setup();
  const pack = { ...weekend, batchId: "non-english-risk-unit", records: [{ ...weekend.records[0], text: "DEMO: sa bezwen revizyon ekip la.", flags: [], feedingConfirmed: false }] };
  let calls = 0;
  await importSyntheticFixture({ db, fixture: pack, assessRecord: async record => { calls += 1; record.flags.push("agent_urgent"); return { mode: "unit-agent", urgency: "urgent" }; } });
  assert.equal(sqlite.prepare("SELECT urgency FROM intake_observations").get().urgency, "urgent");
  assert.equal(count(sqlite, "intake_review_queue", "WHERE review_kind='urgent_care'"), 1);
  assert.deepEqual(JSON.parse(sqlite.prepare("SELECT raw_fixture_json FROM intake_source_messages").get().raw_fixture_json).flags, []);
  const hash = sqlite.prepare("SELECT payload_sha256 FROM intake_source_identities").get().payload_sha256;
  await importSyntheticFixture({ db, fixture: pack, assessRecord: async () => { calls += 1; return { mode: "unit-agent", urgency: "routine" }; } });
  assert.equal(calls, 1); assert.equal(sqlite.prepare("SELECT payload_sha256 FROM intake_source_identities").get().payload_sha256, hash);
  assert.equal(sqlite.prepare("SELECT urgency FROM intake_observations").get().urgency, "urgent");
  sqlite.close();
});

test("Worker route checks fresh and legacy source identity before a live-mode model request", async () => {
  const { db, sqlite, migrate } = setup({ legacy: true });
  const legacyRecord = original.records[1]; addLegacy(sqlite, original, legacyRecord, { derivedUrgency: true }); migrate();
  const env = { DB: db, APP_ORIGIN: "https://source-unit.example", OPENAI_API_KEY: "inert-unit-test-key" };
  await provisionUser(env, { email: "coordinator@example.test", password: "a-strong-demo-password", role: "coordinator" });
  const headers = { Origin: env.APP_ORIGIN, "Content-Type": "application/json", "CF-Connecting-IP": "192.0.2.41" };
  const login = await worker.fetch(new Request(env.APP_ORIGIN + "/api/auth/login", { method: "POST", headers, body: JSON.stringify({ email: "coordinator@example.test", password: "a-strong-demo-password" }) }), env);
  assert.equal(login.status, 200);
  const cookies = login.headers.getSetCookie().map(value => value.split(";")[0]);
  const authenticated = { ...headers, Cookie: cookies.join("; "), "X-CSRF-Token": cookies.find(value => value.startsWith("mews_csrf=")).split("=")[1] };
  const post = pack => worker.fetch(new Request(env.APP_ORIGIN + "/api/private/synthetic-import", { method: "POST", headers: authenticated, body: JSON.stringify({ ...pack, analysisMode: "agent" }) }), env);
  const priorFetch = globalThis.fetch; let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return Response.json({ id: "resp-unit", object: "response", created_at: 1, status: "completed", model: "gpt-5-mini", output: [{ id: "msg-unit", type: "message", role: "assistant", status: "completed", content: [{ type: "output_text", annotations: [], text: JSON.stringify({ summary: "Fictional unit review", urgency: "urgent", reasons: ["Unit evidence"], suggestedColonyId: null, colonyConfidence: .4, matchEvidence: { visual: 0, markings: .3, proximity: .2, colonyContext: .2 }, clarification: null, tasks: [] }) }] }], usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2, input_tokens_details: { cached_tokens: 0 }, output_tokens_details: { reasoning_tokens: 0 } } });
  };
  try {
    const legacy = await post(streamed(original, legacyRecord));
    assert.equal(legacy.status, 200); assert.equal((await legacy.json()).reportsSkipped, 1); assert.equal(calls, 0);
    const fresh = { ...original, records: [original.records[0]] };
    const created = await post(fresh); assert.equal(created.status, 201, JSON.stringify(await created.clone().json()));
    assert.deepEqual((await created.json()).modes, ["agent"]); assert.equal(calls, 1);
    const replay = await post(streamed(original, original.records[0]));
    assert.equal(replay.status, 200); assert.equal((await replay.json()).reportsImported, 0); assert.equal(calls, 1);
    const changed = structuredClone(streamed(original, original.records[0])); changed.records[0].text += " Conflicting source body.";
    const conflict = await post(changed); assert.equal(conflict.status, 409); assert.equal((await conflict.json()).code, "SOURCE_CONFLICT"); assert.equal(calls, 1);
    const snapshot = await worker.fetch(new Request(env.APP_ORIGIN + "/api/private/intake", { headers: authenticated }), env);
    assert.ok((await snapshot.json()).reports.every(report => Array.isArray(JSON.parse(report.source_flags_json))));
  } finally { globalThis.fetch = priorFetch; sqlite.close(); }
});
