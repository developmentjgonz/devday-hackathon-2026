import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import worker from '../../worker/index.ts';

const migrationDir = new URL('../../migrations/', import.meta.url);
function database(t, through = '9999', { seedWorkspace = true } = {}) {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON');
  for (const file of readdirSync(migrationDir).filter((name) => name.endsWith('.sql') && name.slice(0, 4) <= through).sort()) {
    sqlite.exec(readFileSync(new URL(file, migrationDir), 'utf8'));
  }
  sqlite.exec(readFileSync(new URL('../../seeds/local.sql', import.meta.url), 'utf8'));
  if (seedWorkspace) sqlite.exec(readFileSync(new URL('../../seeds/workspace.sql', import.meta.url), 'utf8'));
  t.after(() => sqlite.close());
  return sqlite;
}

function api(t) {
  const sqlite = database(t);
  let allow = true;
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
      try { const results = []; for (const statement of statements) results.push(await statement.run()); sqlite.exec('COMMIT'); return results; }
      catch (error) { sqlite.exec('ROLLBACK'); throw error; }
    },
  };
  const env = {
    DB, LOCAL_TEST_SIGN_IN: 'true',
    PUBLIC_REPORT_RATE_LIMITER: { async limit() { return { success: allow }; } },
    ASSETS: { fetch: () => new Response('Public app') },
  };
  const objects = new Map();
  env.UPLOADS = {
    async put(key, stream, options) { objects.set(key, { body: await new Response(stream).arrayBuffer(), ...options }); },
    async get(key) { return objects.get(key) ?? null; },
    async delete(key) { objects.delete(key); },
  };
  function request(path, { body, cookie, headers = {}, origin = 'http://127.0.0.1:5197' } = {}) {
    const post = body !== undefined;
    return worker.fetch(new Request(`http://127.0.0.1:5197${path}`, {
      method: post ? 'POST' : 'GET',
      headers: { ...(post ? { Origin: origin, ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }) } : {}), ...(cookie ? { Cookie: cookie } : {}), ...headers },
      ...(post ? { body: body instanceof FormData ? body : JSON.stringify(body) } : {}),
    }), env);
  }
  return { sqlite, request, env, objects, denyReports: () => { allow = false; } };
}

function reportWithFiles(files) {
  const form = new FormData();
  form.set('data', JSON.stringify({ location: 'Oak Street', details: 'Three cats were limping.', urgent: false }));
  for (const file of files) form.append('files', file);
  return form;
}

test('public attachments reach the private inbox and identical retries keep one copy', async (t) => {
  const { sqlite, request, objects } = api(t);
  const files = [new File(['cat photo'], 'cat.jpg', { type: 'image/jpeg' }), new File(['sighting notes'], 'notes.txt', { type: 'text/plain' })];
  const headers = { 'Idempotency-Key': 'e24ee2bf-7eee-4b38-9bf1-e9b589bdb389' };
  const post = (selected) => request('/api/public-reports', { headers, body: reportWithFiles(selected) });
  assert.equal((await post(files)).status, 201);
  assert.equal((await post(files)).status, 201);
  assert.equal(objects.size, 2);
  assert.equal(sqlite.prepare('SELECT count(*) AS n FROM report_attachments').get().n, 2);
  assert.equal((await post([new File(['different bytes'], 'cat.jpg', { type: 'image/jpeg' }), files[1]])).status, 409);
  assert.equal(objects.size, 2);
  const cookie = (await request('/api/auth/local/sign-in', { body: { userId: 'local-admin' } })).headers.get('set-cookie').split(';')[0];
  const snapshot = await (await request('/api/workspace-data', { cookie })).json();
  const report = snapshot.reports.find((item) => item.id === `public-${headers['Idempotency-Key']}`);
  assert.deepEqual(report.attachments.map((file) => file.name), ['cat.jpg', 'notes.txt']);
  const attachment = report.attachments[0];
  assert.equal((await request(attachment.url)).status, 401);
  const response = await request(attachment.url, { cookie });
  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'cat photo');
  assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
});

test('invalid public attachments are rejected and failed uploads leave no report or objects', async (t) => {
  const { sqlite, request, objects, env } = api(t);
  const count = () => sqlite.prepare('SELECT count(*) AS n FROM reports').get().n;
  const before = count();
  const file = new File(['cat'], 'cat.jpg', { type: 'image/jpeg' });
  assert.equal((await request('/api/public-reports', { body: reportWithFiles(Array(6).fill(file)) })).status, 400);
  assert.equal((await request('/api/public-reports', { body: reportWithFiles([new File(['script'], 'page.html', { type: 'text/html' })]) })).status, 400);
  assert.equal((await request('/api/public-reports', { body: reportWithFiles([new File([], 'empty.jpg', { type: 'image/jpeg' })]) })).status, 400);
  assert.equal((await request('/api/public-reports', { body: reportWithFiles([new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'large.jpg', { type: 'image/jpeg' })]) })).status, 413);
  const put = env.UPLOADS.put;
  let puts = 0;
  env.UPLOADS.put = async (...args) => { if (++puts === 2) throw new Error('Upload failed'); return put(...args); };
  assert.equal((await request('/api/public-reports', { body: reportWithFiles([file, file]) })).status, 503);
  assert.equal(count(), before);
  assert.equal(objects.size, 0);
});

