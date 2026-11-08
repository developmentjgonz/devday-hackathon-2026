import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import worker from '../../worker/index.ts';
import { hashToken } from '../../worker/services/session.ts';

const migration = readFileSync(new URL('../../migrations/0001_accounts.sql', import.meta.url), 'utf8');
const directoryMigration = readFileSync(new URL('../../migrations/0002_colonies_and_cats.sql', import.meta.url), 'utf8');
const profilesMigration = readFileSync(new URL('../../migrations/0003_cat_profiles.sql', import.meta.url), 'utf8');
const seeds = readFileSync(new URL('../../seeds/local.sql', import.meta.url), 'utf8');

function fixture(t, overrides = {}) {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON');
  sqlite.exec(migration);
  sqlite.exec(directoryMigration);
  sqlite.exec(profilesMigration);
  sqlite.exec(seeds);
  t.after(() => sqlite.close());
  // Run the actual SQL through SQLite with the D1 statement interface.
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
      try {
        const results = [];
        for (const statement of statements) results.push(await statement.run());
        sqlite.exec('COMMIT');
        return results;
      } catch (error) {
        sqlite.exec('ROLLBACK');
        throw error;
      }
    },
  };
  const env = { DB, LOCAL_TEST_SIGN_IN: 'true', ASSETS: { fetch: () => new Response('Public app') }, ...overrides };
  async function request(path, { method = 'GET', body, rawBody, cookie, origin = 'http://127.0.0.1:5197', base = 'http://127.0.0.1:5197', headers = {} } = {}) {
    return worker.fetch(new Request(`${base}${path}`, {
      method,
      headers: {
        ...(method === 'POST' ? { Origin: origin, 'Content-Type': 'application/json' } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
        ...headers,
      },
      ...(rawBody !== undefined ? { body: rawBody } : body !== undefined ? { body: JSON.stringify(body) } : {}),
    }), env);
  }
  async function signIn(userId = 'local-admin', cookie) {
    const response = await request('/api/auth/local/sign-in', { method: 'POST', body: { userId }, cookie });
    assert.equal(response.status, 200);
    return response.headers.get('Set-Cookie').split(';')[0];
  }
  return { sqlite, env, request, signIn };
}

test('seed is repeatable and preserves existing profiles and approval', (t) => {
  const { sqlite } = fixture(t);
  sqlite.exec("UPDATE users SET status = 'active', name = 'Updated name' WHERE id = 'local-pending'");
  sqlite.exec(seeds);
  assert.equal(sqlite.prepare('SELECT count(*) AS count FROM users').get().count, 4);
  assert.equal(sqlite.prepare('SELECT count(*) AS count FROM sign_in_identities').get().count, 4);
  assert.equal(sqlite.prepare("SELECT name FROM users WHERE id = 'local-pending'").get().name, 'Updated name');
  assert.equal(sqlite.prepare("SELECT status FROM users WHERE id = 'local-pending'").get().status, 'active');
});

test('public pages and the health check remain available without sign-in', async (t) => {
  const { request } = fixture(t);
  assert.equal((await request('/')).status, 200);
  const health = await request('/api/health');
  assert.equal(health.status, 200);
  assert.equal((await health.json()).database, 'connected');
  assert.equal((await request('/api/health', { method: 'POST' })).status, 405);
});

test('local options list fictional accounts and send no cacheable response', async (t) => {
  const { request } = fixture(t);
  const response = await request('/api/auth/options');
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  const options = await response.json();
  assert.equal(options.localSignInEnabled, true);
  assert.equal(options.users.length, 4);
  assert.equal(options.users[0].role, 'administrator');
  assert.equal('phone' in options.users[0], false);
});

test('local sign-in and signup are unavailable without the explicit flag', async (t) => {
  const { request } = fixture(t, { LOCAL_TEST_SIGN_IN: undefined });
  assert.deepEqual(await (await request('/api/auth/options')).json(), { localSignInEnabled: false, googleSignInEnabled: false, users: [] });
  for (const path of ['/api/auth/local/sign-in', '/api/auth/local/sign-up']) {
    assert.equal((await request(path, { method: 'POST', body: { userId: 'local-admin' } })).status, 404);
  }
});

test('a public hostname cannot enable local sign-in, even with the flag', async (t) => {
  const { request } = fixture(t);
  for (const base of ['https://mews.example', 'http://mews.example', 'https://localhost']) {
    const options = await request('/api/auth/options', { base });
    assert.deepEqual(await options.json(), { localSignInEnabled: false, googleSignInEnabled: false, users: [] });
    for (const path of ['/api/auth/local/sign-in', '/api/auth/local/sign-up']) {
      assert.equal((await request(path, { base, method: 'POST', body: { userId: 'local-admin' } })).status, 404);
    }
  }
});

test('a signed-out or forged session cannot access workspace data', async (t) => {
  const { request } = fixture(t);
  assert.deepEqual(await (await request('/api/auth/session')).json(), { user: null });
  for (const cookie of [undefined, 'mews_session=administrator', `mews_session=${'a'.repeat(64)}`]) {
    assert.equal((await request('/api/workspace', { cookie })).status, 401);
  }
});

