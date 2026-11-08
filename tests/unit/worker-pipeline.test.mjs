import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import worker from "../../worker/index.js";
import { provisionUser } from "../../worker/auth.js";

function database() {
  const db = new DatabaseSync(":memory:");
  for (const migration of readdirSync(new URL("../../migrations/", import.meta.url)).filter((name) => name.endsWith(".sql")).sort()) db.exec(readFileSync(new URL(`../../migrations/${migration}`, import.meta.url), "utf8"));
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
  const rawText = readFileSync(new URL("../../public/demo-data/mangrove-mews-whatsapp-export.txt", import.meta.url), "utf8");
  const rawRequest = () => new Request(env.APP_ORIGIN + "/api/private/raw-import", { method: "POST", headers: authenticated, body: JSON.stringify({ synthetic: true, sourceKind: "whatsapp_export", text: rawText, batchId: "raw-flow-test" }) });
  const raw = await worker.fetch(rawRequest(), env);
  assert.equal(raw.status, 201, JSON.stringify(await raw.clone().json()));
  const repeated = await worker.fetch(rawRequest(), env);
  assert.equal(repeated.status, 409);
  const canonical = await worker.fetch(new Request(env.APP_ORIGIN + "/api/private/census", { headers: { Cookie: cookies.join("; ") } }), env);
  assert.equal(canonical.status, 200);
  const census = await canonical.json();
  assert.ok(census.colonies.length > 0);
  assert.ok(census.cats.some((cat) => cat.cat_key === "CAT-02"));
  const assessment = await env.DB.prepare("SELECT mode FROM intake_assessments LIMIT 1").first();
  assert.equal(assessment.mode, "demo");
  const post = (path, body, authHeaders = authenticated) => worker.fetch(new Request(env.APP_ORIGIN + path, { method: "POST", headers: authHeaders, body: JSON.stringify(body) }), env);
  const care = await post("/api/private/care-cases", { canonicalCatKey: "CAT-04", caseKind: "medical", priority: "urgent", title: "Synthetic paw review", detail: "Fictional clinic follow-up needed." });
  assert.equal(care.status, 201);
  const careId = (await care.json()).id;
  assert.equal((await post("/api/private/care-cases/resolve", { id: careId, outcome: "medical_resolved", evidenceNote: "Fictional clinic discharge documented by coordinator." })).status, 200);
  const outcomeReport = await worker.fetch(new Request(env.APP_ORIGIN + "/api/private/reports/outcomes", { headers: authenticated }), env);
  assert.equal((await outcomeReport.json()).metrics.documented_medical_cases_resolved_in_window, 1);
  const search = await post("/api/lost-cat-search", { name: "Tux", description: "Black and white chest", lastSeenArea: "Miami Beach", lastSeenAt: "2026-11-04T18:00:00Z" });
  assert.equal(search.status, 200);
  const plan = await search.json();
  assert.equal(plan.matches[0].catKey, "CAT-11");
  assert.equal(plan.zones.length, 3);
  assert.ok(plan.zones.every((zone) => zone.area === "Miami Beach"));
  const taskBody = { title: "Fictional safe cover check", broadArea: "Miami Beach", canonicalCatKey: "CAT-11", assignedUserId: 1, dueAt: "2026-11-09T12:00:00Z", safeAccessChecklist: { publicAccessPermission: true, noFloodwaterOrDrains: true, noTrafficEntry: true }, riskVerifiedHuman: true, forecast: { severity: "watch" } };
  assert.equal((await post("/api/private/search-tasks", { ...taskBody, forecast: { severity: "severe" } })).status, 400);
  assert.equal((await post("/api/private/search-tasks", taskBody)).status, 201);
  const community = await post("/api/private/community-reviews", { fictionalOnly: true, assessment: { classification: "missing-cat", area: "Miami Beach", mode: "demo" } });
  assert.equal(community.status, 201);
  const communityId = (await community.json()).id;
  assert.equal((await post("/api/private/community-reviews/update", { id: communityId, decision: "verified" })).status, 200);
  await provisionUser(env, { email: "volunteer@example.test", password: "a-strong-demo-password", role: "volunteer" });
  await provisionUser(env, { email: "sponsor@example.test", password: "a-strong-demo-password", role: "sponsor" });
  async function signIn(email) {
    const login = await post("/api/auth/login", { email, password: "a-strong-demo-password" }, headers);
    assert.equal(login.status, 200);
    const pieces = login.headers.getSetCookie().map((value) => value.split(";")[0]);
    return { ...headers, Cookie: pieces.join("; "), "X-CSRF-Token": pieces.find((value) => value.startsWith("mews_csrf="))?.split("=")[1] };
  }
  const volunteer = await signIn("volunteer@example.test");
  assert.equal((await worker.fetch(new Request(`${env.APP_ORIGIN}/api/private/photos/${photo.id}`, { headers: volunteer }), env)).status, 404, "Volunteer cannot read another uploader's private evidence");
  const phoneBody = { synthetic: true, id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", message: "Demo: split-face calico limping, fed 6", broadArea: "Little Havana", photo: "/demo-assets/poppy-calico-limp.png", count: 6, feedingConfirmed: true, urgent: true };
  assert.equal((await post("/api/private/field-report", phoneBody, volunteer)).status, 201);
  assert.equal((await post("/api/private/field-report", phoneBody, volunteer)).status, 200, "Retry keeps the original report");
  assert.equal((await post("/api/private/search-tasks", taskBody, volunteer)).status, 403);
  const sponsor = await signIn("sponsor@example.test");
  assert.equal((await post("/api/private/field-report", phoneBody, sponsor)).status, 403);
  assert.equal((await worker.fetch(new Request(env.APP_ORIGIN + "/api/private/intake", { headers: sponsor }), env)).status, 403);
  assert.equal((await worker.fetch(new Request(env.APP_ORIGIN + "/api/private/search-tasks", { headers: sponsor }), env)).status, 403);
  const publicCensus = await worker.fetch(new Request(env.APP_ORIGIN + "/api/public/census"), env);
  const publicData = await publicCensus.json();
  assert.equal(publicData.cats.length, 0);
  assert.ok(publicData.colonies.every((colony) => !("last_feeder" in colony) && !("latitude" in colony)));
});
