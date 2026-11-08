import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import worker from '../../worker/index.ts';
import { createDemoSession } from '../../worker/services/session.ts';

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
  const env = { DB, CONFIG_ENCRYPTION_KEY: Buffer.alloc(32, 42).toString('base64'), LOCAL_TEST_SIGN_IN: 'true', AI_ANALYSIS_RATE_LIMITER: { async limit() { return { success: true }; } }, ASSETS: { fetch: () => new Response('App') } };
  async function request(path, { method = 'GET', body, cookie, origin = 'http://127.0.0.1:5197' } = {}) {
    return worker.fetch(new Request(`http://127.0.0.1:5197${path}`, {
      method,
      headers: { ...(method === 'POST' ? { Origin: origin, 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }), env);
  }
  async function signIn(userId) {
    const response = await request('/api/auth/local/sign-in', { method: 'POST', body: { userId } });
    assert.equal(response.status, 200);
    return response.headers.get('Set-Cookie').split(';')[0];
  }
  async function saveKey(cookie) {
    const response = await request('/api/configuration/ai', { method: 'POST', cookie, body: { openaiModel: '', apiKey: 'sk-fictional-test-key' } });
    assert.equal(response.status, 200);
  }
  return { sqlite, env, request, signIn, saveKey };
}

test('analysis sends report context and eligible related reports without creating records', async (t) => {
  const { sqlite, request, signIn, saveKey } = fixture(t);
  const admin = await signIn('local-admin');
  const member = await signIn('local-member');
  await saveKey(admin);
  const existingTask = await request('/api/tasks', { method: 'POST', cookie: admin, body: { title: 'Existing task', ownerId: 'local-admin', reportId: 'report-injury', due: '', associations: [] } });
  assert.equal(existingTask.status, 201);
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  let calls = 0;
  globalThis.fetch = async (url, init) => {
    calls += 1;
    assert.equal(url, 'https://api.openai.com/v1/responses');
    assert.equal(init.headers.Authorization, 'Bearer sk-fictional-test-key');
    const body = JSON.parse(init.body);
    assert.equal(body.model, 'gpt-4.1-mini');
    assert.equal(body.store, false);
    assert.equal(body.text.format.type, 'json_schema');
    const input = JSON.parse(body.input[0].content[0].text);
    assert.match(input.message, /limping/);
    assert.equal(input.colony, 'Riverside');
    assert.equal(input.cat, 'Pepper');
    assert.deepEqual(Object.keys(input).sort(), ['cat', 'colony', 'message', 'relatedReports', 'submittedAt', 'taskTitles', 'title']);
    assert.ok(input.relatedReports.every((item) => item.id !== 'report-injury' && !('reporter' in item)));
    return Response.json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify({ tasks: [{ title: 'existing task', reason: 'Already linked.' }, { title: 'Check the cat', reason: 'The report describes limping.' }], cats: [{ name: 'pepper', details: 'Known cat.', reason: 'Reported in the message.' }], colonies: [{ name: 'RIVERSIDE', details: 'Known colony.', reason: 'Reported in the message.' }], duplicates: [{ reportId: 'not-a-candidate', reason: 'Invalid ID.' }] }) }] }] });
  };
  const before = ['tasks', 'cats', 'colonies'].map((table) => sqlite.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count);
  const response = await request('/api/reports/report-injury/analyze', { method: 'POST', cookie: member });
  assert.equal(response.status, 200);
  const text = await response.text();
  assert.equal(text.includes('sk-fictional-test-key'), false);
  const suggestions = JSON.parse(text).suggestions;
  assert.equal(suggestions.tasks[0].title, 'Check the cat');
  assert.equal(suggestions.tasks.length, 1);
  assert.deepEqual(suggestions.cats, []);
  assert.deepEqual(suggestions.colonies, []);
  assert.deepEqual(suggestions.duplicates, []);
  assert.deepEqual(suggestions.skippedAttachments, []);
  assert.equal(calls, 1);
  assert.deepEqual(['tasks', 'cats', 'colonies'].map((table) => sqlite.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count), before);
});

