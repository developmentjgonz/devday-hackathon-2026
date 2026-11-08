import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import worker from '../../worker/index.ts';

function fixture(t) {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON');
  for (const file of ['../../migrations/0001_accounts.sql', '../../migrations/0002_colonies_and_cats.sql', '../../migrations/0003_cat_profiles.sql', '../../migrations/0012_user_photos.sql', '../../seeds/local.sql']) {
    sqlite.exec(readFileSync(new URL(file, import.meta.url), 'utf8'));
  }
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
  const env = { DB, LOCAL_TEST_SIGN_IN: 'true', ASSETS: { fetch: () => new Response('Public app') } };
  async function request(path, { method = 'GET', body, cookie, origin = 'http://127.0.0.1:5197' } = {}) {
    return worker.fetch(new Request(`http://127.0.0.1:5197${path}`, {
      method,
      headers: { ...(method === 'POST' ? { Origin: origin, 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    }), env);
  }
  async function signIn(userId) {
    const response = await request('/api/auth/local/sign-in', { method: 'POST', body: { userId } });
    assert.equal(response.status, 200);
    return response.headers.get('Set-Cookie').split(';')[0];
  }
  return { sqlite, request, signIn };
}

const approve = { role: 'member', status: 'active', expectedRole: 'member', expectedStatus: 'pending' };
const suspendMember = { role: 'member', status: 'suspended', expectedRole: 'member', expectedStatus: 'active' };

test('only active administrators can read or change team accounts', async (t) => {
  const { request, signIn } = fixture(t);
  for (const [cookie, code] of [[undefined, 401], [await signIn('local-member'), 403], [await signIn('local-pending'), 403], [await signIn('local-suspended'), 403]]) {
    assert.equal((await request('/api/users', { cookie })).status, code);
    assert.equal((await request('/api/users/local-pending/access', { method: 'POST', cookie, body: approve })).status, code);
  }
  const admin = await signIn('local-admin');
  const response = await request('/api/users', { cookie: admin });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal((await response.json()).users.length, 4);
  for (const origin of ['https://other.example', 'null', '']) {
    assert.equal((await request('/api/users/local-pending/access', { method: 'POST', cookie: admin, origin, body: approve })).status, 403);
  }
});

test('approval records the administrator and lets the existing pending session enter', async (t) => {
  const { sqlite, request, signIn } = fixture(t);
  const pending = await signIn('local-pending');
  const admin = await signIn('local-admin');
  assert.equal((await request('/api/workspace', { cookie: pending })).status, 403);
  const response = await request('/api/users/local-pending/access', { method: 'POST', cookie: admin, body: approve });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).user.status, 'active');
  const record = sqlite.prepare("SELECT status, role, approved_by, approved_at FROM users WHERE id = 'local-pending'").get();
  assert.equal(record.role, 'member');
  assert.equal(record.approved_by, 'local-admin');
  assert.ok(record.approved_at > 0);
  assert.equal((await request('/api/workspace', { cookie: pending })).status, 200);
  assert.equal((await request('/api/users/local-pending/access', { method: 'POST', cookie: admin, body: approve })).status, 409);
});

test('role changes and suspension affect current sessions immediately', async (t) => {
  const { request, signIn } = fixture(t);
  const admin = await signIn('local-admin');
  const member = await signIn('local-member');
  const promote = { role: 'administrator', status: 'active', expectedRole: 'member', expectedStatus: 'active' };
  assert.equal((await request('/api/users/local-member/access', { method: 'POST', cookie: admin, body: promote })).status, 200);
  assert.equal((await request('/api/users', { cookie: member })).status, 200);
  const suspend = { role: 'administrator', status: 'suspended', expectedRole: 'administrator', expectedStatus: 'active' };
  assert.equal((await request('/api/users/local-member/access', { method: 'POST', cookie: admin, body: suspend })).status, 200);
  assert.equal((await request('/api/workspace', { cookie: member })).status, 403);
  assert.equal((await request('/api/users', { cookie: member })).status, 403);
  assert.equal((await request('/api/users/local-member/access', { method: 'POST', cookie: admin, body: { ...suspend, status: 'active', expectedStatus: 'suspended' } })).status, 200);
  assert.equal((await request('/api/users', { cookie: member })).status, 200);
});

test('changes reject self-edits, stale values, invalid requests, and unknown accounts', async (t) => {
  const { request, signIn } = fixture(t);
  const admin = await signIn('local-admin');
  const update = (id, body) => request(`/api/users/${id}/access`, { method: 'POST', cookie: admin, body });
  assert.equal((await update('local-admin', { role: 'member', status: 'active', expectedRole: 'administrator', expectedStatus: 'active' })).status, 400);
  assert.equal((await update('local-pending', { ...approve, role: 'administrator' })).status, 400);
  assert.equal((await update('local-pending', { ...approve, status: 'suspended' })).status, 400);
  assert.equal((await update('local-member', { ...suspendMember, expectedStatus: 'pending' })).status, 400);
  assert.equal((await update('local-member', { ...suspendMember, expectedRole: 'administrator' })).status, 409);
  assert.equal((await update('missing', suspendMember)).status, 404);
  for (const body of [{}, { ...suspendMember, status: 'pending' }, { ...suspendMember, role: 'owner' }, { ...suspendMember, phone: 'new' }]) {
    assert.equal((await update('local-member', body)).status, 400);
  }
});

test('competing administrators cannot both remove the other administrator', async (t) => {
  const { sqlite, request, signIn } = fixture(t);
  sqlite.exec("UPDATE users SET role = 'administrator' WHERE id = 'local-member'");
  const admin = await signIn('local-admin');
  const other = await signIn('local-member');
  const body = { role: 'member', status: 'active', expectedRole: 'administrator', expectedStatus: 'active' };
  const responses = await Promise.all([
    request('/api/users/local-member/access', { method: 'POST', cookie: admin, body }),
    request('/api/users/local-admin/access', { method: 'POST', cookie: other, body }),
  ]);
  assert.equal(responses.filter((response) => response.status === 200).length, 1);
  assert.equal(sqlite.prepare("SELECT count(*) AS count FROM users WHERE role = 'administrator' AND status = 'active'").get().count, 1);
});
