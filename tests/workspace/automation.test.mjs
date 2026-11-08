import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import worker from '../../worker/index.ts';
import { defaultAutopilot } from '../../shared/types/automation.ts';
import { runAutopilot, matchingColonies } from '../../worker/services/autopilot.ts';

function fixture(t) {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON');
  const migrations = new URL('../../migrations/', import.meta.url);
  for (const file of readdirSync(migrations).filter((name) => name.endsWith('.sql')).sort()) sqlite.exec(readFileSync(new URL(file, migrations), 'utf8'));
  sqlite.exec(readFileSync(new URL('../../seeds/local.sql', import.meta.url), 'utf8'));
  sqlite.exec(`INSERT INTO reports (id, title, message, category, reporter_id, submitted_at, colony_id, cat_id, urgent)
    VALUES ('report-auto', 'Pepper needs a care check', 'Pepper is limping by the fence.', 'Care', 'local-member', '2026-11-08T10:00:00Z', 'riverside', 'pepper', 1)`);
  t.after(() => sqlite.close());
  const DB = {
    prepare(sql) {
      let values = [];
      return {
        bind(...args) { values = args; return this; },
        async first() { return sqlite.prepare(sql).get(...values) ?? null; },
        async all() { return { results: sqlite.prepare(sql).all(...values) }; },
        async run() { return sqlite.prepare(sql).run(...values); },
      };
    },
    async batch(statements) {
      sqlite.exec('BEGIN');
      try { const result = []; for (const statement of statements) result.push(await statement.run()); sqlite.exec('COMMIT'); return result; }
      catch (error) { sqlite.exec('ROLLBACK'); throw error; }
    },
  };
  const env = { DB, CONFIG_ENCRYPTION_KEY: Buffer.alloc(32, 42).toString('base64'), LOCAL_TEST_SIGN_IN: 'true', AI_ANALYSIS_RATE_LIMITER: { async limit() { return { success: true }; } }, UPLOADS: { async get() { return null; } }, ASSETS: { fetch: () => new Response('App') } };
  async function request(path, { method = 'GET', body, cookie, origin = 'http://127.0.0.1:5197' } = {}) {
    return worker.fetch(new Request(`http://127.0.0.1:5197${path}`, { method,
      headers: { ...(method === 'POST' ? { Origin: origin, 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }), env);
  }
  async function signIn(userId = 'local-admin') {
    const response = await request('/api/auth/local/sign-in', { method: 'POST', body: { userId } });
    return response.headers.get('Set-Cookie').split(';')[0];
  }
  async function enable(overrides = {}) {
    const cookie = await signIn();
    const response = await request('/api/configuration/ai', { method: 'POST', cookie, body: { openaiModel: '', apiKey: 'sk-test-fictional', autopilot: { ...defaultAutopilot, enabled: true, ...overrides } } });
    assert.equal(response.status, 200);
    return cookie;
  }
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  let calls = 0;
  const plan = { summary: 'The report describes limping and needs a care check.', needsReview: false, duplicateReportId: null, colony: null,
    tasks: [{ title: 'Check Pepper at the fence', reason: 'Pepper was reported limping.' }], cats: [{ id: 'pepper', name: 'Pepper', details: 'Limping by the fence.', reason: 'Reported by the observer.' }] };
  function provider(value = plan, beforeReply) {
    globalThis.fetch = async (_url, init) => {
      calls++;
      const body = JSON.parse(init.body);
      assert.equal(body.store, false);
      assert.equal(body.text.format.strict, true);
      await beforeReply?.();
      return Response.json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(value) }] }] });
    };
  }
  return { sqlite, env, request, signIn, enable, provider, plan, calls: () => calls };
}

test('autopilot is off by default and requires an administrator and saved key', async (t) => {
  const f = fixture(t);
  f.provider();
  await runAutopilot(f.env);
  assert.equal(f.calls(), 0);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS count FROM automation_runs').get().count, 0);
  const admin = await f.signIn();
  assert.equal((await f.request('/api/configuration/ai', { method: 'POST', cookie: admin, body: { openaiModel: '', autopilot: { ...defaultAutopilot, enabled: true } } })).status, 400);
  assert.equal((await f.request('/api/automation')).status, 401);
  assert.equal((await f.request('/api/automation', { cookie: await f.signIn('local-member') })).status, 403);
  assert.equal((await f.request('/api/automation/run', { method: 'POST', cookie: admin })).status, 409);
  assert.equal((await f.request('/api/automation/run', { method: 'POST', cookie: admin, origin: 'https://other.example' })).status, 403);
});

