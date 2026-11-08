import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import worker from '../../worker/index.ts';

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
  const objects = new Map();
  const UPLOADS = {
    async put(key, value) { objects.set(key, new Uint8Array(await new Response(value).arrayBuffer())); },
    async get(key) { const data = objects.get(key); return data ? { body: new Response(data).body } : null; },
    async delete(key) { objects.delete(key); },
  };
  const env = { DB, UPLOADS, LOCAL_TEST_SIGN_IN: 'true', ASSETS: { fetch: () => new Response('Public app') } };
  async function request(path, { method = 'GET', body, form, cookie, origin = 'http://127.0.0.1:5197' } = {}) {
    return worker.fetch(new Request(`http://127.0.0.1:5197${path}`, {
      method,
      headers: { ...(method === 'POST' ? { Origin: origin, ...(form ? {} : { 'Content-Type': 'application/json' }) } : {}), ...(cookie ? { Cookie: cookie } : {}) },
      ...(form ? { body: form } : body !== undefined ? { body: JSON.stringify(body) } : {}),
    }), env);
  }
  async function signIn(userId) {
    const response = await request('/api/auth/local/sign-in', { method: 'POST', body: { userId } });
    assert.equal(response.status, 200);
    return response.headers.get('Set-Cookie').split(';')[0];
  }
  function reportForm(data, files = []) {
    const form = new FormData();
    form.set('data', JSON.stringify(data));
    for (const file of files) form.append('files', file);
    return form;
  }
  return { sqlite, objects, request, signIn, reportForm };
}

test('reports, attachments, review, and read state persist per member', async (t) => {
  const { request, signIn, reportForm } = fixture(t);
  const admin = await signIn('local-admin');
  const member = await signIn('local-member');
  const form = reportForm({ title: '  Water check ', message: 'Fresh water is needed.', colonyId: 'canal', catId: 'miso', urgent: true }, [new File(['care notes'], 'care.txt', { type: 'text/plain' })]);
  const created = await request('/api/reports', { method: 'POST', cookie: admin, form });
  assert.equal(created.status, 201);
  const { report } = await created.json();
  assert.equal(report.title, 'Water check');
  assert.equal(report.attachments.length, 1);
  const fileUrl = report.attachments[0].url;
  assert.equal((await request(fileUrl)).status, 401);
  const file = await request(fileUrl, { cookie: member });
  assert.equal(await file.text(), 'care notes');
  assert.equal(file.headers.get('X-Content-Type-Options'), 'nosniff');
  await request('/api/reports/read', { method: 'POST', cookie: admin, body: { ids: [report.id], unread: false } });
  const adminData = await (await request('/api/workspace-data', { cookie: admin })).json();
  const memberData = await (await request('/api/workspace-data', { cookie: member })).json();
  assert.equal(adminData.reports.find((item) => item.id === report.id).unread, false);
  assert.equal(memberData.reports.find((item) => item.id === report.id).unread, true);
  const reviewed = await request(`/api/reports/${report.id}/finish`, { method: 'POST', cookie: admin, body: { colonyId: 'canal', catId: 'miso', careNote: 'Fresh water provided.', urgent: false } });
  assert.equal(reviewed.status, 200);
  assert.equal((await reviewed.json()).report.status, 'processed');
  assert.equal((await (await request('/api/workspace-data', { cookie: member })).json()).reports.find((item) => item.id === report.id).careNote, 'Fresh water provided.');
});

test('tasks use member IDs and persist with related records and report history', async (t) => {
  const { request, signIn } = fixture(t);
  const admin = await signIn('local-admin');
  const member = await signIn('local-member');
  const input = { title: 'Check water', ownerId: 'local-member', due: '2026-11-12', reportId: 'report-injury', associations: [{ type: 'cat', id: 'pepper' }, { type: 'colony', id: 'riverside' }, { type: 'person', label: 'Dr. Lane' }, { type: 'paperwork', label: 'Clinic form' }, { type: 'other', label: 'Water bowls' }] };
  const response = await request('/api/tasks', { method: 'POST', cookie: admin, body: input });
  assert.equal(response.status, 201);
  const { task, report } = await response.json();
  assert.equal(task.ownerId, 'local-member');
  assert.deepEqual(task.associations, input.associations);
  assert.match(report.history.at(-1), /created a task/);
  assert.equal((await request(`/api/tasks/${task.id}/status`, { method: 'POST', cookie: member, body: { status: 'completed' } })).status, 200);
  const data = await (await request('/api/workspace-data', { cookie: member })).json();
  assert.equal(data.tasks.find((item) => item.id === task.id).status, 'completed');
  assert.ok(data.reports.find((item) => item.id === 'report-injury').history.some((item) => item.includes('completed task')));
  const other = await request('/api/tasks', { method: 'POST', cookie: admin, body: { ...input, ownerId: 'local-admin' } });
  const otherTask = (await other.json()).task;
  assert.equal((await request(`/api/tasks/${otherTask.id}/status`, { method: 'POST', cookie: member, body: { status: 'completed' } })).status, 403);
});