test('analysis includes photos, documents, and transcripts and validates duplicate suggestions', async (t) => {
  const { sqlite, env, request, signIn, saveKey } = fixture(t);
  const admin = await signIn('local-admin');
  await saveKey(admin);
  const insert = sqlite.prepare('INSERT INTO report_attachments (id, report_id, storage_key, name, mime_type, size) VALUES (?, ?, ?, ?, ?, ?)');
  for (const [id, name, mime] of [['photo', 'cat.jpg', 'image/jpeg'], ['document', 'notes.pdf', 'application/pdf'], ['audio', 'voice.m4a', 'audio/mp4'], ['unsupported', 'cat.avif', 'image/avif'], ['missing', 'lost.txt', 'text/plain']]) insert.run(id, 'report-sighting', id, name, mime, 4);
  env.UPLOADS = { async get(key) { return key === 'missing' ? null : { async arrayBuffer() { return new Uint8Array([1, 2, 3, 4]).buffer; } }; } };
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  let transcriptionCalls = 0;
  globalThis.fetch = async (url, init) => {
    if (url.endsWith('/audio/transcriptions')) {
      transcriptionCalls++;
      assert.equal(init.body.get('model'), 'gpt-transcribe');
      assert.equal(init.body.get('file').name, 'voice.m4a');
      return Response.json({ text: 'The orange cat was at the entrance.' });
    }
    const body = JSON.parse(init.body);
    const content = body.input[0].content;
    const input = JSON.parse(content[0].text);
    assert.ok(input.relatedReports.some((item) => item.id === 'report-earlier-sighting'));
    assert.ok(content.some((part) => part.type === 'input_image' && part.image_url === 'data:image/jpeg;base64,AQIDBA=='));
    assert.ok(content.some((part) => part.type === 'input_file' && part.filename === 'notes.pdf' && part.file_data === 'data:application/pdf;base64,AQIDBA=='));
    assert.ok(content.some((part) => part.type === 'input_text' && part.text.includes('The orange cat was at the entrance.')));
    return Response.json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify({ tasks: [], cats: [], colonies: [], duplicates: [
      { reportId: 'report-earlier-sighting', reason: 'Same sighting.' },
      { reportId: 'report-earlier-sighting', reason: 'Repeated.' },
      { reportId: 'report-injury', reason: 'A different colony.' },
    ] }) }] }] });
  };
  const response = await request('/api/reports/report-sighting/analyze', { method: 'POST', cookie: admin });
  assert.equal(response.status, 200);
  const { suggestions } = await response.json();
  assert.deepEqual(suggestions.duplicates.map((item) => item.report.id), ['report-earlier-sighting']);
  assert.deepEqual(suggestions.skippedAttachments.map((item) => item.name), ['cat.avif', 'lost.txt']);
  assert.equal(transcriptionCalls, 1);
  assert.equal(sqlite.prepare('SELECT duplicate_of FROM reports WHERE id = ?').get('report-sighting').duplicate_of, null);
});

test('analysis keeps useful suggestions when provider text or counts exceed local limits', async (t) => {
  const { request, signIn, saveKey } = fixture(t);
  const admin = await signIn('local-admin');
  await saveKey(admin);
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async () => Response.json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify({
    tasks: [{ title: ' ', reason: 'Missing title.' }, ...Array.from({ length: 7 }, (_, index) => ({ title: `Task ${index} ${'x'.repeat(200)}`, reason: 'y'.repeat(700) }))],
    cats: [{ name: ' ', details: 'An unidentified cat.', reason: 'Seen by the shed.' }, { name: 'Skip', details: ' ', reason: 'No evidence.' }],
    colonies: [],
    duplicates: [{ reportId: 'report-earlier-sighting', reason: 'z'.repeat(700) }, { reportId: 'report-earlier-sighting', reason: 'Repeated.' }, { reportId: 'not-a-candidate', reason: 'Unknown ID.' }],
  }) }] }] });
  const response = await request('/api/reports/report-sighting/analyze', { method: 'POST', cookie: admin });
  assert.equal(response.status, 200);
  const { suggestions } = await response.json();
  assert.equal(suggestions.tasks.length, 5);
  assert.equal(suggestions.tasks[0].title.length, 160);
  assert.equal(suggestions.tasks[0].reason.length, 600);
  assert.deepEqual(suggestions.cats, [{ name: '', details: 'An unidentified cat.', reason: 'Seen by the shed.' }]);
  assert.equal(suggestions.duplicates.length, 1);
  assert.equal(suggestions.duplicates[0].report.id, 'report-earlier-sighting');
  assert.equal(suggestions.duplicates[0].reason.length, 600);
});

