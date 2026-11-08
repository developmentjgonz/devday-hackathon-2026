import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import worker from '../../worker/index.ts';

const migrationDir = new URL('../../migrations/', import.meta.url);
function database(t, through = '9999') {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON');
  for (const file of readdirSync(migrationDir).filter((name) => name.endsWith('.sql') && name.slice(0, 4) <= through).sort()) {
    sqlite.exec(readFileSync(new URL(file, migrationDir), 'utf8'));
  }
  for (const path of ['../../seeds/local.sql', '../../seeds/workspace.sql']) sqlite.exec(readFileSync(new URL(path, import.meta.url), 'utf8'));
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
  function request(path, { body, cookie, origin = 'http://127.0.0.1:5197' } = {}) {
    const post = body !== undefined;
    return worker.fetch(new Request(`http://127.0.0.1:5197${path}`, {
      method: post ? 'POST' : 'GET',
      headers: { ...(post ? { Origin: origin, 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) },
      ...(post ? { body: JSON.stringify(body) } : {}),
    }), env);
  }
  return { sqlite, request, denyReports: () => { allow = false; } };
}

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
  const reviewed = await request(`/api/reports/${report.id}/finish`, { cookie, body: { colonyId: 'canal', catId: '', careNote: 'A volunteer will check.', urgent: true } });
  assert.equal(reviewed.status, 200);
  assert.equal((await reviewed.json()).report.status, 'processed');
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
  const sqlite = database(t, '0019');
  sqlite.exec(`CREATE TABLE IF NOT EXISTS report_reads (report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, PRIMARY KEY (report_id, user_id));
    INSERT INTO report_reads VALUES ('report-injury','local-admin');
    INSERT INTO report_entries VALUES ('migration-entry','report-injury','local-admin','Question','2026-01-01');
    INSERT INTO report_history VALUES ('migration-history','report-injury','local-admin','History','2026-01-01');
    INSERT INTO report_attachments VALUES ('migration-file','report-injury','migration-key','note.txt','text/plain',1);
    UPDATE tasks SET report_id = 'report-injury' WHERE id = (SELECT id FROM tasks LIMIT 1);
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
