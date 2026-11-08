import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { createCareCase, getCareOutcomeStates, getOutcomeReport, listCareCases, outcomeReportCsv, resolveCareCase } from "../../worker/reports.js";

function database() {
  const sqlite = new DatabaseSync(":memory:");
  for (const name of ["0001_synthetic_intake_census.sql", "0002_auth.sql", "0005_canonical_census_and_dedupe.sql", "0006_ingestion_assessments.sql", "0007_care_cases.sql"]) sqlite.exec(readFileSync(new URL(`../../migrations/${name}`, import.meta.url), "utf8"));
  const db = { prepare(sql) { return { bind(...args) { const prepared = sqlite.prepare(sql); return { async run() { const result = prepared.run(...args); return { meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid) } }; }, async first() { return prepared.get(...args) ?? null; }, async all() { return { results: prepared.all(...args) }; } }; } }; }, async batch(statements) { sqlite.exec("BEGIN"); try { const results = []; for (const statement of statements) results.push(await statement.run()); sqlite.exec("COMMIT"); return results; } catch (error) { sqlite.exec("ROLLBACK"); throw error; } } };
  return { db, sqlite };
}
const coordinator = { user: { id: 1, role: "coordinator" } }; const sponsor = { user: { id: 2, role: "sponsor" } }; const volunteer = { user: { id: 3, role: "volunteer" } };

test("care cases require a manager, document outcomes, and leave unknown states unknown", async () => {
  const { db, sqlite } = database();
  sqlite.exec("INSERT INTO users (id,email,password_hash,role,created_at,updated_at) VALUES (1,'coord@example.test','x','coordinator',1,1),(2,'sponsor@example.test','x','sponsor',1,1),(3,'vol@example.test','x','volunteer',1,1)");
  sqlite.exec("INSERT INTO canonical_cats (cat_key,canonical_cat_key,status,created_at,updated_at) VALUES ('CAT-04','CAT-04','active','2026-11-07','2026-11-07'),('CAT-COAL','CAT-COAL','active','2026-11-07','2026-11-07'),('CAT-SKIPPER','CAT-SKIPPER','active','2026-11-07','2026-11-07'),('CAT-02','CAT-02','active','2026-11-07','2026-11-07'),('CAT-02-ALT','CAT-02-ALT','active','2026-11-07','2026-11-07')");
  await assert.rejects(() => createCareCase({ db, session: volunteer, input: { canonicalCatKey: "CAT-04", caseKind: "medical", title: "Paw check", detail: "Documented fictional concern" } }));
  const medical = await createCareCase({ db, session: coordinator, now: "2026-11-08T10:00:00.000Z", input: { canonicalCatKey: "CAT-04", caseKind: "medical", priority: "urgent", title: "Poppy paw check", detail: "Fictional limping observation for review." } });
  const tnr = await createCareCase({ db, session: coordinator, now: "2026-11-08T10:01:00.000Z", input: { canonicalCatKey: "CAT-COAL", caseKind: "tnr", title: "Coal TNR", detail: "Fictional TNR follow-up." } });
  const mergedCandidateTnr = await createCareCase({ db, session: coordinator, now: "2026-11-08T10:02:00.000Z", input: { canonicalCatKey: "CAT-02-ALT", caseKind: "tnr", title: "Candidate TNR", detail: "Fictional care case before a human duplicate merge." } });
  // Simulate the canonical mapping written by a separately human-approved merge.
  sqlite.exec("UPDATE canonical_cats SET canonical_cat_key='CAT-02',status='merged',merged_into_cat_key='CAT-02' WHERE cat_key='CAT-02-ALT'");
  await resolveCareCase({ db, session: coordinator, now: "2026-11-08T10:30:00.000Z", input: { id: mergedCandidateTnr.id, outcome: "tnr_completed", evidenceNote: "Fictional documented completion after coordinator merge." } });
  await assert.rejects(() => resolveCareCase({ db, session: coordinator, input: { id: tnr.id, outcome: "medical_resolved", evidenceNote: "wrong outcome" } }));
  await resolveCareCase({ db, session: coordinator, now: "2026-11-08T11:00:00.000Z", input: { id: medical.id, outcome: "medical_resolved", evidenceNote: "Fictional clinic note verified by coordinator." } });
  const auditAfterResolution = sqlite.prepare("SELECT COUNT(*) AS count FROM care_case_events WHERE care_case_id=? AND action='resolved'").get(medical.id).count;
  await assert.rejects(() => resolveCareCase({ db, session: coordinator, now: "2026-11-08T11:00:00.000Z", input: { id: medical.id, outcome: "medical_resolved", evidenceNote: "Fictional clinic note verified by coordinator." } }));
  assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM care_case_events WHERE care_case_id=? AND action='resolved'").get(medical.id).count, auditAfterResolution);
  const states = await getCareOutcomeStates(db); assert.equal(states["CAT-04"].medical, "medical_resolved"); assert.equal(states["CAT-COAL"].tnr, "pending"); assert.equal(states["CAT-02"].tnr, "tnr_completed"); assert.equal(states["CAT-02"].fixed, true); assert.equal(states["CAT-02-ALT"], undefined); assert.equal(states["CAT-SKIPPER"], undefined);
  const report = await getOutcomeReport({ db, session: sponsor, from: "2026-11-08", to: "2026-11-08" }); assert.equal(report.metrics.documented_medical_cases_resolved_in_window, 1); assert.equal(report.metrics.tnr_pending_now, 1); assert.match(report.disclaimer, /open-care-case count/); assert.match(outcomeReportCsv(report), /documented_medical_cases_resolved_in_window/);
  assert.equal((await listCareCases({ db, session: sponsor })).cases.length, 0); assert.equal((await listCareCases({ db, session: coordinator })).cases.length, 3);
});