test('a failed audio transcription is reported without blocking the other analysis', async (t) => {
  const { sqlite, env, request, signIn, saveKey } = fixture(t);
  const admin = await signIn('local-admin');
  await saveKey(admin);
  sqlite.prepare('INSERT INTO report_attachments (id, report_id, storage_key, name, mime_type, size) VALUES (?, ?, ?, ?, ?, ?)').run('audio', 'report-injury', 'audio', 'voice.wav', 'audio/wav', 4);
  env.UPLOADS = { async get() { return { async arrayBuffer() { return new Uint8Array([1, 2, 3, 4]).buffer; } }; } };
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async (url) => url.endsWith('/audio/transcriptions')
    ? Response.json({ error: { message: 'provider details' } }, { status: 500 })
    : Response.json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify({ tasks: [], cats: [], colonies: [], duplicates: [] }) }] }] });
  const response = await request('/api/reports/report-injury/analyze', { method: 'POST', cookie: admin });
  assert.equal(response.status, 200);
  const text = await response.text();
  assert.equal(text.includes('provider details'), false);
  assert.deepEqual(JSON.parse(text).suggestions.skippedAttachments, [{ name: 'voice.wav', reason: 'The recording could not be transcribed.' }]);
});

test('duplicate search is indexed, paginated, and limited to valid targets', async (t) => {
  const { sqlite, request, signIn } = fixture(t);
  const member = await signIn('local-member');
  const insert = sqlite.prepare(`INSERT INTO reports (id, title, message, category, reporter_id, submitted_at, colony_id, duplicate_of) VALUES (?, ?, ?, 'Sighting', 'local-member', ?, ?, ?)`);
  for (let i = 0; i < 21; i++) insert.run(`search-${i}`, `Orange cat ${i}`, 'An orange cat near the shed.', `2026-10-${String(i + 1).padStart(2, '0')}T12:00:00Z`, 'canal', null);
  insert.run('other-colony', 'Orange cat', 'An orange cat near the shed.', '2026-11-07T12:00:00Z', 'riverside', null);
  insert.run('already-duplicate', 'Orange cat', 'An orange cat near the shed.', '2026-11-07T12:00:00Z', 'canal', 'report-earlier-sighting');
  const find = async (query, offset = 0) => {
    const response = await request(`/api/reports/report-sighting/duplicate-candidates?q=${encodeURIComponent(query)}&offset=${offset}`, { cookie: member });
    assert.equal(response.status, 200);
    return response.json();
  };
  const first = await find('orange shed');
  const second = await find('orange shed', 15);
  assert.equal(first.reports.length, 15);
  assert.equal(first.hasMore, true);
  assert.equal(second.reports.length, 6);
  assert.equal(second.hasMore, false);
  assert.equal(new Set([...first.reports, ...second.reports].map((item) => item.id)).size, 21);
  assert.deepEqual((await find('tipped ear')).reports.map((item) => item.id), ['report-earlier-sighting']);
  assert.ok((await find('" OR *')).reports.every((item) => item.id !== 'other-colony' && item.id !== 'already-duplicate'));
  sqlite.prepare('UPDATE reports SET message = ? WHERE id = ?').run('Distinctive striped kitten.', 'search-0');
  assert.deepEqual((await find('distinctive striped')).reports.map((item) => item.id), ['search-0']);
  assert.equal((await request('/api/reports/report-sighting/duplicate-candidates')).status, 401);
  assert.equal((await request('/api/reports/report-sighting/duplicate-candidates?offset=-1', { cookie: member })).status, 400);
  sqlite.prepare('UPDATE reports SET duplicate_of = ? WHERE id = ?').run('report-sighting', 'search-0');
  assert.deepEqual((await find('orange')).reports, []);
});