test('administrator sign-in uses an HttpOnly session and stores only its hash', async (t) => {
  const { request, sqlite } = fixture(t);
  const response = await request('/api/auth/local/sign-in', { method: 'POST', body: { userId: 'local-admin' } });
  assert.equal(response.status, 200);
  const setCookie = response.headers.get('Set-Cookie');
  assert.match(setCookie, /HttpOnly; SameSite=Lax; Max-Age=43200/);
  const cookie = setCookie.split(';')[0];
  const token = cookie.split('=')[1];
  const stored = sqlite.prepare('SELECT token_hash FROM sessions').get().token_hash;
  assert.notEqual(stored, token);
  assert.equal(stored, await hashToken(token));
  const workspace = await request('/api/workspace', { cookie });
  assert.equal(workspace.status, 200);
  assert.equal((await workspace.json()).user.role, 'administrator');
});

test('active members can enter the workspace', async (t) => {
  const { signIn, request } = fixture(t);
  const cookie = await signIn('local-member');
  const response = await request('/api/workspace', { cookie });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).user.role, 'member');
});

test('pending and suspended users can see their status but not workspace data', async (t) => {
  const { signIn, request } = fixture(t);
  for (const [id, status] of [['local-pending', 'pending'], ['local-suspended', 'suspended']]) {
    const cookie = await signIn(id);
    assert.equal((await (await request('/api/auth/session', { cookie })).json()).user.status, status);
    assert.equal((await request('/api/workspace', { cookie })).status, 403);
  }
});

test('a new user is pending, has no phone by default, and cannot grant themselves admin', async (t) => {
  const { request, sqlite } = fixture(t);
  const response = await request('/api/auth/local/sign-up', {
    method: 'POST', body: { name: '  New Volunteer  ', email: 'NEW@mews.test', role: 'administrator', status: 'active' },
  });
  assert.equal(response.status, 201);
  const { user } = await response.json();
  assert.equal(user.name, 'New Volunteer');
  assert.equal(user.email, 'new@mews.test');
  assert.equal(user.phone, null);
  assert.equal(user.role, 'member');
  assert.equal(user.status, 'pending');
  const stored = sqlite.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
  assert.equal(stored.approved_by, null);
  assert.equal(stored.approved_at, null);
  const cookie = response.headers.get('Set-Cookie').split(';')[0];
  assert.equal((await request('/api/workspace', { cookie })).status, 403);
});

test('phone is optional and supplied contact details are saved', async (t) => {
  const { request } = fixture(t);
  for (const [email, phone, expected] of [['blank@mews.test', '   ', null], ['phone@mews.test', '+1 202 555 0100', '+1 202 555 0100']]) {
    const response = await request('/api/auth/local/sign-up', { method: 'POST', body: { name: 'Test user', email, phone } });
    assert.equal(response.status, 201);
    assert.equal((await response.json()).user.phone, expected);
  }
});

test('duplicate signup does not link or sign in to an existing administrator', async (t) => {
  const { request } = fixture(t);
  const response = await request('/api/auth/local/sign-up', { method: 'POST', body: { name: 'Other', email: 'ADMIN@mews.test' } });
  assert.equal(response.status, 409);
  assert.equal(response.headers.has('Set-Cookie'), false);
});

test('profile validation rejects missing, invalid, and oversized data', async (t) => {
  const { request } = fixture(t);
  for (const body of [{}, { name: ' ', email: 'test@mews.test' }, { name: 'Test', email: 'bad' }, { name: 'Test', email: 'test@mews.test', phone: 123 }, { name: 'Test', email: 'test@mews.test', phone: '1'.repeat(41) }]) {
    assert.equal((await request('/api/auth/local/sign-up', { method: 'POST', body })).status, 400);
  }
  assert.equal((await request('/api/auth/local/sign-up', { method: 'POST', body: { name: 'x'.repeat(5000) } })).status, 413);
});

test('mutations reject cross-origin and missing-origin requests', async (t) => {
  const { request } = fixture(t);
  for (const path of ['/api/auth/local/sign-in', '/api/auth/local/sign-up', '/api/auth/sign-out']) {
    for (const origin of ['https://other.example', 'null', '']) {
      assert.equal((await request(path, { method: 'POST', origin, body: { userId: 'local-admin' } })).status, 403);
    }
  }
});

test('the configured app origin supports the Vite proxy without trusting forwarded headers', async (t) => {
  const { request } = fixture(t, { APP_ORIGIN: 'http://127.0.0.1:5197' });
  const allowed = await request('/api/auth/local/sign-in', {
    base: 'http://127.0.0.1:8797', method: 'POST', body: { userId: 'local-admin' },
  });
  assert.equal(allowed.status, 200);
  const denied = await request('/api/auth/local/sign-in', {
    base: 'http://127.0.0.1:8797', method: 'POST', origin: 'https://other.example',
    headers: { 'X-Forwarded-Host': 'other.example' }, body: { userId: 'local-admin' },
  });
  assert.equal(denied.status, 403);
});

