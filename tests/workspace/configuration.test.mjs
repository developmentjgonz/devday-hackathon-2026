import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import worker from '../../worker/index.ts';
import { defaultReportChatPrompt } from '../../shared/report-chat-instructions.ts';

function fixture(t) {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON');
  for (const file of ['../../migrations/0001_accounts.sql', '../../migrations/0002_colonies_and_cats.sql', '../../migrations/0003_cat_profiles.sql', '../../migrations/0012_user_photos.sql', '../../migrations/0016_configuration.sql', '../../migrations/0018_demo_access.sql', '../../migrations/0019_session_auth_method.sql', '../../migrations/0026_communication_channels.sql', '../../migrations/0027_public_report_chat.sql', '../../migrations/0030_report_chat_prompt.sql', '../../seeds/local.sql']) {
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
      try { const results = []; for (const statement of statements) results.push(await statement.run()); sqlite.exec('COMMIT'); return results; }
      catch (error) { sqlite.exec('ROLLBACK'); throw error; }
    },
  };
  const env = { DB, CONFIG_ENCRYPTION_KEY: Buffer.alloc(32, 42).toString('base64'), LOCAL_TEST_SIGN_IN: 'true', ASSETS: { fetch: () => new Response('Public app') } };
  async function request(path, { method = 'GET', body, cookie, origin = 'http://127.0.0.1:5197', base = 'http://127.0.0.1:5197' } = {}) {
    return worker.fetch(new Request(`${base}${path}`, {
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
  return { sqlite, env, request, signIn };
}

test('configuration is restricted to active administrators and same-origin writes', async (t) => {
  const { request, signIn } = fixture(t);
  for (const [cookie, code] of [[undefined, 401], [await signIn('local-member'), 403], [await signIn('local-pending'), 403], [await signIn('local-suspended'), 403]]) {
    assert.equal((await request('/api/configuration', { cookie })).status, code);
    assert.equal((await request('/api/configuration/channels', { method: 'POST', cookie, body: { inboundPhone: '', inboundEmail: '' } })).status, code);
    assert.equal((await request('/api/configuration/ai-key/remove', { method: 'POST', cookie })).status, code);
  }
  const admin = await signIn('local-admin');
  const response = await request('/api/configuration', { cookie: admin });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  for (const path of ['/api/configuration/channels', '/api/configuration/ai', '/api/configuration/ai-key/remove']) {
    assert.equal((await request(path, { method: 'POST', cookie: admin, origin: 'https://other.example', body: {} })).status, 403);
  }
});

test('contact options are private until enabled and can be disabled without losing details', async (t) => {
  const { request, signIn } = fixture(t);
  const admin = await signIn('local-admin');
  const update = (body) => request('/api/configuration/channels', { method: 'POST', cookie: admin, body });
  const contact = async () => (await request('/api/public-reports/contact')).json();
  const details = { inboundPhone: '  +1 (305) 555-0123  ', inboundEmail: '  REPORTS@EXAMPLE.TEST ', reportChatEnabled: false };
  assert.deepEqual(await contact(), { phone: null, email: null, chatAvailable: false });
  assert.equal((await update({ ...details, phoneEnabled: false, emailEnabled: false })).status, 200);
  const config = await (await request('/api/configuration', { cookie: admin })).json();
  assert.equal(config.inboundPhone, '+1 (305) 555-0123');
  assert.equal(config.inboundEmail, 'reports@example.test');
  assert.equal(config.phoneEnabled, false);
  assert.equal(config.emailEnabled, false);
  assert.deepEqual(await contact(), { phone: null, email: null, chatAvailable: false });
  assert.equal((await update({ ...details, phoneEnabled: true, emailEnabled: false })).status, 200);
  assert.deepEqual(await contact(), { phone: '+1 (305) 555-0123', email: null, chatAvailable: false });
  assert.equal((await update({ ...details, phoneEnabled: false, emailEnabled: true })).status, 200);
  assert.deepEqual(await contact(), { phone: null, email: 'reports@example.test', chatAvailable: false });
  assert.equal((await update({ ...details, phoneEnabled: true, emailEnabled: true })).status, 200);
  assert.deepEqual(await contact(), { phone: '+1 (305) 555-0123', email: 'reports@example.test', chatAvailable: false });
  assert.equal((await update({ ...details, phoneEnabled: false, emailEnabled: false })).status, 200);
  assert.deepEqual(await contact(), { phone: null, email: null, chatAvailable: false });
  for (const body of [
    { inboundPhone: 'letters', inboundEmail: '', phoneEnabled: false, emailEnabled: false, reportChatEnabled: false },
    { inboundPhone: '', inboundEmail: 'invalid', phoneEnabled: false, emailEnabled: false, reportChatEnabled: false },
    { inboundPhone: '', inboundEmail: '', phoneEnabled: true, emailEnabled: false, reportChatEnabled: false },
    { inboundPhone: '', inboundEmail: '', phoneEnabled: false, emailEnabled: true, reportChatEnabled: false },
    { inboundPhone: '', inboundEmail: '', phoneEnabled: false, emailEnabled: false, reportChatEnabled: false, connected: true },
  ]) assert.equal((await update(body)).status, 400);
  assert.equal((await (await request('/api/configuration', { cookie: admin })).json()).inboundEmail, 'reports@example.test');
});

test('API keys are encrypted, never returned, replaceable, and removable', async (t) => {
  const { sqlite, env, request, signIn } = fixture(t);
  const admin = await signIn('local-admin');
  const secret = 'sk-fictional-example-key';
  const update = (body) => request('/api/configuration/ai', { method: 'POST', cookie: admin, body });
  const response = await update({ openaiModel: 'example-model', apiKey: secret });
  assert.equal(response.status, 200);
  const savedBody = await response.text();
  assert.equal(savedBody.includes(secret), false);
  assert.equal(JSON.parse(savedBody).openaiKeyStatus, 'saved');
  const stored = sqlite.prepare('SELECT openai_key_ciphertext AS ciphertext, openai_key_nonce AS nonce FROM configuration').get();
  assert.equal(stored.ciphertext.includes(secret), false);
  const key = await crypto.subtle.importKey('raw', Buffer.from(env.CONFIG_ENCRYPTION_KEY, 'base64'), 'AES-GCM', false, ['decrypt']);
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: Buffer.from(stored.nonce, 'base64') }, key, Buffer.from(stored.ciphertext, 'base64'));
  assert.equal(new TextDecoder().decode(plaintext), secret);
  assert.equal((await (await update({ openaiModel: 'another-model' })).json()).openaiKeyStatus, 'saved');
  assert.equal(sqlite.prepare('SELECT openai_key_ciphertext AS ciphertext FROM configuration').get().ciphertext, stored.ciphertext);
  assert.equal((await (await update({ openaiModel: 'another-model', apiKey: secret })).json()).openaiKeyStatus, 'saved');
  assert.notEqual(sqlite.prepare('SELECT openai_key_nonce AS nonce FROM configuration').get().nonce, stored.nonce);
  const readBody = await (await request('/api/configuration', { cookie: admin })).text();
  assert.equal(readBody.includes(secret), false);
  assert.equal((await (await request('/api/configuration/ai-key/remove', { method: 'POST', cookie: admin })).json()).openaiKeyStatus, 'not-set');
  assert.equal(sqlite.prepare('SELECT openai_key_ciphertext AS ciphertext FROM configuration').get().ciphertext, null);
});

test('administrators can save and restore report chat instructions without changing the API key', async (t) => {
  const { request, signIn, sqlite } = fixture(t);
  const admin = await signIn('local-admin');
  const update = (body, cookie = admin) => request('/api/configuration/ai', { method: 'POST', cookie, body });
  assert.equal((await (await request('/api/configuration', { cookie: admin })).json()).reportChatPrompt, defaultReportChatPrompt);
  const reportChatPrompt = 'Be kind. Thank the person for looking out for the cats. Ask one useful question at a time.\n'.repeat(30).trim();
  const response = await update({ openaiModel: '', reportChatPrompt });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).reportChatPrompt, reportChatPrompt);
  assert.equal(sqlite.prepare('SELECT report_chat_prompt AS prompt FROM configuration').get().prompt, reportChatPrompt);
  assert.equal((await update({ openaiModel: '', reportChatPrompt: 'Changed' }, await signIn('local-member'))).status, 403);
  assert.equal((await update({ openaiModel: '', reportChatPrompt: '' })).status, 400);
  assert.equal((await update({ openaiModel: '', reportChatPrompt: 'x'.repeat(6001) })).status, 400);
  assert.equal((await update({ openaiModel: '', reportChatPrompt: defaultReportChatPrompt })).status, 200);
  assert.equal((await (await request('/api/configuration', { cookie: admin })).json()).reportChatPrompt, defaultReportChatPrompt);
  assert.equal('reportChatPrompt' in await (await request('/api/public-reports/contact')).json(), false);
});