test('human review queues concrete changes, applies approval, and prevents repeat approval', async (t) => {
  const f = fixture(t);
  const admin = await f.enable();
  f.provider();
  await runAutopilot(f.env);
  assert.equal(f.sqlite.prepare('SELECT status FROM reports').get().status, 'pending');
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS count FROM tasks').get().count, 0);
  const snapshot = await (await f.request('/api/automation', { cookie: admin })).json();
  assert.equal(snapshot.proposals.length, 1);
  assert.ok(snapshot.proposals[0].changes.some((change) => change.includes('Check Pepper')));
  const id = snapshot.proposals[0].id;
  assert.equal((await f.request(`/api/automation/reviews/${id}/approve`, { method: 'POST', cookie: admin })).status, 200);
  assert.equal(f.sqlite.prepare('SELECT status FROM reports').get().status, 'processed');
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS count FROM tasks').get().count, 1);
  assert.match(f.sqlite.prepare("SELECT description FROM cats WHERE id = 'pepper'").get().description, /Limping/);
  assert.equal((await f.request(`/api/automation/reviews/${id}/approve`, { method: 'POST', cookie: admin })).status, 404);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS count FROM tasks').get().count, 1);
  const events = f.sqlite.prepare('SELECT kind FROM automation_events').all().map((item) => item.kind);
  assert.ok(['task', 'cat', 'report', 'review'].every((kind) => events.includes(kind)));
  assert.equal(f.sqlite.prepare("SELECT COUNT(*) AS count FROM record_activity WHERE actor_name = 'Mews Autopilot'").get().count > 0, true);
});

test('rejection changes no domain records and does not repeat an unchanged report', async (t) => {
  const f = fixture(t);
  const admin = await f.enable();
  f.provider();
  await runAutopilot(f.env);
  const { id } = f.sqlite.prepare('SELECT id FROM automation_proposals').get();
  assert.equal((await f.request(`/api/automation/reviews/${id}/reject`, { method: 'POST', cookie: admin })).status, 200);
  await runAutopilot(f.env);
  assert.equal(f.calls(), 1);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS count FROM tasks').get().count, 0);
  assert.equal(f.sqlite.prepare('SELECT status FROM reports').get().status, 'pending');
});

test('automatic mode applies records and assigns available members without a review queue', async (t) => {
  const f = fixture(t);
  await f.enable({ requireHumanReview: false });
  f.sqlite.exec("UPDATE users SET task_assignable = 0 WHERE id = 'local-admin'");
  f.provider();
  await runAutopilot(f.env);
  assert.equal(f.sqlite.prepare('SELECT owner_id FROM tasks').get().owner_id, 'local-member');
  assert.equal(f.sqlite.prepare('SELECT status FROM reports').get().status, 'processed');
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS count FROM automation_proposals').get().count, 0);
  await runAutopilot(f.env);
  assert.equal(f.calls(), 1);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS count FROM tasks').get().count, 1);
});

test('disabled features cannot change records and incomplete evidence stays open', async (t) => {
  const f = fixture(t);
  await f.enable({ requireHumanReview: false, assignTasks: false, updateRecords: false });
  f.provider();
  await runAutopilot(f.env);
  assert.equal(f.sqlite.prepare('SELECT status FROM reports').get().status, 'pending');
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS count FROM tasks').get().count, 0);
  assert.equal(f.sqlite.prepare("SELECT COUNT(*) AS count FROM automation_events WHERE kind = 'cat'").get().count, 0);
  assert.equal(f.sqlite.prepare("SELECT COUNT(*) AS count FROM automation_events WHERE kind = 'review'").get().count, 1);
});