test('anonymous submissions reach the private inbox and can be reviewed', async (t) => {
  const { sqlite, request } = api(t);
  const submitted = await request('/api/public-reports', { body: { location: '  Oak and 3rd  ', details: '  An injured cat is near the store.  ', urgent: true } });
  assert.equal(submitted.status, 201);
  assert.deepEqual(await submitted.json(), { submitted: true });
  assert.equal((await request('/api/workspace-data')).status, 401);
  const signIn = await request('/api/auth/local/sign-in', { body: { userId: 'local-admin' } });
  const cookie = signIn.headers.get('set-cookie').split(';')[0];
  const snapshot = await (await request('/api/workspace-data', { cookie })).json();
  const report = snapshot.reports.find((item) => item.anonymous);
  assert.equal(report.reporter, 'Anonymous');
  assert.equal(report.status, 'pending');
  assert.equal(report.urgent, true);
  assert.equal(report.message, 'Location: Oak and 3rd\n\nDetails: An injured cat is near the store.');
  assert.equal(sqlite.prepare('SELECT reporter_id FROM reports WHERE id = ?').get(report.id).reporter_id, null);
  assert.equal((await request(`/api/reports/${report.id}/questions`, { cookie, body: { text: 'Where exactly?' } })).status, 409);
  const reviewed = await request(`/api/reports/${report.id}/finish`, { cookie, body: { colonyId: 'canal', catId: '', careNote: '', urgent: true } });
  assert.equal(reviewed.status, 200);
  assert.equal((await reviewed.json()).report.status, 'processed');
});

test('map locations reach the inbox and retries do not create duplicate reports', async (t) => {
  const { sqlite, request } = api(t);
  const key = 'e24ee2bf-7eee-4b38-9bf1-e9b589bdb389';
  const body = { location: '', details: 'A cat was by the door.', urgent: false, mapLocation: { type: 'pin', latitude: 25.767088, longitude: -80.189696 } };
  const headers = { 'Idempotency-Key': key };
  assert.equal((await request('/api/public-reports', { body, headers })).status, 201);
  assert.equal((await request('/api/public-reports', { body, headers })).status, 201);
  assert.equal((await request('/api/public-reports', { body: { ...body, mapLocation: { ...body.mapLocation, latitude: 26 } }, headers })).status, 409);
  assert.equal(sqlite.prepare('SELECT count(*) AS n FROM reports WHERE id = ?').get(`public-${key}`).n, 1);
  const signIn = await request('/api/auth/local/sign-in', { body: { userId: 'local-admin' } });
  const cookie = signIn.headers.get('set-cookie').split(';')[0];
  const snapshot = await (await request('/api/workspace-data', { cookie })).json();
  assert.deepEqual(snapshot.reports.find((item) => item.id === `public-${key}`).mapLocation, body.mapLocation);
  assert.equal((await request('/api/public-reports', { body: { ...body, mapLocation: { type: 'pin', latitude: 91, longitude: 0 } } })).status, 400);

  const place = { location: '', details: 'A cat is near the park.', urgent: false, mapLocation: { type: 'google-place', placeId: 'place-id-123' } };
  assert.equal((await request('/api/public-reports', { body: place })).status, 201);
  const saved = sqlite.prepare('SELECT public_latitude, public_longitude, public_google_place_id FROM reports WHERE public_google_place_id = ?').get('place-id-123');
  assert.deepEqual({ ...saved }, { public_latitude: null, public_longitude: null, public_google_place_id: 'place-id-123' });
});

test('public intake validates input, checks origin, and applies its rate limit', async (t) => {
  const { sqlite, request, denyReports } = api(t);
  const count = () => sqlite.prepare('SELECT COUNT(*) AS count FROM reports').get().count;
  const before = count();
  assert.equal((await request('/api/public-reports', { body: { location: ' ', details: 'A cat', urgent: false } })).status, 400);
  assert.equal((await request('/api/public-reports', { body: { location: 'Oak', details: 'A cat', urgent: false, reporterId: 'local-admin' } })).status, 400);
  assert.equal((await request('/api/public-reports', { origin: 'https://other.example', body: { location: 'Oak', details: 'A cat', urgent: false } })).status, 403);
  denyReports();
  assert.equal((await request('/api/public-reports', { body: { location: 'Oak', details: 'A cat', urgent: false } })).status, 429);
  assert.equal(count(), before);
});