test('missing or changed encryption keys do not expose or silently replace saved credentials', async (t) => {
  const { sqlite, env, request, signIn } = fixture(t);
  const admin = await signIn('local-admin');
  const update = (body) => request('/api/configuration/ai', { method: 'POST', cookie: admin, body });
  await update({ openaiModel: 'model-one', apiKey: 'sk-fictional-example-key' });
  const originalKey = env.CONFIG_ENCRYPTION_KEY;
  env.CONFIG_ENCRYPTION_KEY = Buffer.alloc(32, 12).toString('base64');
  assert.equal((await (await request('/api/configuration', { cookie: admin })).json()).openaiKeyStatus, 'unavailable');
  env.CONFIG_ENCRYPTION_KEY = undefined;
  const current = await (await request('/api/configuration', { cookie: admin })).json();
  assert.equal(current.secureKeyStorageAvailable, false);
  assert.equal(current.openaiKeyStatus, 'unavailable');
  assert.equal((await update({ openaiModel: 'model-two', apiKey: 'replacement-key' })).status, 503);
  assert.equal(sqlite.prepare('SELECT openai_model AS model FROM configuration').get().model, 'model-one');
  env.CONFIG_ENCRYPTION_KEY = originalKey;
  assert.equal((await (await request('/api/configuration', { cookie: admin })).json()).openaiKeyStatus, 'saved');
});

test('API keys cannot be saved over insecure non-local connections', async (t) => {
  const { request, signIn } = fixture(t);
  const admin = await signIn('local-admin');
  const response = await request('/api/configuration/ai', {
    method: 'POST', cookie: admin, base: 'http://mews.example', origin: 'http://mews.example',
    body: { openaiModel: 'example-model', apiKey: 'sk-fictional-example-key' },
  });
  assert.equal(response.status, 400);
});