test('pausing during model work and stale human reviews prevent writes', async (t) => {
  const f = fixture(t);
  const admin = await f.enable({ requireHumanReview: false });
  f.provider(f.plan, () => f.sqlite.exec("UPDATE configuration SET autopilot_json = json_set(autopilot_json, '$.enabled', json('false'))"));
  await runAutopilot(f.env);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS count FROM tasks').get().count, 0);
  await f.enable();
  f.sqlite.exec('DELETE FROM automation_report_attempts');
  f.provider();
  await runAutopilot(f.env);
  const { id } = f.sqlite.prepare('SELECT id FROM automation_proposals').get();
  f.sqlite.exec("UPDATE reports SET message = 'The observer corrected the report.'");
  assert.equal((await f.request(`/api/automation/reviews/${id}/approve`, { method: 'POST', cookie: admin })).status, 409);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS count FROM tasks').get().count, 0);
  assert.equal(f.sqlite.prepare('SELECT status FROM automation_proposals').get().status, 'failed');
});

test('duplicate colony review preserves cats, reports, task links, care rules, and history', async (t) => {
  const f = fixture(t);
  const admin = await f.enable({ resolveReports: false, assignTasks: false, updateRecords: false });
  f.sqlite.exec(`UPDATE colonies SET longitude = -73.99, latitude = 40.75 WHERE id = 'riverside';
    INSERT INTO colonies (id, name, longitude, latitude) VALUES ('river-copy', 'Riverside Cats', -73.99001, 40.75001);
    UPDATE cats SET colony_id = 'river-copy' WHERE id = 'pepper';
    UPDATE reports SET colony_id = 'river-copy';
    INSERT INTO tasks (id, title, owner_id, created_at) VALUES ('merge-task', 'Care check', 'local-member', '2026-11-08');
    INSERT INTO task_associations (task_id, position, type, record_id) VALUES ('merge-task', 0, 'colony', 'river-copy');
    INSERT INTO care_rules (id, title, owner_id, colony_id, repeat_days, start_date, next_due, created_at) VALUES ('merge-rule', 'Feed cats', 'local-member', 'river-copy', 1, '2026-11-08', '2026-11-08', '2026-11-08');`);
  await runAutopilot(f.env);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS count FROM colonies WHERE id IN (?, ?)').get('riverside', 'river-copy').count, 2);
  const { id } = f.sqlite.prepare('SELECT id FROM automation_proposals').get();
  assert.equal((await f.request(`/api/automation/reviews/${id}/approve`, { method: 'POST', cookie: admin })).status, 200);
  const target = f.sqlite.prepare("SELECT id FROM colonies WHERE id IN ('riverside', 'river-copy')").get().id;
  for (const table of ['reports', 'care_rules']) assert.equal(f.sqlite.prepare(`SELECT colony_id FROM ${table} LIMIT 1`).get().colony_id, target);
  assert.equal(f.sqlite.prepare("SELECT colony_id FROM cats WHERE id = 'pepper'").get().colony_id, target);
  assert.equal(f.sqlite.prepare('SELECT record_id FROM task_associations').get().record_id, target);
  assert.equal(f.sqlite.prepare('PRAGMA foreign_key_check').all().length, 0);
  assert.equal(f.calls(), 0);
});

test('similar names alone and nearby colonies with different names do not merge', () => {
  assert.equal(matchingColonies({ id: 'a', name: 'Riverside' }, { id: 'b', name: 'Riverside Cats' }), false);
  assert.equal(matchingColonies({ id: 'a', name: 'Riverside', coordinates: [-73, 40] }, { id: 'b', name: 'Canal', coordinates: [-73, 40] }), false);
  assert.equal(matchingColonies({ id: 'a', name: 'Riverside', coordinates: [-73, 40] }, { id: 'b', name: 'Riverside Cats', coordinates: [-74, 41] }), false);
});

test('a concurrent run cannot duplicate work, and removing the key pauses autopilot', async (t) => {
  const f = fixture(t);
  const admin = await f.enable({ requireHumanReview: false });
  f.provider();
  await Promise.all([runAutopilot(f.env), runAutopilot(f.env)]);
  assert.equal(f.calls(), 1);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS count FROM tasks').get().count, 1);
  const response = await f.request('/api/configuration/ai-key/remove', { method: 'POST', cookie: admin });
  assert.equal((await response.json()).autopilot.enabled, false);
});

