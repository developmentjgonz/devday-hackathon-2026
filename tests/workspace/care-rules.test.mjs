import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import worker from '../../worker/index.ts';
import { generateCareTasks } from '../../worker/db/care-rules.ts';

function fixture(t) {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON');
  const migrations = new URL('../../migrations/', import.meta.url);
  for (const file of readdirSync(migrations).filter((name) => name.endsWith('.sql')).sort()) sqlite.exec(readFileSync(new URL(file, migrations), 'utf8'));
  for (const file of ['../../seeds/local.sql', '../../seeds/workspace.sql']) sqlite.exec(readFileSync(new URL(file, import.meta.url), 'utf8'));
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
  const env = { DB, LOCAL_TEST_SIGN_IN: 'true', ASSETS: { fetch: () => new Response('App') } };
  async function request(path, { method = 'GET', body, cookie, origin = 'http://127.0.0.1:5197' } = {}) {
    return worker.fetch(new Request(`http://127.0.0.1:5197${path}`, {
      method,
      headers: { ...(method === 'POST' ? { Origin: origin, 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }), env);
  }
  async function signIn(id) {
    const response = await request('/api/auth/local/sign-in', { method: 'POST', body: { userId: id } });
    assert.equal(response.status, 200);
    return response.headers.get('Set-Cookie').split(';')[0];
  }
  return { sqlite, DB, env, request, signIn };
}

const day = 86_400_000;
const dateAt = (now, days) => new Date(now.getTime() + days * day).toISOString().slice(0, 10);

test('assignment availability controls new tasks and rules while keeping existing work', async (t) => {
  const { DB, request, signIn } = fixture(t);
  const now = new Date();
  const admin = await signIn('local-admin');
  const member = await signIn('local-member');
  const input = { title: 'Check food', ownerId: 'local-member', due: '', associations: [] };
  const task = (await (await request('/api/tasks', { method: 'POST', cookie: admin, body: input })).json()).task;
  const ruleInput = { title: 'Daily feeding', ownerId: 'local-member', recordType: 'cat', recordId: 'pepper', repeatDays: 1, startDate: dateAt(now, 0) };
  const rule = (await (await request('/api/care-rules', { method: 'POST', cookie: admin, body: ruleInput })).json()).rule;
  const availability = { role: 'member', status: 'active', canBeAssignedTasks: false, expectedRole: 'member', expectedStatus: 'active', expectedCanBeAssignedTasks: true };
  assert.equal((await request('/api/users/local-member/access', { method: 'POST', cookie: admin, body: availability })).status, 200);
  let snapshot = await (await request('/api/workspace-data', { cookie: admin })).json();
  assert.ok(!snapshot.members.some((person) => person.id === 'local-member'));
  assert.ok(snapshot.tasks.some((item) => item.id === task.id && item.ownerId === 'local-member'));
  assert.equal((await request('/api/tasks', { method: 'POST', cookie: admin, body: input })).status, 400);
  assert.equal((await request('/api/care-rules', { method: 'POST', cookie: admin, body: ruleInput })).status, 400);
  assert.equal((await request(`/api/tasks/${task.id}/edit`, { method: 'POST', cookie: member, body: { ...input, title: 'Check food and water' } })).status, 200);
  assert.equal((await request(`/api/tasks/${task.id}/status`, { method: 'POST', cookie: member, body: { status: 'completed' } })).status, 200);
  const adminTask = (await (await request('/api/tasks', { method: 'POST', cookie: admin, body: { ...input, ownerId: 'local-admin' } })).json()).task;
  assert.equal((await request(`/api/tasks/${adminTask.id}/edit`, { method: 'POST', cookie: admin, body: input })).status, 400);
  await generateCareTasks(DB, new Date(now.getTime() + 3 * day));
  snapshot = await (await request('/api/workspace-data', { cookie: admin })).json();
  assert.ok(snapshot.tasks.some((item) => item.careRuleId === rule.id && item.due === dateAt(now, 3) && item.ownerId === 'local-member'));
  const reenable = { ...availability, canBeAssignedTasks: true, expectedCanBeAssignedTasks: false };
  assert.equal((await request('/api/users/local-member/access', { method: 'POST', cookie: admin, body: reenable })).status, 200);
  snapshot = await (await request('/api/workspace-data', { cookie: admin })).json();
  assert.ok(snapshot.members.some((person) => person.id === 'local-member'));
  assert.equal((await request('/api/tasks', { method: 'POST', cookie: admin, body: input })).status, 201);
});

test('rules create linked tasks on schedule, recover missed dates, and do not duplicate occurrences', async (t) => {
  const { DB, env, request, signIn } = fixture(t);
  const now = new Date();
  const admin = await signIn('local-admin');
  const input = { title: 'Feed Pepper', ownerId: 'local-member', recordType: 'cat', recordId: 'pepper', repeatDays: 1, startDate: dateAt(now, 0) };
  const created = await request('/api/care-rules', { method: 'POST', cookie: admin, body: input });
  assert.equal(created.status, 201);
  const { rule, tasks } = await created.json();
  assert.equal(rule.nextDue, dateAt(now, 2));
  assert.deepEqual(tasks.map((task) => task.due).sort(), [dateAt(now, 0), dateAt(now, 1)]);
  assert.ok(tasks.every((task) => task.ownerId === 'local-member' && task.careRuleId === rule.id && task.associations[0].id === 'pepper'));
  assert.equal((await request(`/api/tasks/${tasks[0].id}/status`, { method: 'POST', cookie: admin, body: { status: 'completed' } })).status, 200);

  let scheduled;
  worker.scheduled({ scheduledTime: now.getTime() + 4 * day }, env, { waitUntil(promise) { scheduled = promise; } });
  await scheduled;
  await generateCareTasks(DB, new Date(now.getTime() + 4 * day));
  const snapshot = await (await request('/api/workspace-data', { cookie: admin })).json();
  const generated = snapshot.tasks.filter((task) => task.careRuleId === rule.id);
  assert.deepEqual(generated.map((task) => task.due).sort(), Array.from({ length: 6 }, (_, index) => dateAt(now, index)));
  assert.equal(generated.filter((task) => task.status === 'completed').length, 1);
  assert.equal(snapshot.careRules.find((item) => item.id === rule.id).nextDue, dateAt(now, 6));
  const history = await (await request('/api/directory/cats/pepper/activity', { cookie: admin })).json();
  assert.ok(history.activity.some((event) => event.summary === 'Task created from a care rule'));
});

test('editing, pausing, and resuming leave existing tasks intact', async (t) => {
  const { DB, request, signIn } = fixture(t);
  const now = new Date();
  const admin = await signIn('local-admin');
  const member = await signIn('local-member');
  const input = { title: 'Morning feed', ownerId: 'local-member', recordType: 'colony', recordId: 'riverside', repeatDays: 1, startDate: dateAt(now, 0) };
  const { rule, tasks } = await (await request('/api/care-rules', { method: 'POST', cookie: admin, body: input })).json();
  assert.equal((await request(`/api/care-rules/${rule.id}/status`, { method: 'POST', cookie: member, body: { active: false } })).status, 200);
  await generateCareTasks(DB, new Date(now.getTime() + 20 * day));
  assert.equal((await (await request('/api/workspace-data', { cookie: admin })).json()).tasks.filter((task) => task.careRuleId === rule.id).length, 2);

  const edited = { ...input, title: 'Weekly feed', ownerId: 'local-admin', repeatDays: 7 };
  assert.equal((await request(`/api/care-rules/${rule.id}/edit`, { method: 'POST', cookie: admin, body: edited })).status, 200);
  assert.equal((await request(`/api/care-rules/${rule.id}/status`, { method: 'POST', cookie: admin, body: { active: true } })).status, 200);
  await generateCareTasks(DB, new Date(now.getTime() + 7 * day));
  const snapshot = await (await request('/api/workspace-data', { cookie: admin })).json();
  const generated = snapshot.tasks.filter((task) => task.careRuleId === rule.id);
  assert.equal(generated.length, 3);
  assert.ok(tasks.every((task) => generated.some((saved) => saved.id === task.id && saved.title === 'Morning feed' && saved.ownerId === 'local-member')));
  assert.ok(generated.some((task) => task.title === 'Weekly feed' && task.ownerId === 'local-admin' && task.due === dateAt(now, 7)));
});

test('rules enforce authentication, permissions, valid records, and active assignees', async (t) => {
  const { request, signIn } = fixture(t);
  const admin = await signIn('local-admin');
  const member = await signIn('local-member');
  const input = { title: 'Refresh water', ownerId: 'local-admin', recordType: 'colony', recordId: 'canal', repeatDays: 7, startDate: dateAt(new Date(), 0) };
  assert.equal((await request('/api/care-rules', { method: 'POST', body: input })).status, 401);
  assert.equal((await request('/api/care-rules', { method: 'POST', cookie: admin, origin: 'https://other.example', body: input })).status, 403);
  assert.equal((await request('/api/care-rules', { method: 'POST', cookie: admin, body: { ...input, ownerId: 'local-suspended' } })).status, 400);
  assert.equal((await request('/api/care-rules', { method: 'POST', cookie: admin, body: { ...input, recordId: 'missing' } })).status, 400);
  assert.equal((await request('/api/care-rules', { method: 'POST', cookie: admin, body: { ...input, repeatDays: 0 } })).status, 400);
  assert.equal((await request('/api/care-rules', { method: 'POST', cookie: admin, body: { ...input, startDate: '2026-02-30' } })).status, 400);
  const { rule } = await (await request('/api/care-rules', { method: 'POST', cookie: admin, body: input })).json();
  assert.equal((await request(`/api/care-rules/${rule.id}/edit`, { method: 'POST', cookie: member, body: { ...input, title: 'Changed' } })).status, 403);
  assert.equal((await request(`/api/care-rules/${rule.id}/status`, { method: 'POST', cookie: member, body: { active: false } })).status, 403);
  assert.equal((await request(`/api/care-rules/${rule.id}/edit`, { method: 'POST', cookie: admin, body: { ...input, recordId: 'riverside' } })).status, 400);
});

test('a failed scheduler keeps the saved rule accessible and a later check recovers', async (t) => {
  const { DB, request, signIn } = fixture(t);
  const admin = await signIn('local-admin');
  const input = { title: 'Feed the colony', ownerId: 'local-admin', recordType: 'colony', recordId: 'canal', repeatDays: 1, startDate: dateAt(new Date(), 0) };
  const batch = DB.batch;
  DB.batch = async () => { throw new Error('Simulated scheduler failure'); };
  const response = await request('/api/care-rules', { method: 'POST', cookie: admin, body: input });
  assert.equal(response.status, 201);
  const created = await response.json();
  assert.equal(created.generationFailed, true);
  const failed = await (await request('/api/workspace-data', { cookie: admin })).json();
  assert.equal(failed.careGenerationFailed, true);
  assert.ok(failed.careRules.some((rule) => rule.id === created.rule.id));
  DB.batch = batch;
  const recovered = await (await request('/api/workspace-data', { cookie: admin })).json();
  assert.equal(recovered.careGenerationFailed, false);
  assert.equal(recovered.tasks.filter((task) => task.careRuleId === created.rule.id).length, 2);
});
