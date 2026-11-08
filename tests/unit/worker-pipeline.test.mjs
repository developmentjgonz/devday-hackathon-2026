import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import worker from "../../worker/index.js";
import { provisionUser } from "../../worker/auth.js";

function database() {
  const db = new DatabaseSync(":memory:");
  for (const migration of ["0001_synthetic_intake_census.sql", "0002_auth.sql", "0003_private_photos.sql", "0004_field_operations.sql"]) db.exec(readFileSync(new URL(`../../migrations/${migration}`, import.meta.url), "utf8"));
  return {
    prepare(sql) {
      function bind(...args) { const statement = db.prepare(sql); return {
        async run() { const result = statement.run(...args); return { meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid) } }; },
        async first() { return statement.get(...args) ?? null; },
        async all() { if (statement.columns().length === 0) { const result = statement.run(...args); return { results: [], meta: { changes: Number(result.changes) } }; } return { results: statement.all(...args) }; },
      }; }
      return { bind, all: () => bind().all(), first: () => bind().first(), run: () => bind().run() };
    },
    async batch(statements) {
      db.exec("BEGIN");
      try { const results = []; for (const statement of statements) { if (statement.all && statement) { try { results.push(await statement.all()); } catch { results.push(await statement.run()); } } else results.push(await statement.run()); } db.exec("COMMIT"); return results; }
      catch (error) { db.exec("ROLLBACK"); throw error; }
    },
  };
}

test("synthetic intake requires session and CSRF, persists traceability, preserves reviews on duplicate import", async () => {
  const objects = new Map();
  const env = { DB: database(), APP_ORIGIN: "https://demo.example", PHOTOS: { async put(key, bytes) { objects.set(key, bytes); }, async get(key) { const bytes = objects.get(key); return bytes ? { body: bytes } : null; }, async delete(key) { objects.delete(key); } } };
  await provisionUser(env, { email: "coordinator@example.test", password: "a-strong-demo-password", role: "coordinator" });
  const fixture = readFileSync(new URL("../../public/demo-data/synthetic-intake-batch.json", import.meta.url), "utf8");
  const headers = { Origin: env.APP_ORIGIN, "Content-Type": "application/json", "CF-Connecting-IP": "192.0.2.1" };
  const login = await worker.fetch(new Request(`${env.APP_ORIGIN}/api/auth/login`, { method: "POST", headers, body: JSON.stringify({ email: "coordinator@example.test", password: "a-strong-demo-password" }) }), env);
  assert.equal(login.status, 200);
  const cookies = login.headers.getSetCookie().map((value) => value.split(";")[0]);
  const token = cookies.find((cookie) => cookie.startsWith("mews_csrf="))?.split("=")[1];
  const authenticated = { ...headers, Cookie: cookies.join("; "), "X-CSRF-Token": token };
  const importRequest = (authHeaders) => new Request(`${env.APP_ORIGIN}/api/private/synthetic-import`, { method: "POST", headers: authHeaders, body: fixture });
  assert.equal((await worker.fetch(importRequest(headers), env)).status, 401);
  assert.equal((await worker.fetch(importRequest({ ...authenticated, "X-CSRF-Token": "wrong" }), env)).status, 403);
  const imported = await worker.fetch(importRequest(authenticated), env);
  assert.equal(imported.status, 201);
  const result = await imported.json();
  assert.equal(result.reportsImported, 12);
  assert.equal(result.traceIds.length, 12);
  const replay = await worker.fetch(importRequest(authenticated), env);
  assert.equal(replay.status, 409);
  const snapshot = await worker.fetch(new Request(`${env.APP_ORIGIN}/api/private/intake`, { headers: { Cookie: cookies.join("; ") } }), env);
  assert.equal(snapshot.status, 200);
  const data = await snapshot.json();
  assert.equal(data.reports.length, 12);
  assert.ok(data.reviews.some((review) => review.review_kind === "possible_duplicate"));
  assert.ok(data.feedings.length > 0);
  const csv = await worker.fetch(new Request(`${env.APP_ORIGIN}/api/private/reports/synthetic.csv?start=2026-11-01&end=2026-11-30`, { headers: { Cookie: cookies.join("; ") } }), env);
  assert.equal(csv.status, 200);
  assert.match(await csv.text(), /^broad_area,reports,urgent_reports,feeding_visits/);
  const noSession = await worker.fetch(new Request(`${env.APP_ORIGIN}/api/private/reports/synthetic.csv?start=2026-11-01&end=2026-11-30`), env);
  assert.equal(noSession.status, 401);
  const duplicate = data.reviews.find((review) => review.review_kind === "possible_duplicate");
  const decision = await worker.fetch(new Request(`${env.APP_ORIGIN}/api/private/reviews/decision`, { method: "POST", headers: authenticated, body: JSON.stringify({ id: duplicate.id, decision: "confirmed" }) }), env);
  assert.equal(decision.status, 200);
  const twice = await worker.fetch(new Request(`${env.APP_ORIGIN}/api/private/reviews/decision`, { method: "POST", headers: authenticated, body: JSON.stringify({ id: duplicate.id, decision: "confirmed" }) }), env);
  assert.equal(twice.status, 409);
  const assignment = await worker.fetch(new Request(`${env.APP_ORIGIN}/api/private/feeding-assignments`, { method: "POST", headers: authenticated, body: JSON.stringify({ colonyKey: "COL-02", assignedUserId: 1, dueAt: "2026-11-07T18:00:00Z" }) }), env);
  assert.equal(assignment.status, 201);
  const { id } = await assignment.json();
  const list = await worker.fetch(new Request(`${env.APP_ORIGIN}/api/private/feeding-assignments`, { headers: { Cookie: cookies.join("; ") } }), env);
  assert.equal((await list.json()).assignments.length, 1);
  const completion = await worker.fetch(new Request(`${env.APP_ORIGIN}/api/private/feeding-assignments/update`, { method: "POST", headers: authenticated, body: JSON.stringify({ id, action: "complete" }) }), env);
  assert.equal(completion.status, 200);
  const photoHeaders = { ...authenticated, "Content-Type": "image/png" };
  const photoBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const deniedPhoto = await worker.fetch(new Request(`${env.APP_ORIGIN}/api/private/photos`, { method: "POST", headers: { "Content-Type": "image/png" }, body: photoBytes }), env);
  assert.equal(deniedPhoto.status, 401);
  const upload = await worker.fetch(new Request(`${env.APP_ORIGIN}/api/private/photos`, { method: "POST", headers: photoHeaders, body: photoBytes }), env);
  assert.equal(upload.status, 201);
  const photo = await upload.json();
  assert.equal(photo.reviewStatus, "pending");
  const review = await worker.fetch(new Request(`${env.APP_ORIGIN}/api/private/photos/${photo.id}/review`, { method: "POST", headers: authenticated, body: JSON.stringify({ decision: "approved" }) }), env);
  assert.equal(review.status, 200);
  const download = await worker.fetch(new Request(`${env.APP_ORIGIN}/api/private/photos/${photo.id}`, { headers: { Cookie: cookies.join("; ") } }), env);
  assert.equal(download.status, 200);
  assert.equal(download.headers.get("cache-control"), "private, no-store");
});
