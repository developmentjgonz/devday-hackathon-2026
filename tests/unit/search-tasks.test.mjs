import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { createSearchTask, listSearchTasks, updateSearchTask } from "../../worker/search-tasks.js";

function d1(sqlite) {
  return { prepare(sql) { const statement = sqlite.prepare(sql); return { bind(...values) { return { run: async () => { const result = statement.run(...values); return { meta: { changes: result.changes, last_row_id: Number(result.lastInsertRowid) } }; }, first: async () => statement.get(...values) ?? null, all: async () => ({ results: statement.all(...values) }) }; } }; }, batch: async (statements) => Promise.all(statements.map((statement) => statement.run())) };
}

test("actual SQLite search-task safety gates and volunteer ownership", async () => {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT, role TEXT, disabled_at TEXT); CREATE TABLE canonical_cats (cat_key TEXT PRIMARY KEY, canonical_cat_key TEXT NOT NULL, status TEXT NOT NULL);");
  sqlite.exec(await readFile(new URL("../../migrations/0008_search_tasks.sql", import.meta.url), "utf8"));
  sqlite.exec("INSERT INTO users VALUES (1,'coord@example.demo','coordinator',NULL),(2,'vol@example.demo','volunteer',NULL); INSERT INTO canonical_cats VALUES ('CAT-11','CAT-11','active'),('CAT-11-ALT','CAT-11','merged');");
  const db = d1(sqlite); const coordinator = { userId: 1, user: { role: "coordinator" } }; const volunteer = { userId: 2, user: { role: "volunteer" } };
  await assert.rejects(() => createSearchTask({ db, session: coordinator, body: { title: "Unsafe", broadArea: "Miami", assignedUserId: 2, dueAt: "2026-11-08T18:00:00Z", safeAccessChecklist: { publicAccessPermission: true, noFloodwaterOrDrains: true, noTrafficEntry: true }, riskVerifiedHuman: true, forecast: { severity: "severe" } } }), /Severe weather/);
  await assert.rejects(() => createSearchTask({ db, session: coordinator, body: { title: "Merged reference", broadArea: "Miami", canonicalCatKey: "CAT-11-ALT", assignedUserId: 2, dueAt: "2026-11-08T18:00:00Z", safeAccessChecklist: { publicAccessPermission: true, noFloodwaterOrDrains: true, noTrafficEntry: true }, riskVerifiedHuman: true, forecast: { severity: "watch" } } }), /active root/);
  const created = await createSearchTask({ db, session: coordinator, now: "2026-11-08T12:00:00Z", body: { title: "Fictional cover check", broadArea: "Miami Beach", canonicalCatKey: "CAT-11", assignedUserId: 2, dueAt: "2026-11-08T18:00:00Z", safeAccessChecklist: { publicAccessPermission: true, noFloodwaterOrDrains: true, noTrafficEntry: true }, riskVerifiedHuman: true, forecast: { source: "demo", severity: "watch", checkedAt: "2026-11-08T11:00:00Z" } } });
  assert.equal((await listSearchTasks({ db, session: volunteer })).tasks.length, 1);
  await assert.rejects(() => updateSearchTask({ db, session: volunteer, body: { id: created.id, action: "reassign", assignedUserId: 1 } }), /not assigned|manager/);
  const result = await updateSearchTask({ db, session: volunteer, now: "2026-11-08T12:05:00Z", body: { id: created.id, action: "block", evidenceTimestamp: "2026-11-08T12:04:00Z", evidenceNote: "Heavy rain at safe observation point.", blockReason: "Standing water near drainage edge." } });
  assert.equal(result.status, "blocked"); assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM search_task_audit").get().count, 2);
});
