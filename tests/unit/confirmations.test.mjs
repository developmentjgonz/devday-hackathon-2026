import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { confirmObservation, getRoutingSettings, listIntakeReview, readRoutingThreshold, replyClarification, requestClarification, setRoutingSettings } from "../../worker/confirmations.js";

function database() {
  const sqlite = new DatabaseSync(":memory:");
  for (const name of ["0001_synthetic_intake_census.sql", "0002_auth.sql", "0005_canonical_census_and_dedupe.sql", "0006_ingestion_assessments.sql"]) sqlite.exec(readFileSync(new URL(`../../migrations/${name}`, import.meta.url), "utf8"));
  sqlite.exec("INSERT INTO users (id,email,password_hash,role,created_at,updated_at) VALUES (1,'coord@example.test','x','coordinator',1,1),(2,'vol@example.test','x','volunteer',1,1),(3,'other@example.test','x','volunteer',1,1),(4,'sponsor@example.test','x','sponsor',1,1)");
  sqlite.exec("INSERT INTO canonical_colonies (colony_key,broad_area,created_at,updated_at) VALUES ('COL-KNOWN','Little Havana','2026-11-08','2026-11-08')");
  sqlite.exec("INSERT INTO intake_import_batches (id,source_kind,provenance,record_count,created_at) VALUES ('BATCH-1','whatsapp_export','Synthetic fixture',1,'2026-11-08T06:00:00.000Z')");
  sqlite.exec("INSERT INTO intake_source_messages (id,batch_id,source_message_id,trace_id,source_kind,volunteer_alias,body_redacted,broad_area,attachment_manifest_json,received_at,raw_fixture_json) VALUES ('MSG-1','BATCH-1','raw-1','BATCH-1:raw-1','whatsapp_export','Fictional volunteer','Maybe six cats in a broad fictional area.','Little Havana','[]','2026-11-08T06:01:00.000Z','{\"synthetic\":true}')");
  sqlite.exec("INSERT INTO intake_observations (id,source_message_id,proposed_colony_key,colony_confidence,urgency,created_at) VALUES ('OBS-1','MSG-1','COL-LOW',0.60,'watch','2026-11-08T06:01:00.000Z')");
  sqlite.exec("INSERT INTO colony_census_events (id,observation_id,colony_key,reported_count_low,reported_count_high,count_confidence,event_at) VALUES ('EVENT-1','OBS-1','COL-LOW',5,6,0.60,'2026-11-08T06:01:00.000Z')");
  sqlite.exec(readFileSync(new URL("../../migrations/0010_intake_confirmations.sql", import.meta.url), "utf8"));
  const db = { prepare(sql) { return { bind(...args) { const prepared = sqlite.prepare(sql); return { async run() { const result = prepared.run(...args); return { meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid) } }; }, async first() { return prepared.get(...args) ?? null; }, async all() { return { results: prepared.all(...args) }; } }; } }; }, async batch(statements) { sqlite.exec("BEGIN"); try { const results = []; for (const statement of statements) results.push(await statement.run()); sqlite.exec("COMMIT"); return results; } catch (error) { sqlite.exec("ROLLBACK"); throw error; } } };
  return { db, sqlite };
}
const coordinator = { user: { id: 1, role: "coordinator" } }; const volunteer = { user: { id: 2, role: "volunteer" } }; const otherVolunteer = { user: { id: 3, role: "volunteer" } }; const sponsor = { user: { id: 4, role: "sponsor" } };