test('turning review off applies queued proposals after checking current records', async (t) => {
  const f = fixture(t);
  await f.enable();
  f.provider();
  await runAutopilot(f.env);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS count FROM tasks').get().count, 0);
  await f.enable({ requireHumanReview: false });
  await runAutopilot(f.env);
  assert.equal(f.sqlite.prepare('SELECT status FROM automation_proposals').get().status, 'applied');
  assert.equal(f.sqlite.prepare('SELECT status FROM reports').get().status, 'processed');
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS count FROM tasks').get().count, 1);
  assert.equal(f.calls(), 1);
});

test('duplicate report links wait for approval and use only eligible targets', async (t) => {
  const f = fixture(t);
  const admin = await f.enable();
  f.sqlite.exec(`INSERT INTO reports (id, title, message, category, submitted_at, colony_id, cat_id, status)
    VALUES ('original', 'Earlier injury report', 'Pepper is limping by the fence.', 'Care', '2026-11-08T09:55:00Z', 'riverside', 'pepper', 'processed')`);
  f.provider({ ...f.plan, duplicateReportId: 'original', tasks: [], cats: [] });
  await runAutopilot(f.env);
  assert.equal(f.sqlite.prepare("SELECT duplicate_of FROM reports WHERE id = 'report-auto'").get().duplicate_of, null);
  const { id } = f.sqlite.prepare('SELECT id FROM automation_proposals').get();
  assert.equal((await f.request(`/api/automation/reviews/${id}/approve`, { method: 'POST', cookie: admin })).status, 200);
  assert.equal(f.sqlite.prepare("SELECT duplicate_of FROM reports WHERE id = 'report-auto'").get().duplicate_of, 'original');
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS count FROM tasks').get().count, 0);
});

test('a failed audit write rolls back its domain operation and leaves the report open', async (t) => {
  const f = fixture(t);
  await f.enable({ requireHumanReview: false });
  f.provider({ ...f.plan, cats: [] });
  f.sqlite.exec("CREATE TRIGGER fail_task_audit BEFORE INSERT ON automation_events WHEN NEW.kind = 'task' BEGIN SELECT RAISE(ABORT, 'audit failed'); END");
  await runAutopilot(f.env);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS count FROM tasks').get().count, 0);
  assert.equal(f.sqlite.prepare('SELECT status FROM reports').get().status, 'pending');
  assert.equal(f.sqlite.prepare('SELECT status FROM automation_runs').get().status, 'failed');
  assert.equal(f.sqlite.prepare('SELECT token FROM automation_lock').get().token, null);
});

test('cat and colony creation uses report evidence and preserves report associations', async (t) => {
  const f = fixture(t);
  await f.enable({ requireHumanReview: false });
  f.sqlite.exec("UPDATE reports SET colony_id = NULL, cat_id = NULL, public_latitude = 40.7, public_longitude = -73.9");
  f.provider({ ...f.plan, colony: { id: null, name: 'Garden', reason: 'A distinct colony is described at the supplied pin.' }, cats: [{ id: null, name: 'Luna', details: 'A named gray cat at the garden.', reason: 'The observer named this individual.' }] });
  await runAutopilot(f.env);
  const colony = f.sqlite.prepare("SELECT id, longitude, latitude FROM colonies WHERE name = 'Garden'").get();
  assert.equal(colony.longitude, -73.9);
  assert.equal(colony.latitude, 40.7);
  const cat = f.sqlite.prepare("SELECT id, colony_id FROM cats WHERE name = 'Luna'").get();
  assert.equal(cat.colony_id, colony.id);
  const report = f.sqlite.prepare('SELECT colony_id, cat_id, status FROM reports').get();
  assert.equal(report.colony_id, colony.id);
  assert.equal(report.cat_id, cat.id);
  assert.equal(report.status, 'processed');
});

test('existing cat links cannot be moved to a new colony by a model plan', async (t) => {
  const f = fixture(t);
  await f.enable({ requireHumanReview: false });
  f.sqlite.exec('UPDATE reports SET public_latitude = 40.7, public_longitude = -73.9');
  f.provider({ ...f.plan, colony: { id: null, name: 'Garden', reason: 'New colony.' } });
  await runAutopilot(f.env);
  assert.equal(f.sqlite.prepare("SELECT COUNT(*) AS count FROM colonies WHERE name = 'Garden'").get().count, 0);
  assert.equal(f.sqlite.prepare("SELECT colony_id FROM cats WHERE id = 'pepper'").get().colony_id, 'riverside');
  assert.equal(f.sqlite.prepare('SELECT status FROM reports').get().status, 'pending');
});