test('expired sessions and signed-out sessions cannot be reused', async (t) => {
  const { request, signIn, sqlite } = fixture(t);
  const expiredCookie = await signIn();
  sqlite.exec('UPDATE sessions SET expires_at = 1');
  assert.equal((await request('/api/workspace', { cookie: expiredCookie })).status, 401);
  const cookie = await signIn();
  const response = await request('/api/auth/sign-out', { method: 'POST', cookie });
  assert.match(response.headers.get('Set-Cookie'), /Max-Age=0/);
  assert.equal((await request('/api/workspace', { cookie })).status, 401);
});

test('changing test accounts replaces the previous server session', async (t) => {
  const { request, signIn } = fixture(t);
  const previousCookie = await signIn('local-admin');
  const cookie = await signIn('local-member', previousCookie);
  assert.equal((await request('/api/workspace', { cookie: previousCookie })).status, 401);
  assert.equal((await request('/api/workspace', { cookie })).status, 200);
});

test('approval, suspension, and role changes take effect within an existing session', async (t) => {
  const { request, signIn, sqlite } = fixture(t);
  const cookie = await signIn('local-pending');
  assert.equal((await request('/api/workspace', { cookie })).status, 403);
  sqlite.exec("UPDATE users SET status = 'active', role = 'administrator' WHERE id = 'local-pending'");
  const response = await request('/api/workspace', { cookie });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).user.role, 'administrator');
  sqlite.exec("UPDATE users SET status = 'suspended' WHERE id = 'local-pending'");
  assert.equal((await request('/api/workspace', { cookie })).status, 403);
});

test('test sign-in does not accept identities from another provider', async (t) => {
  const { request, sqlite } = fixture(t);
  sqlite.exec("UPDATE sign_in_identities SET provider = 'future-provider' WHERE user_id = 'local-admin'");
  const response = await request('/api/auth/local/sign-in', { method: 'POST', body: { userId: 'local-admin' } });
  assert.equal(response.status, 404);
});

test('auth endpoints reject unsupported methods', async (t) => {
  const { request } = fixture(t);
  assert.equal((await request('/api/auth/local/sign-in')).status, 405);
  assert.equal((await request('/api/auth/options', { method: 'POST' })).status, 405);
  assert.equal((await request('/api/auth/not-found')).status, 404);
});

test('unknown API routes return uncached JSON while frontend routes use assets', async (t) => {
  const { request } = fixture(t);
  for (const path of ['/api', '/api/unknown', '/api/auth/unknown', '/api/workspace/unknown']) {
    const response = await request(path);
    assert.equal(response.status, 404, path);
    assert.match(response.headers.get('Content-Type'), /application\/json/);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    assert.deepEqual(await response.json(), { error: 'Not found' });
  }
  for (const path of ['/', '/app', '/about', '/apiary']) {
    assert.equal(await (await request(path)).text(), 'Public app');
  }
});

test('API method handling reports allowed methods and supports HEAD without a body', async (t) => {
  const { request } = fixture(t);
  const wrongMethod = await request('/api/health', { method: 'POST' });
  assert.equal(wrongMethod.status, 405);
  assert.equal(wrongMethod.headers.get('Allow'), 'GET, HEAD');
  assert.equal(wrongMethod.headers.get('Cache-Control'), 'no-store');
  const head = await request('/api/health', { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
});

test('account inputs reject malformed JSON, non-object bodies, and unsupported content types', async (t) => {
  const { request } = fixture(t);
  const path = '/api/auth/local/sign-up';
  for (const rawBody of ['{', 'null', '[]', '"profile"']) {
    const response = await request(path, { method: 'POST', rawBody });
    assert.equal(response.status, 400);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    assert.match(response.headers.get('Content-Type'), /application\/json/);
  }
  const missing = await request(path, { method: 'POST' });
  assert.equal(missing.status, 400);
  for (const contentType of ['', 'text/plain', 'application/json-invalid']) {
    const response = await request(path, {
      method: 'POST', body: { name: 'Test', email: 'test@mews.test' }, headers: { 'Content-Type': contentType },
    });
    assert.equal(response.status, 415);
  }
});

test('body limits count UTF-8 bytes and validation accepts JSON charset parameters', async (t) => {
  const { request } = fixture(t);
  const oversized = await request('/api/auth/local/sign-up', {
    method: 'POST', body: { name: '🐈'.repeat(1100), email: 'test@mews.test' },
  });
  assert.equal(oversized.status, 413);
  const response = await request('/api/auth/local/sign-up', {
    method: 'POST', body: { name: 'Volunteer', email: 'charset@mews.test' },
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
  assert.equal(response.status, 201);
});

test('database failures return uncached JSON without internal details', async (t) => {
  const { request } = fixture(t, { DB: { prepare() { throw new Error('private database detail'); } } });
  t.mock.method(console, 'error', () => {});
  const health = await request('/api/health');
  assert.equal(health.status, 503);
  assert.equal((await health.json()).database, 'unavailable');
  const account = await request('/api/auth/options');
  assert.equal(account.status, 503);
  assert.equal(account.headers.get('Cache-Control'), 'no-store');
  assert.deepEqual(await account.json(), { error: 'Account service is unavailable. Try again.' });
});
