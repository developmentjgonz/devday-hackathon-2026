import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { compareCatPhotos, getVisionWorkspace, reviewVisionComparison } from "../../worker/vision-matching.js";

const coordinator = { userId: 1, user: { id: 1, role: "coordinator" } };
const volunteer = { userId: 2, user: { id: 2, role: "volunteer" } };
const sponsor = { userId: 3, user: { id: 3, role: "sponsor" } };
const leftRef = "fixture:/demo-assets/marmalade-orange-tabby.png";
const rightRef = "fixture:/demo-assets/poppy-calico-limp.png";
const input = { synthetic: true, leftRef, rightRef };
const timestamp = "2026-11-08T12:00:00.000Z";
const exampleEvidence = () => ({ summary: "Different visible coat colors in the two fictional cat photos.", recommendation: "different_visible_features", scores: { coat: .1, markings: .15, face: .3, ears: null, overall: .15 }, agreements: ["Both cats have upright ears."], differences: ["A has orange stripes; B has calico patches."], limitations: ["This is visual similarity, not confirmed identity."] });

function setup() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(readFileSync(new URL("../../migrations/0002_auth.sql", import.meta.url), "utf8"));
  sqlite.exec(readFileSync(new URL("../../migrations/0003_private_photos.sql", import.meta.url), "utf8"));
  sqlite.exec(readFileSync(new URL("../../migrations/0012_vision_matches.sql", import.meta.url), "utf8"));
  sqlite.exec("INSERT INTO users(id,email,password_hash,role,created_at,updated_at) VALUES(1,'coordinator@demo','hash','coordinator',1,1),(2,'volunteer@demo','hash','volunteer',1,1),(3,'sponsor@demo','hash','sponsor',1,1)");
  const DB = {
    prepare(sql) {
      const prepared = sqlite.prepare(sql);
      return { bind(...args) { return { run: async () => { const result = prepared.run(...args); return { meta: { changes: Number(result.changes) } }; }, first: async () => prepared.get(...args) ?? null, all: async () => ({ results: prepared.all(...args) }) }; } };
    },
    async batch(items) {
      sqlite.exec("BEGIN IMMEDIATE");
      try { const results = []; for (const item of items) results.push(await item.run()); sqlite.exec("COMMIT"); return results; }
      catch (error) { sqlite.exec("ROLLBACK"); throw error; }
    },
  };
  const bytes = new Map();
  for (const path of [leftRef.slice(8), rightRef.slice(8), "/demo-assets/tux-missing-search.png"]) bytes.set(path, readFileSync(new URL("../../public" + path, import.meta.url)));
  const env = { DB, OPENAI_API_KEY: "unit-test-inert-key", ASSETS: { fetch: async (request) => new Response(bytes.get(new URL(request.url).pathname), { headers: { "Content-Type": "image/png" } }) } };
  return { sqlite, env, bytes };
}

test("vision comparison sends two actual image inputs, caches byte-traced evidence, and records a human review without changing cats", async () => {
  const { env, sqlite, bytes } = setup(); let calls = 0;
  sqlite.exec("CREATE TABLE canonical_cats(cat_key TEXT PRIMARY KEY,status TEXT); INSERT INTO canonical_cats VALUES('CAT-02','active'),('CAT-04','active')");
  const analyze = async ({ images }) => {
    calls += 1;
    assert.equal(images.length, 2);
    assert.equal(images[0], "data:image/png;base64," + bytes.get(leftRef.slice(8)).toString("base64"));
    assert.equal(images[1], "data:image/png;base64," + bytes.get(rightRef.slice(8)).toString("base64"));
    return exampleEvidence();
  };
  const result = await compareCatPhotos({ env, session: coordinator, input, analyze, now: timestamp });
  assert.equal(result.mode, "agent"); assert.equal(result.cached, false);
  assert.equal(result.comparison.evidence.scores.ears, null);
  assert.equal(sqlite.prepare("SELECT state FROM vision_match_attempts").get().state, "completed");
  const stored = sqlite.prepare("SELECT result_json,left_sha256 FROM vision_comparisons").get();
  assert.doesNotMatch(stored.result_json, /data:image/); assert.match(stored.left_sha256, /^[0-9a-f]{64}$/);
  const again = await compareCatPhotos({ env, session: coordinator, input, analyze, now: timestamp });
  assert.equal(again.cached, true); assert.equal(calls, 1);
  const review = { id: result.comparison.id, decision: "kept_separate", humanConfirmed: true, reason: "Human reviewed visible incompatible coat patterns." };
  await assert.rejects(() => reviewVisionComparison({ env, session: volunteer, input: review }), (error) => error.status === 403);
  await reviewVisionComparison({ env, session: coordinator, input: review, now: timestamp });
  await assert.rejects(() => reviewVisionComparison({ env, session: coordinator, input: review }), (error) => error.status === 409);
  assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM vision_match_audit").get().count, 2);
  assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM canonical_cats WHERE status='active'").get().count, 2);
  const listed = await getVisionWorkspace({ env, session: coordinator });
  assert.equal(listed.comparisons[0].reviewStatus, "kept_separate");
  await assert.rejects(() => getVisionWorkspace({ env, session: sponsor }), (error) => error.status === 403);
  await assert.rejects(() => compareCatPhotos({ env, session: volunteer, input, analyze }), (error) => error.status === 403);
});