test('workspace exposes analysis availability without exposing the key', async (t) => {
  const { env, request, signIn, saveKey } = fixture(t);
  const admin = await signIn('local-admin');
  const member = await signIn('local-member');
  const availability = async () => {
    const response = await request('/api/workspace-data', { cookie: member });
    assert.equal(response.status, 200);
    const text = await response.text();
    assert.equal(text.includes('sk-fictional-test-key'), false);
    return JSON.parse(text).aiAnalysisEnabled;
  };
  assert.equal(await availability(), false);
  await saveKey(admin);
  assert.equal(await availability(), true);
  const limiter = env.AI_ANALYSIS_RATE_LIMITER;
  env.AI_ANALYSIS_RATE_LIMITER = undefined;
  assert.equal(await availability(), false);
  env.AI_ANALYSIS_RATE_LIMITER = limiter;
  env.CONFIG_ENCRYPTION_KEY = Buffer.alloc(32, 24).toString('base64');
  assert.equal(await availability(), false);
});

test('analysis enforces access, origin, configuration, and rate limits before calling OpenAI', async (t) => {
  const { env, request, signIn, saveKey } = fixture(t);
  const member = await signIn('local-member');
  const admin = await signIn('local-admin');
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async () => { throw new Error('Unexpected OpenAI request'); };
  const analyze = (options = {}) => request('/api/reports/report-injury/analyze', { method: 'POST', ...options });
  assert.equal((await analyze()).status, 401);
  assert.equal((await analyze({ cookie: member, origin: 'https://other.example' })).status, 403);
  assert.equal((await analyze({ cookie: member })).status, 503);
  await saveKey(admin);
  assert.equal((await request('/api/reports/missing/analyze', { method: 'POST', cookie: member })).status, 404);
  env.AI_ANALYSIS_RATE_LIMITER = { async limit() { return { success: false }; } };
  assert.equal((await analyze({ cookie: member })).status, 429);
  env.AI_ANALYSIS_RATE_LIMITER = undefined;
  assert.equal((await analyze({ cookie: member })).status, 503);
  env.AI_ANALYSIS_RATE_LIMITER = { async limit() { return { success: true }; } };
  env.CONFIG_ENCRYPTION_KEY = Buffer.alloc(32, 24).toString('base64');
  assert.equal((await analyze({ cookie: member })).status, 503);
});

test('analysis rejects malformed or unsuccessful provider responses without exposing provider data', async (t) => {
  const { request, signIn, saveKey } = fixture(t);
  const admin = await signIn('local-admin');
  await saveKey(admin);
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  const analyze = () => request('/api/reports/report-injury/analyze', { method: 'POST', cookie: admin });
  globalThis.fetch = async () => Response.json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: '{"tasks":[{"title":""}],"cats":[],"colonies":[]}' }] }] });
  assert.equal((await analyze()).status, 502);
  globalThis.fetch = async () => Response.json({ error: { message: 'private-provider-detail' } }, { status: 401 });
  const denied = await analyze();
  assert.equal(denied.status, 503);
  assert.equal((await denied.text()).includes('private-provider-detail'), false);
});

test('deployed demo sessions cannot spend the workspace OpenAI key', async (t) => {
  const { sqlite, env, signIn, saveKey } = fixture(t);
  await saveKey(await signIn('local-admin'));
  sqlite.exec(readFileSync(new URL('../../seeds/demo-accounts.sql', import.meta.url), 'utf8'));
  sqlite.exec("UPDATE demo_access SET enabled = 1 WHERE id = 1");
  const base = 'https://mews.example';
  const cookie = (await createDemoSession(new Request(base), env.DB, 'local-member')).split(';')[0];
  const workspace = await worker.fetch(new Request(`${base}/api/workspace-data`, { headers: { Cookie: cookie } }), env);
  assert.equal((await workspace.json()).aiAnalysisEnabled, false);
  const response = await worker.fetch(new Request(`${base}/api/reports/report-injury/analyze`, {
    method: 'POST', headers: { Origin: base, Cookie: cookie },
  }), env);
  assert.equal(response.status, 403);
  assert.match((await response.json()).error, /demo accounts/);
});