test('invalid and unauthorized operations do not create records or leave files', async (t) => {
  const { objects, request, signIn, reportForm } = fixture(t);
  const admin = await signIn('local-admin');
  assert.equal((await request('/api/workspace-data')).status, 401);
  assert.equal((await request('/api/tasks', { method: 'POST', cookie: admin, origin: 'https://other.example', body: {} })).status, 403);
  const bad = reportForm({ title: 'Bad colony', message: 'Test', colonyId: 'missing', catId: '', urgent: false }, [new File(['data'], 'care.txt', { type: 'text/plain' })]);
  assert.equal((await request('/api/reports', { method: 'POST', cookie: admin, form: bad })).status, 404);
  assert.equal(objects.size, 0);
  assert.equal((await request('/api/tasks', { method: 'POST', cookie: admin, body: { title: 'Task', ownerId: 'missing', due: '', associations: [] } })).status, 400);
});

test('public content exposes only published area summaries and posts', async (t) => {
  const { sqlite, request } = fixture(t);
  sqlite.prepare("INSERT INTO public_areas (id, name, boundary, activity, colony_count_band, published) VALUES ('private-area', 'Unpublished', '{}', 'low', '0', 0)").run();
  sqlite.prepare("INSERT INTO community_posts (id, kind, title, description, published) VALUES ('private-post', 'news', 'Unpublished', 'Hidden', 0)").run();
  const response = await request('/api/public-content');
  assert.equal(response.status, 200);
  const content = await response.json();
  assert.equal(content.areas.length, 3);
  assert.equal(content.openings.length, 3);
  assert.equal(content.news.length, 3);
  assert.ok(content.areas.every((area) => !('colonyId' in area) && !('coordinates' in area)));
  assert.ok(!JSON.stringify(content).includes('Unpublished'));
});

test('standalone tasks can save the full allowed set of related items', async (t) => {
  const { request, signIn } = fixture(t);
  const cookie = await signIn('local-admin');
  const associations = Array.from({ length: 30 }, (_, index) => ({ type: 'other', label: `${String(index).padStart(2, '0')}${'🐈'.repeat(59)}` }));
  const input = { title: 'Prepare the carriers', ownerId: 'local-admin', due: '', associations };
  const response = await request('/api/tasks', { method: 'POST', cookie, body: input });
  assert.equal(response.status, 201);
  const { task } = await response.json();
  assert.deepEqual(task.associations, associations);
  const saved = await (await request('/api/workspace-data', { cookie })).json();
  assert.deepEqual(saved.tasks.find((item) => item.id === task.id).associations, associations);
  assert.equal((await request('/api/tasks', { method: 'POST', cookie, body: { ...input, associations: [...associations, { type: 'person', label: 'Extra' }] } })).status, 400);
});

test('report questions and duplicate links remain in saved history', async (t) => {
  const { request, signIn } = fixture(t);
  const admin = await signIn('local-admin');
  const question = await request('/api/reports/report-sighting/questions', { method: 'POST', cookie: admin, body: { text: 'Was the ear tipped?' } });
  assert.equal(question.status, 200);
  assert.equal((await question.json()).report.status, 'waiting');
  const linked = await request('/api/reports/report-sighting/duplicate', { method: 'POST', cookie: admin, body: { targetId: 'report-earlier-sighting' } });
  assert.equal(linked.status, 200);
  const saved = (await (await request('/api/workspace-data', { cookie: admin })).json()).reports.find((report) => report.id === 'report-sighting');
  assert.equal(saved.status, 'processed');
  assert.equal(saved.duplicateOf, 'report-earlier-sighting');
  assert.equal(saved.thread.at(-1).text, 'Was the ear tipped?');
  assert.ok(saved.history.some((event) => event.includes('linked this duplicate')));
  assert.equal((await request('/api/reports/report-sighting/reopen', { method: 'POST', cookie: admin })).status, 200);
  const reopened = (await (await request('/api/workspace-data', { cookie: admin })).json()).reports.find((report) => report.id === 'report-sighting');
  assert.equal(reopened.status, 'pending');
  assert.equal(reopened.duplicateOf, undefined);
  assert.equal(reopened.thread.at(-1).text, 'Was the ear tipped?');
});