test('the anonymous-report migration preserves existing report relationships', (t) => {
  const sqlite = database(t, '0019', { seedWorkspace: false });
  // Keep this fixture on the schema under test, independent of current app seeds.
  sqlite.exec(`INSERT INTO reports (id, title, message, category, reporter_id, submitted_at) VALUES
      ('report-injury', 'Possible injury', 'A cat is limping.', 'Care concern', 'local-member', '2026-01-01'),
      ('report-sighting', 'Cat sighting', 'A cat is near the gate.', 'Sighting', 'local-member', '2026-01-01');
    INSERT INTO tasks (id, title, owner_id, created_at) VALUES ('migration-task', 'Check the cat', 'local-admin', '2026-01-01');
    CREATE TABLE IF NOT EXISTS report_reads (report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, PRIMARY KEY (report_id, user_id));
    INSERT INTO report_reads VALUES ('report-injury','local-admin');
    INSERT INTO report_entries VALUES ('migration-entry','report-injury','local-admin','Question','2026-01-01');
    INSERT INTO report_history VALUES ('migration-history','report-injury','local-admin','History','2026-01-01');
    INSERT INTO report_attachments VALUES ('migration-file','report-injury','migration-key','note.txt','text/plain',1);
    UPDATE tasks SET report_id = 'report-injury' WHERE id = 'migration-task';
    UPDATE reports SET possible_duplicate_id = 'report-injury' WHERE id = 'report-sighting';`);
  const tables = ['reports', 'report_reads', 'report_entries', 'report_history', 'report_attachments', 'tasks'];
  const snapshot = () => tables.map((table) => sqlite.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all());
  const before = snapshot();
  sqlite.exec('BEGIN');
  sqlite.exec(readFileSync(new URL('0020_anonymous_reports.sql', migrationDir), 'utf8'));
  sqlite.exec('COMMIT');
  assert.deepEqual(snapshot(), before);
  assert.deepEqual(sqlite.prepare('PRAGMA foreign_key_check').all(), []);
});

test('follow-up contact requires permission and stays separate from the report description', async (t) => {
  const { sqlite, request } = api(t);
  const base = { location: 'Oak Street', details: 'A gray cat by the gate.', urgent: false };
  for (const contact of [
    { phone: '+1 (305) 555-0123' },
    { phone: '+1 (305) 555-0123', consent: false },
    { consent: true },
    { phone: '123', consent: true },
    { phone: 'not a phone', consent: true },
    { email: 'not-email', consent: true },
  ]) assert.equal((await request('/api/public-reports', { body: { ...base, contact } })).status, 400);

  const headers = { 'Idempotency-Key': 'c24ee2bf-7eee-4b38-9bf1-e9b589bdb389' };
  const contact = { phone: '+1 (305) 555-0123', email: 'sender@example.test', consent: true };
  const body = { ...base, contact };
  const response = await request('/api/public-reports', { body, headers });
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), { submitted: true });
  assert.equal((await request('/api/public-reports', { body, headers })).status, 201);
  assert.equal((await request('/api/public-reports', { body: { ...base, contact: { ...contact, email: 'changed@example.test' } }, headers })).status, 409);
  assert.equal((await request('/api/workspace-data')).status, 401);
  const cookie = (await request('/api/auth/local/sign-in', { body: { userId: 'local-admin' } })).headers.get('set-cookie').split(';')[0];
  const snapshot = await (await request('/api/workspace-data', { cookie })).json();
  const report = snapshot.reports.find((item) => item.id === `public-${headers['Idempotency-Key']}`);
  assert.deepEqual(report.contact, { ...contact, consentedAt: report.submittedAt });
  assert.equal(report.reporter, 'Community sender');
  assert.equal(report.message, 'Location: Oak Street\n\nDetails: A gray cat by the gate.');
  const saved = sqlite.prepare('SELECT public_contact_phone, public_contact_email, public_contact_consented_at FROM reports WHERE id = ?').get(report.id);
  assert.deepEqual({ ...saved }, { public_contact_phone: contact.phone, public_contact_email: contact.email, public_contact_consented_at: report.submittedAt });
  assert.equal((await request('/api/public-reports', { body: { ...base, contact: { email: 'email-only@example.test', consent: true } } })).status, 201);
  assert.equal((await request('/api/public-reports', { body: { ...base, contact: { phone: '+44 20 7946 0958', consent: true } } })).status, 201);
  assert.equal((await request('/api/public-reports', { body: base })).status, 201);
  assert.equal(sqlite.prepare('SELECT count(*) AS n FROM reports WHERE public_contact_consented_at IS NOT NULL').get().n, 3);
});