test("vision refuses unapproved/private/external/duplicate sources and never invents scores when OpenAI is unavailable", async () => {
  const { env, sqlite, bytes } = setup(); let calls = 0;
  const analyze = async () => { calls += 1; return exampleEvidence(); };
  for (const bad of ["https://example.test/cat.png", "data:image/png;base64,AA==", "fixture:/demo-assets/../../.dev.vars", "fixture:/demo-assets/unlisted.png"]) await assert.rejects(() => compareCatPhotos({ env, session: coordinator, input: { ...input, leftRef: bad }, analyze }), (error) => error.status === 400);
  await assert.rejects(() => compareCatPhotos({ env, session: coordinator, input: { ...input, synthetic: false }, analyze }), (error) => error.status === 400);
  await assert.rejects(() => compareCatPhotos({ env, session: coordinator, input: { ...input, rightRef: leftRef }, analyze }), (error) => error.status === 400);
  const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  sqlite.prepare("INSERT INTO private_photos(id,object_key,content_type,size_bytes,uploaded_by,review_status) VALUES(?,?,?,?,?,'pending')").run(id, "private/" + id, "image/png", 100, "2");
  env.PHOTOS = { get: async () => ({ body: bytes.get(leftRef.slice(8)) }) };
  await assert.rejects(() => compareCatPhotos({ env, session: coordinator, input: { ...input, rightRef: "photo:" + id }, analyze }), (error) => error.status === 409);
  sqlite.prepare("UPDATE private_photos SET review_status='approved' WHERE id=?").run(id);
  await assert.rejects(() => compareCatPhotos({ env, session: coordinator, input: { ...input, rightRef: "photo:" + id }, analyze }), (error) => error.status === 409 && /same image bytes/.test(error.message));
  const unavailable = await compareCatPhotos({ env: { ...env, OPENAI_API_KEY: undefined }, session: coordinator, input, analyze });
  assert.equal(unavailable.mode, "unavailable"); assert.equal(unavailable.comparison, null); assert.equal(calls, 0);
  assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM vision_comparisons").get().count, 0);
});

test("vision attempt limits and provider failures do not persist fabricated results or leave a live lock", async () => {
  const { env, sqlite } = setup(); const started = Date.parse(timestamp) / 1000;
  await assert.rejects(() => compareCatPhotos({ env, session: coordinator, input, now: timestamp, analyze: async () => { throw new Error("fake provider request content must not leak"); } }), (error) => error.status === 502 && !error.message.includes("request content"));
  assert.equal(sqlite.prepare("SELECT state FROM vision_match_attempts").get().state, "failed");
  assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM vision_comparisons").get().count, 0);
  for (let index = 0; index < 7; index += 1) sqlite.prepare("INSERT INTO vision_match_attempts VALUES(?,?,1,?,'completed')").run("seed-" + index, "seed-pair-" + index, started);
  let calls = 0;
  await assert.rejects(() => compareCatPhotos({ env, session: coordinator, input, now: timestamp, analyze: async () => { calls += 1; return exampleEvidence(); } }), (error) => error.status === 429);
  assert.equal(calls, 0);
});