test("confidence routing preserves source evidence and requires assigned clarification plus human confirmation", async () => {
  const { db, sqlite } = database();
  assert.equal(await readRoutingThreshold(db), .75);
  assert.equal((await getRoutingSettings({ db, session: coordinator })).colony_match_threshold, .75);
  const initial = await listIntakeReview({ db, session: coordinator }); assert.equal(initial.reviews[0].assignment_state, "unmatched"); assert.deepEqual(initial.reviews[0].source_count, { low: 5, high: 6, confidence: .6 });
  const clarification = await requestClarification({ db, session: coordinator, now: "2026-11-08T07:00:00.000Z", input: { observationId: "OBS-1", assignedUserId: 2, message: "Can you confirm the visible count from a safe public position?" } });
  assert.equal((await listIntakeReview({ db, session: volunteer })).reviews[0].clarification.id, clarification.id);
  const otherClarification = await requestClarification({ db, session: coordinator, now: "2026-11-08T07:01:00.000Z", input: { observationId: "OBS-1", assignedUserId: 3, message: "Can you separately verify the broad area?" } });
  assert.equal((await listIntakeReview({ db, session: volunteer })).reviews[0].clarification.id, clarification.id);
  assert.equal((await listIntakeReview({ db, session: otherVolunteer })).reviews[0].clarification.id, otherClarification.id);
  sqlite.exec("INSERT INTO intake_review_queue (id,observation_id,review_kind,status,explanation,created_at) VALUES ('REV-COUNT','OBS-1','uncertain_count','open','Count needs a person.','2026-11-08T06:01:00.000Z'),('REV-URGENT','OBS-1','urgent_care','open','Urgent care remains separately managed.','2026-11-08T06:01:00.000Z')");
  await assert.rejects(() => confirmObservation({ db, session: coordinator, input: { observationId: "OBS-1", assignedColonyKey: "COL-NOT-ALLOWED", countLow: 6, countHigh: 6, countConfidence: .92, evidence: "Fictional invalid target test." } }));
  assert.equal(sqlite.prepare("SELECT state FROM intake_clarifications WHERE id=?").get(clarification.id).state, "open");
  assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM intake_confirmation_events WHERE observation_id='OBS-1'").get().count, 2);
  assert.equal(sqlite.prepare("SELECT verified_count_low FROM intake_observations WHERE id='OBS-1'").get().verified_count_low, null);
  await assert.rejects(() => replyClarification({ db, session: otherVolunteer, input: { id: clarification.id, reply: "I saw six.", evidence: "Fictional direct observation." } }));
  await replyClarification({ db, session: volunteer, now: "2026-11-08T07:05:00.000Z", input: { id: clarification.id, reply: "I could see six at once.", evidence: "Fictional follow-up from public access." } });
  await assert.rejects(() => confirmObservation({ db, session: volunteer, input: { observationId: "OBS-1", assignedColonyKey: "COL-KNOWN", countLow: 6, countHigh: 6, countConfidence: .92, evidence: "Fictional verification." } }));
  const confirmed = await confirmObservation({ db, session: coordinator, now: "2026-11-08T07:10:00.000Z", input: { observationId: "OBS-1", assignedColonyKey: "COL-KNOWN", countLow: 6, countHigh: 6, countConfidence: .92, evidence: "Fictional coordinator verification after a reply." } });
  assert.equal(confirmed.assignment_state, "confirmed");
  const reviewed = (await listIntakeReview({ db, session: coordinator })).reviews.find((item) => item.observation_id === "OBS-1"); assert.equal(reviewed.assigned_colony_key, "COL-KNOWN"); assert.deepEqual(reviewed.source_count, { low: 5, high: 6, confidence: .6 }); assert.deepEqual(reviewed.verified_count, { low: 6, high: 6, confidence: .92 }); assert.equal(reviewed.clarification.state, "resolved");
  assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM intake_confirmation_events WHERE observation_id='OBS-1'").get().count, 4);
  assert.equal(sqlite.prepare("SELECT status FROM intake_review_queue WHERE id='REV-COUNT'").get().status, "confirmed"); assert.equal(sqlite.prepare("SELECT status FROM intake_review_queue WHERE id='REV-URGENT'").get().status, "open");
  await assert.rejects(() => getRoutingSettings({ db, session: sponsor }));
});

test("manager threshold re-evaluates suggestions but never overwrites a human confirmation", async () => {
  const { db, sqlite } = database();
  sqlite.exec("INSERT INTO intake_source_messages (id,batch_id,source_message_id,trace_id,source_kind,volunteer_alias,body_redacted,broad_area,attachment_manifest_json,received_at,raw_fixture_json) VALUES ('MSG-2','BATCH-1','raw-2','BATCH-1:raw-2','sms_relay','Fictional volunteer','Routine made-up report.','Little Havana','[]','2026-11-08T08:00:00.000Z','{\"synthetic\":true}')");
  sqlite.exec("INSERT INTO intake_observations (id,source_message_id,proposed_colony_key,colony_confidence,urgency,created_at) VALUES ('OBS-2','MSG-2','COL-LOW',0.70,'routine','2026-11-08T08:00:00.000Z')");
  await confirmObservation({ db, session: coordinator, input: { observationId: "OBS-1", assignedColonyKey: "COL-KNOWN", countLow: 5, countHigh: 6, countConfidence: .7, evidence: "Fictional human confirmation." } });
  await setRoutingSettings({ db, session: coordinator, now: "2026-11-08T08:05:00.000Z", input: { colonyMatchThreshold: .65 } });
  const rows = await listIntakeReview({ db, session: coordinator }); const one = rows.reviews.find((item) => item.observation_id === "OBS-1"); const two = rows.reviews.find((item) => item.observation_id === "OBS-2");
  assert.equal(one.assignment_state, "confirmed"); assert.equal(one.assigned_colony_key, "COL-KNOWN"); assert.equal(two.assignment_state, "auto"); assert.equal(two.assigned_colony_key, "COL-LOW");
  await assert.rejects(() => setRoutingSettings({ db, session: volunteer, input: { colonyMatchThreshold: .7 } }));
});