test('the scheduled Worker runs autopilot and missing attachments prevent automatic review', async (t) => {
  const f = fixture(t);
  await f.enable({ requireHumanReview: false });
  f.provider();
  const pending = [];
  worker.scheduled({ scheduledTime: Date.now() }, f.env, { waitUntil(promise) { pending.push(promise); } });
  await Promise.all(pending);
  assert.equal(f.sqlite.prepare('SELECT status FROM reports').get().status, 'processed');
  assert.equal(f.calls(), 1);
  f.sqlite.exec(`UPDATE reports SET status = 'pending';
    DELETE FROM automation_report_attempts;
    INSERT INTO report_attachments (id, report_id, storage_key, name, mime_type, size) VALUES ('missing', 'report-auto', 'missing', 'cat.jpg', 'image/jpeg', 4)`);
  await runAutopilot(f.env);
  assert.equal(f.calls(), 1);
  assert.equal(f.sqlite.prepare('SELECT status FROM reports').get().status, 'pending');
  assert.match(f.sqlite.prepare("SELECT detail FROM automation_events WHERE kind = 'error' ORDER BY rowid DESC LIMIT 1").get().detail, /attachments/);
});

test('task assignment replaces unavailable owners and keeps valid assignments', async (t) => {
  const f = fixture(t);
  await f.enable({ requireHumanReview: false, resolveReports: false, updateRecords: false, mergeColonies: false });
  f.sqlite.exec(`UPDATE reports SET status = 'processed';
    UPDATE users SET task_assignable = 0 WHERE id = 'local-admin';
    INSERT INTO tasks (id, title, owner_id, created_at) VALUES ('unavailable-task', 'Cover a visit', 'local-admin', '2026-11-08');
    INSERT INTO tasks (id, title, owner_id, created_at) VALUES ('valid-task', 'Food supplies', 'local-member', '2026-11-08');`);
  await runAutopilot(f.env);
  assert.equal(f.sqlite.prepare("SELECT owner_id FROM tasks WHERE id = 'unavailable-task'").get().owner_id, 'local-member');
  assert.equal(f.sqlite.prepare("SELECT owner_id FROM tasks WHERE id = 'valid-task'").get().owner_id, 'local-member');
  assert.equal(f.sqlite.prepare("SELECT COUNT(*) AS count FROM automation_events WHERE kind = 'task'").get().count, 1);
  assert.equal(f.calls(), 0);
});

test('pausing autopilot during planning prevents new human review proposals', async (t) => {
  const f = fixture(t);
  await f.enable();
  f.provider(f.plan, () => f.sqlite.exec("UPDATE configuration SET autopilot_json = json_set(autopilot_json, '$.enabled', json('false'))"));
  await runAutopilot(f.env);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS count FROM automation_proposals').get().count, 0);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS count FROM tasks').get().count, 0);
});

test('autopilot continues through the report backlog in batches and skips reviewed work', async (t) => {
  const f = fixture(t);
  await f.enable({ requireHumanReview: false, assignTasks: false, updateRecords: false, mergeColonies: false });
  const insert = f.sqlite.prepare("INSERT INTO reports (id, title, message, category, submitted_at, status) VALUES (?, ?, 'Care visit recorded.', 'Care', '2026-11-08T11:00:00Z', 'pending')");
  for (let index = 0; index < 6; index++) insert.run(`backlog-${index}`, `Visit ${index}`);
  f.provider({ ...f.plan, tasks: [], cats: [] });
  await runAutopilot(f.env);
  assert.equal(f.calls(), 5);
  assert.equal(f.sqlite.prepare("SELECT COUNT(*) AS count FROM reports WHERE status = 'pending'").get().count, 2);
  await runAutopilot(f.env);
  assert.equal(f.calls(), 7);
  assert.equal(f.sqlite.prepare("SELECT COUNT(*) AS count FROM reports WHERE status = 'pending'").get().count, 0);
  await runAutopilot(f.env);
  assert.equal(f.calls(), 7);
});
